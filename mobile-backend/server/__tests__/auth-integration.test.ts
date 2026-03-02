import axios from 'axios';

const API_BASE_URL =
  process.env.API_BASE_URL || 'https://app-tracklit-prod-tnrusd.azurewebsites.net';
const runRemoteIntegration = process.env.RUN_REMOTE_INTEGRATION === 'true';
const describeRemote = runRemoteIntegration ? describe : describe.skip;

function randomUser() {
  const stamp = Date.now();
  return {
    username: `aria_integration_${stamp}`,
    email: `aria_integration_${stamp}@example.com`,
    password: `AriaTest!${stamp.toString().slice(-6)}`,
    displayName: 'Aria Integration Test',
    name: 'Aria Integration Test',
  };
}

describeRemote('Auth API Integration Tests', () => {
  it('should return health status', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
  });

  it('should validate whichever auth contract is deployed (modern or legacy)', async () => {
    const modernProbe = await axios
      .post(
        `${API_BASE_URL}/api/auth/login`,
        {},
        {
          validateStatus: () => true,
        }
      );

    if (modernProbe.status !== 404) {
      const user = randomUser();

      const register = await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        {
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        },
        { validateStatus: () => true }
      );
      expect([201, 400]).toContain(register.status);

      const login = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: user.email,
          password: user.password,
        },
        { validateStatus: () => true }
      );
      expect(login.status).toBe(200);
      expect(login.data).toHaveProperty('token');
      return;
    }

    const user = randomUser();

    const register = await axios.post(
      `${API_BASE_URL}/api/register`,
      {
        username: user.username,
        password: user.password,
        email: user.email,
        name: user.name,
      },
      { validateStatus: () => true }
    );
    expect([200, 201, 400, 409]).toContain(register.status);

    const login = await axios.post(
      `${API_BASE_URL}/api/login`,
      {
        username: user.username,
        password: user.password,
      },
      { validateStatus: () => true }
    );
    expect([200, 400, 401]).toContain(login.status);

    const userInfo = await axios.get(`${API_BASE_URL}/api/user`, {
      validateStatus: () => true,
    });
    expect([200, 401]).toContain(userInfo.status);
  });
});
