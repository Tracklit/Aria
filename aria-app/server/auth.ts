import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from './storage';
import { User, InsertUser } from '../shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'aria-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '20m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const SALT_ROUNDS = 12;

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

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  // Find user with this refresh token
  // Note: In production, you'd want to hash the refresh token too
  const users = await storage.getUser(0); // This is a placeholder - we need to add a method to find by refresh token

  // For now, we'll need to iterate or add a new storage method
  // This is a simplified implementation
  throw new Error('Refresh token functionality requires additional storage method');
}

export async function appleSignIn(input: AppleSignInInput): Promise<AuthResult> {
  // Verify the Apple identity token (in production, verify with Apple's servers)
  // For now, we'll trust the token and extract the user info

  // The identityToken is a JWT from Apple
  // In production, verify signature using Apple's public keys

  let appleUserId: string;
  let email: string | undefined;

  try {
    // Decode the JWT (without verification for dev - ADD VERIFICATION IN PRODUCTION)
    const decoded = jwt.decode(input.identityToken) as any;
    if (!decoded || !decoded.sub) {
      throw new Error('Invalid Apple identity token');
    }
    appleUserId = decoded.sub;
    email = decoded.email || input.user?.email;
  } catch {
    throw new Error('Failed to decode Apple identity token');
  }

  if (!email) {
    throw new Error('Email is required for Apple Sign In');
  }

  // Check if user exists by Apple ID
  let user = await storage.getUserByAppleId(appleUserId);

  if (!user) {
    // Check if email is already registered
    user = await storage.getUserByEmail(email);

    if (user) {
      // Link Apple ID to existing account
      await storage.updateUser(user.id, {
        appleId: appleUserId,
        authProvider: 'apple',
      });
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
      const displayName = input.user?.name
        ? `${input.user.name.firstName || ''} ${input.user.name.lastName || ''}`.trim()
        : email.split('@')[0];

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
