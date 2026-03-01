import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'https://app-aria-mobile-prod.azurewebsites.net';

describe('Auth API Integration Tests', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
  };

  let authToken: string;
  let userId: number;

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, testUser);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('email', testUser.email);
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');

      authToken = response.data.token;
      userId = response.data.user.id;

      console.log('✓ Registration successful');
      console.log(`  User ID: ${userId}`);
      console.log(`  Email: ${testUser.email}`);
    });

    it('should fail to register with invalid email', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          email: 'invalid-email',
          password: 'TestPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        console.log('✓ Invalid email rejected correctly');
      }
    });

    it('should fail to register with short password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          email: 'test@example.com',
          password: 'short',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        console.log('✓ Short password rejected correctly');
      }
    });

    it('should fail to register with duplicate email', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, testUser);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toContain('already registered');
        console.log('✓ Duplicate email rejected correctly');
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('email', testUser.email);
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');

      console.log('✓ Login successful');
      console.log(`  Token: ${response.data.token.substring(0, 20)}...`);
    });

    it('should fail to login with incorrect password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: testUser.email,
          password: 'WrongPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
        console.log('✓ Incorrect password rejected correctly');
      }
    });

    it('should fail to login with non-existent email', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
        console.log('✓ Non-existent email rejected correctly');
      }
    });

    it('should fail to login with missing email', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          password: 'TestPassword123!',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        console.log('✓ Missing email rejected correctly');
      }
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      console.log('✓ Logout successful');
    });

    it('should fail to logout without token', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/logout`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        console.log('✓ Logout without token rejected correctly');
      }
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('timestamp');
      console.log('✓ Health check passed');
      console.log(`  Status: ${response.data.status}`);
      console.log(`  Timestamp: ${response.data.timestamp}`);
    });
  });
});
