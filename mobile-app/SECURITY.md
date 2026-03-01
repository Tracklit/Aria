# Security Guidelines

Security best practices and guidelines for Aria development and deployment.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Data Protection](#data-protection)
3. [API Security](#api-security)
4. [Mobile App Security](#mobile-app-security)
5. [Backend Security](#backend-security)
6. [Third-Party Services](#third-party-services)
7. [Security Checklist](#security-checklist)
8. [Incident Response](#incident-response)

---

## Authentication & Authorization

### JWT Token Management

#### Storage

**✅ DO:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store token securely
await AsyncStorage.setItem('aria_auth_token', token);

// For sensitive data, use SecureStore (Expo)
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);
```

**❌ DON'T:**
```typescript
// Don't store in localStorage (web)
localStorage.setItem('token', token); // Vulnerable to XSS

// Don't log tokens
console.log('Token:', token); // Sensitive data in logs

// Don't hardcode tokens
const TOKEN = 'eyJhbGc...'; // Never hardcode credentials
```

#### Token Expiration

```typescript
import jwt_decode from 'jwt-decode';

function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwt_decode(token);
    const now = Date.now() / 1000;
    return decoded.exp < now;
  } catch {
    return true;
  }
}

// Check before API calls
const token = await getToken();
if (!token || isTokenExpired(token)) {
  // Refresh token or re-authenticate
  await refreshAuth();
}
```

#### Token Refresh

```typescript
// Implement token refresh logic
async function refreshToken(): Promise<string> {
  const refreshToken = await getRefreshToken();

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const { token } = await response.json();
  await setToken(token);

  return token;
}
```

---

### Password Security

**✅ DO:**
- Require minimum 8 characters
- Require mix of uppercase, lowercase, numbers, symbols
- Use bcrypt or similar for hashing (backend)
- Implement rate limiting on login attempts
- Support password reset via email

**❌ DON'T:**
- Store passwords in plain text
- Log passwords
- Send passwords via email
- Use weak hashing algorithms (MD5, SHA1)

```typescript
// Password validation
function isPasswordStrong(password: string): boolean {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSymbol
  );
}
```

---

### OAuth Security

```typescript
// Apple Sign In (secure)
import * as AppleAuthentication from 'expo-apple-authentication';

async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Send credential to backend for verification
    const response = await fetch(`${API_URL}/auth/apple`, {
      method: 'POST',
      body: JSON.stringify({
        identityToken: credential.identityToken,
        user: credential.user,
      }),
    });

    const { token } = await response.json();
    await setToken(token);
  } catch (error) {
    console.error('Apple Sign In failed:', error);
  }
}
```

**Security Notes:**
- Always verify OAuth tokens on backend
- Don't trust client-side authentication alone
- Use state parameter to prevent CSRF attacks
- Validate redirect URIs

---

## Data Protection

### Sensitive Data

**✅ DO:**
```typescript
// Encrypt sensitive data before storage
import * as Crypto from 'expo-crypto';

async function encryptData(data: string, key: string): Promise<string> {
  const encrypted = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + key
  );
  return encrypted;
}

