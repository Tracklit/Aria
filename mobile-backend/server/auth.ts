import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import appleSigninAuth from 'apple-signin-auth';
import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage';
import { User, InsertUser } from '../shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'aria-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '20m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const SALT_ROUNDS = 12;
const DEFAULT_APPLE_AUDIENCE = 'com.aria.coaching';

const googleOAuthClient = new OAuth2Client();

function parseCsvEnv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getAppleAudiences(): string[] {
  const configured = parseCsvEnv(process.env.APPLE_SIGN_IN_AUDIENCES);
  if (configured.length > 0) {
    return configured;
  }

  const fallback = [
    process.env.APPLE_APP_BUNDLE_ID,
    process.env.APPLE_BUNDLE_ID,
    DEFAULT_APPLE_AUDIENCE,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  return Array.from(new Set(fallback));
}

function getGoogleAudiences(): string[] {
  const configured = parseCsvEnv(process.env.GOOGLE_OAUTH_CLIENT_IDS);
  const fallback = [
    process.env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
    process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  return Array.from(new Set([...configured, ...fallback]));
}

export interface JWTPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: number;
}

// Rate limiting store (in production, use Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ==================== PASSWORD UTILITIES ====================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==================== TOKEN UTILITIES ====================

export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry;
}

// ==================== RATE LIMITING ====================

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = new Date();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    return { allowed: true };
  }

  const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();

  // Reset if lockout duration has passed
  if (timeSinceLastAttempt > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  // Check if locked out
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((LOCKOUT_DURATION_MS - timeSinceLastAttempt) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

function recordLoginAttempt(identifier: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
  attempts.count += 1;
  attempts.lastAttempt = new Date();
  loginAttempts.set(identifier, attempts);
}

// ==================== AUTH MIDDLEWARE ====================

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = user;
  req.userId = user.id;
  next();
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (payload) {
      storage.getUser(payload.userId).then((user) => {
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
        next();
      });
      return;
    }
  }

  next();
}

// ==================== AUTH OPERATIONS ====================

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AppleSignInInput {
  identityToken: string;
  authorizationCode: string;
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface GoogleSignInInput {
  idToken: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, displayName } = input;

  // Check if user exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Validate password
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  const user = await storage.createUser({
    email,
    passwordHash,
    authProvider: 'email',
    refreshToken,
    refreshTokenExpiresAt: refreshTokenExpiry,
  });

  // Create profile
  await storage.createUserProfile({
    userId: user.id,
    displayName: displayName || email.split('@')[0],
  });

  // Create default preferences
  await storage.createUserPreferences({
    userId: user.id,
  });

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 20 * 60, // 20 minutes in seconds
  };
}

export async function login(input: LoginInput, clientIp: string): Promise<AuthResult> {
  const { email, password } = input;

  // Check rate limit
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    throw new Error(`Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds`);
  }

  const user = await storage.getUserByEmail(email);
  if (!user || !user.passwordHash) {
    recordLoginAttempt(clientIp, false);
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    recordLoginAttempt(clientIp, false);
    throw new Error('Invalid email or password');
  }

  recordLoginAttempt(clientIp, true);

  // Generate new tokens
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await storage.updateUserRefreshToken(user.id, refreshToken, refreshTokenExpiry);
  await storage.updateUser(user.id, { lastLoginAt: new Date() });

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 20 * 60,
  };
}

export async function refreshAccessToken(oldRefreshToken: string): Promise<AuthResult> {
  const user = await storage.getUserByRefreshToken(oldRefreshToken);
  if (!user) {
    throw new Error('Invalid refresh token');
  }

  // Verify refresh token hasn't expired
  if (!user.refreshTokenExpiresAt || new Date(user.refreshTokenExpiresAt) <= new Date()) {
    throw new Error('Refresh token expired');
  }

  // Rotate refresh token for security
  const newRefreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();
  await storage.updateUserRefreshToken(user.id, newRefreshToken, refreshTokenExpiry);

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 20 * 60,
  };
}

