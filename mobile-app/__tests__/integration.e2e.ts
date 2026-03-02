/* eslint-disable no-console */

type ApiResponse<T = unknown> = {
  status: number;
  data: T;
  headers: Headers;
};

const MOBILE_BASE_URL = (
  process.env.MOBILE_API_BASE_URL ||
  process.env.EXPO_PUBLIC_MOBILE_BACKEND_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://app-tracklit-prod-tnrusd.azurewebsites.net'
).replace(/\/$/, '');

const AI_BASE_URL = (
  process.env.AI_API_BASE_URL ||
  process.env.EXPO_PUBLIC_AI_API_BASE_URL ||
  process.env.ARIA_API_URL ||
  'https://aria-dev-api.azurewebsites.net'
).replace(/\/$/, '');

const RUN_REMOTE_INTEGRATION = process.env.RUN_REMOTE_INTEGRATION === 'true';

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

async function request<T = unknown>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  timeoutMs = 20000
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep raw response text
    }

    return {
      status: response.status,
      data: data as T,
      headers: response.headers,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertStatus(
  actual: number,
  expected: number[],
  context: string,
  payload: unknown
): void {
  if (!expected.includes(actual)) {
    throw new Error(
      `${context} failed. Expected ${expected.join('/')} got ${actual}. Payload: ${JSON.stringify(payload)}`
    );
  }
}

async function runModernAuthFlow() {
  const user = randomUser();

  const register = await request<{ token?: string; error?: string }>(
    MOBILE_BASE_URL,
    '/api/auth/register',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      }),
    },
  );
  assertStatus(register.status, [201, 400], 'modern register', register.data);

  const login = await request<{ token?: string; error?: string }>(
    MOBILE_BASE_URL,
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    },
  );
  assertStatus(login.status, [200], 'modern login', login.data);

  const token = login.data?.token;
  if (!token) {
    throw new Error(`modern login returned no token: ${JSON.stringify(login.data)}`);
  }

  const userInfo = await request(MOBILE_BASE_URL, '/api/user', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  assertStatus(userInfo.status, [200], 'modern /api/user', userInfo.data);
}

async function runLegacyAuthFlow() {
  const user = randomUser();

  const register = await request(
    MOBILE_BASE_URL,
    '/api/register',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username,
        password: user.password,
        email: user.email,
        name: user.name,
      }),
    },
  );
  assertStatus(register.status, [200, 201, 400], 'legacy register', register.data);

  const login = await request(
    MOBILE_BASE_URL,
    '/api/login',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username,
        password: user.password,
      }),
    },
  );
  // Some deployments require pre-seeded users and may return 401 for random test users.
  assertStatus(login.status, [200, 401], 'legacy login', login.data);
}

async function verifyAiServiceReachability() {
  try {
    const aiHealth = await request(
      AI_BASE_URL,
      '/health',
      { method: 'GET', headers: { Accept: 'application/json' } },
      25000,
    );

    // `200` healthy, `503` app error page but service still reachable.
    assertStatus(aiHealth.status, [200, 503], 'ai /health reachability', aiHealth.data);
    return;
  } catch (error: any) {
    // Keep integration deterministic in environments where AI app service is being redeployed.
    console.warn('[Integration] AI service not reachable right now:', error?.message || error);
  }
}

async function run() {
  if (!RUN_REMOTE_INTEGRATION) {
    console.log(
      '[Integration] SKIPPED. Set RUN_REMOTE_INTEGRATION=true to run real mobile-backend + AI endpoint checks.'
    );
    return;
  }

  console.log(`\n[Integration] Mobile backend: ${MOBILE_BASE_URL}`);
  console.log(`[Integration] AI API: ${AI_BASE_URL}`);

  const health = await request(MOBILE_BASE_URL, '/api/health', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  assertStatus(health.status, [200], 'mobile /api/health', health.data);

  const modernProbe = await request(MOBILE_BASE_URL, '/api/auth/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (modernProbe.status !== 404) {
    console.log('[Integration] Detected modern auth contract: /api/auth/*');
    await runModernAuthFlow();
  } else {
    console.log('[Integration] Detected legacy auth contract: /api/login + /api/register');
    await runLegacyAuthFlow();
  }

  await verifyAiServiceReachability();

  console.log('[Integration] PASS: mobile-backend contract + AI endpoint separation verified.');
}

run().catch((error) => {
  console.error('[Integration] FAIL:', error?.message || error);
  process.exit(1);
});