// Redact sensitive data from logs
function sanitizeLogs(data: any): any {
  const sensitive = ['password', 'token', 'apiKey', 'ssn', 'creditCard'];

  const sanitized = { ...data };
  sensitive.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

console.log('User data:', sanitizeLogs(userData));
```

**❌ DON'T:**
```typescript
// Don't log sensitive data
console.log('Password:', password); // NEVER

// Don't store sensitive data in plain text
AsyncStorage.setItem('creditCard', cardNumber); // BAD

// Don't expose sensitive data in error messages
throw new Error(`Login failed for ${email}`); // Exposes email
```

---

### Personal Information

**GDPR/Privacy Compliance:**

```typescript
// Request user consent
async function requestDataCollectionConsent(): Promise<boolean> {
  // Show consent dialog
  const consent = await showConsentDialog({
    title: 'Privacy & Data Collection',
    message: 'We collect your workout data to provide personalized insights...',
    options: ['Accept', 'Decline'],
  });

  // Store consent
  await AsyncStorage.setItem('data_consent', consent.toString());

  return consent;
}

// Allow users to export data
async function exportUserData(userId: number): Promise<Blob> {
  const data = await fetchAllUserData(userId);

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}

// Allow users to delete data
async function deleteUserData(userId: number): Promise<void> {
  await apiRequest(`/api/user/${userId}`, { method: 'DELETE' });

  // Clear local data
  await clearAuthStorage();
  await AsyncStorage.clear();
}
```

---

## API Security

### Input Validation

**✅ DO:**
```typescript
// Validate all inputs
function validateWorkoutInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.type || typeof data.type !== 'string') {
    errors.push('Invalid workout type');
  }

  if (data.duration && (data.duration < 0 || data.duration > 86400)) {
    errors.push('Invalid duration (must be 0-86400 seconds)');
  }

  if (data.distance && (data.distance < 0 || data.distance > 422000)) {
    errors.push('Invalid distance (must be 0-422km)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Use validation before API call
const validation = validateWorkoutInput(workoutData);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

---

### SQL Injection Prevention

**Backend:**
```typescript
// ✅ DO: Use parameterized queries
const workouts = await db
  .select()
  .from(workoutsTable)
  .where(eq(workoutsTable.userId, userId)); // Drizzle ORM handles sanitization

// ❌ DON'T: Build SQL strings manually
const query = `SELECT * FROM workouts WHERE userId = ${userId}`; // VULNERABLE
```

---

### XSS Prevention

**✅ DO:**
```typescript
// Escape user input before rendering
import { Text } from 'react-native';

function CommentComponent({ comment }: { comment: string }) {
  // React Native Text automatically escapes content
  return <Text>{comment}</Text>;
}

// Sanitize HTML if using web views
import DOMPurify from 'dompurify';

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html);
}
```

**❌ DON'T:**
```typescript
// Don't use dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // VULNERABLE
```

---

### CSRF Protection

**Backend:**
```typescript
// Use CSRF tokens for state-changing requests
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.post('/api/workouts', csrfProtection, async (req, res) => {
  // Request validated with CSRF token
});
```

**Frontend:**
```typescript
// Include CSRF token in requests
const csrfToken = await getCsrfToken();

await fetch(`${API_URL}/api/workouts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(workoutData),
});
```

---

## Mobile App Security

### Code Obfuscation

```javascript
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      compress: {
        drop_console: true, // Remove console.log in production
      },
      mangle: {
        keep_fnames: false, // Obfuscate function names
      },
    },
  },
};
```

---

### Certificate Pinning

```typescript
// Pin SSL certificates for API calls
import { fetch as fetchWithPinning } from 'react-native-ssl-pinning';

const response = await fetchWithPinning(API_URL, {
  method: 'GET',
  sslPinning: {
    certs: ['cert1', 'cert2'],
  },
});
```

---

### Jailbreak/Root Detection

```typescript
import JailMonkey from 'jail-monkey';

if (JailMonkey.isJailBroken()) {
  // Warn user or disable sensitive features
  Alert.alert(
    'Security Warning',
    'This device appears to be jailbroken. Some features may be disabled for security.'
  );
}
```

---

### Secure Storage

```typescript
// Use Expo SecureStore for sensitive data
import * as SecureStore from 'expo-secure-store';