export async function appleSignIn(input: AppleSignInInput): Promise<AuthResult> {
  const appleAudiences = getAppleAudiences();

  let verifiedClaims: { sub?: string; email?: string };
  try {
    verifiedClaims = await appleSigninAuth.verifyIdToken(input.identityToken, {
      audience: appleAudiences.length === 1 ? appleAudiences[0] : appleAudiences,
      ignoreExpiration: false,
    }) as { sub?: string; email?: string };
  } catch (error) {
    console.error('Apple identity token verification failed:', error);
    throw new Error('Invalid Apple identity token');
  }

  const appleUserId = verifiedClaims.sub;
  if (!appleUserId) {
    throw new Error('Invalid Apple identity token');
  }

  // Check if user exists by Apple ID
  let user = await storage.getUserByAppleId(appleUserId);

  if (!user) {
    const email = verifiedClaims.email || input.user?.email;
    if (!email) {
      throw new Error('Email is required the first time you sign in with Apple');
    }

    // Check if email is already registered
    user = await storage.getUserByEmail(email);

    if (user) {
      // Link Apple ID to existing account
      user = await storage.updateUser(user.id, {
        appleId: appleUserId,
        authProvider: 'apple',
      }) || user;
    } else {
      // Create new user
      const refreshToken = generateRefreshToken();
      const refreshTokenExpiry = getRefreshTokenExpiry();

      user = await storage.createUser({
        email,
        appleId: appleUserId,
        authProvider: 'apple',
        refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiry,
      });

      // Create profile
      const inputDisplayName = input.user?.name
        ? `${input.user.name.firstName || ''} ${input.user.name.lastName || ''}`.trim()
        : '';
      const displayName = inputDisplayName || email.split('@')[0];

      await storage.createUserProfile({
        userId: user.id,
        displayName,
      });

      // Create default preferences
      await storage.createUserPreferences({
        userId: user.id,
      });
    }
  }

  // Generate new tokens
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await storage.updateUserRefreshToken(user.id, refreshToken, refreshTokenExpiry);
  await storage.updateUser(user.id, { lastLoginAt: new Date() });

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 20 * 60,
  };
}

export async function googleSignIn(input: GoogleSignInInput): Promise<AuthResult> {
  const googleAudiences = getGoogleAudiences();
  if (googleAudiences.length === 0) {
    throw new Error('Google Sign In is not configured on server');
  }

  let payload: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
  } | undefined;

  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: input.idToken,
      audience: googleAudiences,
    });
    payload = ticket.getPayload() as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
    } | undefined;
  } catch (error) {
    console.error('Google identity token verification failed:', error);
    throw new Error('Invalid Google identity token');
  }

  const googleUserId = payload?.sub;
  if (!googleUserId) {
    throw new Error('Invalid Google identity token');
  }

  // Check if user exists by Google ID
  let user = await storage.getUserByGoogleId(googleUserId);

  if (!user) {
    const email = payload?.email;
    if (!email) {
      throw new Error('Email is required for Google Sign In');
    }
    if (payload?.email_verified === false) {
      throw new Error('Google account email is not verified');
    }

    // Check if email is already registered
    user = await storage.getUserByEmail(email);

    if (user) {
      // Link Google ID to existing account
      user = await storage.updateUser(user.id, {
        googleId: googleUserId,
        authProvider: 'google',
      }) || user;
    } else {
      // Create new user
      const refreshToken = generateRefreshToken();
      const refreshTokenExpiry = getRefreshTokenExpiry();

      user = await storage.createUser({
        email,
        googleId: googleUserId,
        authProvider: 'google',
        refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiry,
      });

      // Create profile
      const displayName =
        payload?.name ||
        `${payload?.given_name || ''} ${payload?.family_name || ''}`.trim() ||
        email.split('@')[0];

      await storage.createUserProfile({
        userId: user.id,
        displayName,
      });

      // Create default preferences
      await storage.createUserPreferences({
        userId: user.id,
      });
    }
  }

  // Generate new tokens
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await storage.updateUserRefreshToken(user.id, refreshToken, refreshTokenExpiry);
  await storage.updateUser(user.id, { lastLoginAt: new Date() });

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 20 * 60,
  };
}

export async function logout(userId: number): Promise<void> {
  await storage.updateUserRefreshToken(userId, null, null);
}