async function storeSecurely(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function getSecurely(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}
```

---

## Backend Security

### Environment Variables

**✅ DO:**
```bash
# .env (not committed to git)
DATABASE_URL=postgresql://user:password@host:5432/db
OPENAI_API_KEY=sk-...
JWT_SECRET=randomly-generated-secret-at-least-32-characters

# Use .env.example template (committed)
DATABASE_URL=postgresql://user:password@host:5432/db
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-here
```

**❌ DON'T:**
```typescript
// Don't hardcode secrets
const API_KEY = 'sk-proj-abc123'; // NEVER

// Don't commit .env to git
// Add to .gitignore:
.env
.env.local
.env.production
```

---

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
});

// Stricter limit for authentication
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per 5 minutes
  message: 'Too many login attempts, please try again later.',
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

---

### CORS Configuration

```typescript
import cors from 'cors';

// Production CORS config
app.use(
  cors({
    origin: ['https://aria.app', 'https://app.aria.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

---

### HTTP Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet()); // Adds multiple security headers

// Or configure individually:
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

---

## Third-Party Services

### OpenAI API

**✅ DO:**
```typescript
// Validate and sanitize inputs
function sanitizePrompt(prompt: string): string {
  // Remove potentially harmful content
  return prompt
    .replace(/<script>/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 4000); // Limit length
}

// Rate limit AI requests
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
});

// Log AI usage for auditing
async function logAIRequest(userId: number, prompt: string, response: string) {
  await db.insert(aiLogsTable).values({
    userId,
    prompt,
    response,
    timestamp: new Date(),
  });
}
```

---

### Azure Blob Storage

**✅ DO:**
```typescript
// Generate short-lived SAS tokens
import { BlobServiceClient } from '@azure/storage-blob';

async function generateUploadUrl(userId: number): Promise<string> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
  );

  const containerClient = blobServiceClient.getContainerClient('profile-images');
  const blobName = `user-${userId}-${Date.now()}.jpg`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Generate SAS URL that expires in 15 minutes
  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: 'w',
    expiresOn: new Date(Date.now() + 15 * 60 * 1000),
  });

  return sasUrl;
}

// Validate file types
function isValidImageType(contentType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  return allowedTypes.includes(contentType.toLowerCase());
}

// Limit file sizes
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large (max 5MB)');
}
```

---

## Security Checklist

### Development

- [ ] No hardcoded credentials
- [ ] Secrets in environment variables
- [ ] .env files not committed to git
- [ ] Input validation on all user inputs
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't expose sensitive data
- [ ] Third-party dependencies up to date
- [ ] Security linting enabled (ESLint security rules)

### Authentication

- [ ] JWT tokens properly secured
- [ ] Token expiration implemented
- [ ] Token refresh mechanism in place
- [ ] Password strength requirements enforced
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after failed attempts
- [ ] OAuth properly implemented (if used)

### API

- [ ] HTTPS/TLS enabled
- [ ] CORS properly configured
- [ ] Rate limiting in place
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] API versioning implemented

### Mobile App

- [ ] Secure storage for tokens
- [ ] Code obfuscation enabled (production)
- [ ] Certificate pinning (if applicable)
- [ ] Jailbreak detection (if needed)
- [ ] No sensitive data in logs
- [ ] Proper permissions requested
- [ ] App Transport Security configured (iOS)

### Backend

- [ ] Environment variables secured
- [ ] Database credentials secured
- [ ] API keys secured
- [ ] Security headers configured
- [ ] Rate limiting in place
- [ ] Error logging configured
- [ ] Monitoring and alerting set up

### Data Protection

- [ ] Personal data encrypted at rest
- [ ] Personal data encrypted in transit
- [ ] Data retention policy defined
- [ ] User data export capability
- [ ] User data deletion capability
- [ ] Privacy policy published
- [ ] GDPR compliance (if applicable)

---

## Incident Response

### Security Incident Plan

1. **Detect**: Monitor for security events
   - Failed login attempts spike
   - Unusual API usage patterns
   - Error rate increase
   - Reported vulnerabilities

2. **Contain**: Limit damage
   - Revoke compromised tokens
   - Block malicious IPs
   - Disable affected features
   - Isolate affected systems

3. **Investigate**: Determine scope
   - Review logs
   - Identify affected users
   - Determine data exposure
   - Find vulnerability source

4. **Remediate**: Fix the issue
   - Patch vulnerability
   - Update dependencies
   - Improve security measures
   - Deploy fix

5. **Notify**: Communicate appropriately
   - Notify affected users
   - Report to authorities (if required)
   - Update status page
   - Post-mortem analysis

---

### Contact Information

**Security Issues**: security@aria.app
**Bug Bounty**: Not yet implemented
**Responsible Disclosure**: 90-day disclosure policy

---

### Security Resources

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Native Security](https://reactnative.dev/docs/security)
- [Expo Security](https://docs.expo.dev/guides/security/)

---

**Remember**: Security is an ongoing process, not a one-time task. Regularly review and update security measures.

**Last Updated**: February 3, 2026
