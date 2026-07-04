#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const presetEnvKeys = new Set(Object.keys(process.env));

loadEnvFile(path.join(projectRoot, '.env'), presetEnvKeys);
loadEnvFile(path.join(projectRoot, '.env.local'), presetEnvKeys);

const PRODUCT_SLUG = 'psicoplanilhas-flow';
const FLOW_PURPOSE = 'flow_activation';
const DEFAULT_EXPECTED_FLOW_ORIGIN = 'https://flow.psicoplanilha.com';
const PLACEHOLDER_ACCESS_URL = 'https://example.com/psicoplanilhas-flow-placeholder';

const state = {
  token: null,
  validateEndpoint: null,
  expectedFlowOrigin: null,
  consumed: false,
};

main()
  .then(() => {
    ok('PsicoPlanilhas Flow handoff smoke test passed.');
  })
  .catch(async (error) => {
    await cleanupToken();
    fail(error);
  });

async function main() {
  const config = readConfig();
  state.validateEndpoint = new URL('/api/flow/validate-token', config.psico2BaseUrl).toString();
  state.expectedFlowOrigin = config.expectedFlowOrigin;

  log(`Target Psico2 app: ${config.psico2BaseUrl}`);
  log(`Expected Flow origin: ${config.expectedFlowOrigin}`);

  const admin = createAdminClient(config);
  const product = await readFlowProduct(admin);
  const productUrl = assertProductAccessUrl(product, config.expectedFlowOrigin);
  ok(`products.access_url is active and points to ${productUrl.origin}.`);

  if (!config.skipAccessUrlFetch) {
    await assertAccessUrlReachable(productUrl);
    ok('Configured Flow access URL is reachable.');
  } else {
    log('Skipping access_url reachability check by request.');
  }

  const { cookieHeader, userEmail } = await createAuthenticatedCookieHeader(config);
  ok(`Signed in as smoke user ${maskEmail(userEmail)}.`);

  const generated = await generateFlowToken(config.psico2BaseUrl, cookieHeader);
  const { activationUrl, token } = assertActivationUrl(generated.activationUrl, productUrl.origin);
  state.token = token;
  ok(`Generated activation URL matches configured Flow origin (${activationUrl.origin}).`);

  await assertActivationTokenRecord(admin, token, userEmail, { used: false });
  ok('Generated token was stored as an unused hashed flow_activation token.');

  await assertValidatePreflight(state.validateEndpoint, config.expectedFlowOrigin);
  ok('Flow validation preflight exposes the expected restricted CORS headers.');

  const validation = await validateToken(state.validateEndpoint, config.expectedFlowOrigin, token);
  state.consumed = true;
  assert(validation.valid === true, 'Expected generated token to validate successfully.');
  assert(
    typeof validation.email === 'string' &&
      validation.email.toLowerCase() === userEmail.toLowerCase(),
    'Validated token did not return the signed-in smoke user email.'
  );
  ok(`Generated token validated for ${maskEmail(validation.email)}.`);

  await assertActivationTokenRecord(admin, token, userEmail, { used: true });
  ok('Validated token was marked used server-side.');

  const replay = await validateToken(state.validateEndpoint, config.expectedFlowOrigin, token);
  assert(replay.valid === false, 'Expected replay of a consumed Flow token to be rejected.');
  ok('Consumed token cannot be reused.');

  const invalid = await validateToken(state.validateEndpoint, config.expectedFlowOrigin, 'not-a-flow-token');
  assert(invalid.valid === false, 'Expected malformed Flow token to be rejected.');
  ok('Malformed token is rejected without leaking details.');
}

function readConfig() {
  const psico2BaseUrl = normalizeBaseUrl(env('PSICO2_BASE_URL', 'http://localhost:3000'));
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const smokeEmail = env('PSICO2_SMOKE_EMAIL');
  const smokePassword = env('PSICO2_SMOKE_PASSWORD');
  const expectedFlowOrigin = normalizeOrigin(
    env('PSICO2_FLOW_EXPECTED_ORIGIN', DEFAULT_EXPECTED_FLOW_ORIGIN),
    'PSICO2_FLOW_EXPECTED_ORIGIN'
  );
  const skipAccessUrlFetch = env('PSICO2_FLOW_SKIP_ACCESS_URL_FETCH', '') === '1';

  return {
    psico2BaseUrl,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    smokeEmail,
    smokePassword,
    expectedFlowOrigin,
    skipAccessUrlFetch,
  };
}

function createAdminClient(config) {
  return createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function readFlowProduct(admin) {
  const { data, error } = await admin
    .from('products')
    .select('slug,is_active,access_url,price,billing_type')
    .eq('slug', PRODUCT_SLUG)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read products.${PRODUCT_SLUG}: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Product ${PRODUCT_SLUG} was not found.`);
  }
  return data;
}

function assertProductAccessUrl(product, expectedFlowOrigin) {
  assert(product.is_active === true, `Product ${PRODUCT_SLUG} is not active.`);
  assert(product.access_url, `Product ${PRODUCT_SLUG} has no access_url configured.`);
  assert(
    product.access_url !== PLACEHOLDER_ACCESS_URL,
    `Product ${PRODUCT_SLUG} still uses the placeholder access_url.`
  );

  let productUrl;
  try {
    productUrl = new URL(product.access_url);
  } catch {
    throw new Error(`Product ${PRODUCT_SLUG} access_url is not a valid URL.`);
  }

  assert(
    productUrl.protocol === 'https:' || productUrl.protocol === 'http:',
    `Product ${PRODUCT_SLUG} access_url must use http or https.`
  );
  assert(
    productUrl.origin === expectedFlowOrigin,
    `Product ${PRODUCT_SLUG} access_url origin is ${productUrl.origin}, expected ${expectedFlowOrigin}.`
  );

  return productUrl;
}

async function assertAccessUrlReachable(productUrl) {
  const head = await fetchWithTimeout(productUrl.toString(), {
    method: 'HEAD',
    redirect: 'follow',
  });

  if (head.status === 405 || head.status === 403) {
    const get = await fetchWithTimeout(productUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
    });
    assert(
      get.status >= 200 && get.status < 400,
      `Flow access_url GET returned HTTP ${get.status}.`
    );
    return;
  }

  assert(
    head.status >= 200 && head.status < 400,
    `Flow access_url HEAD returned HTTP ${head.status}.`
  );
}

async function createAuthenticatedCookieHeader(config) {
  const cookieJar = new Map();
  const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          if (!value || options?.maxAge === 0) {
            cookieJar.delete(name);
          } else {
            cookieJar.set(name, value);
          }
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.smokeEmail,
    password: config.smokePassword,
  });

  if (error) {
    throw new Error(`Could not sign in smoke user: ${error.message}`);
  }
  if (!data.user?.email) {
    throw new Error('Smoke user sign-in did not return an email.');
  }
  if (cookieJar.size === 0) {
    throw new Error('Smoke user sign-in did not produce Supabase SSR cookies.');
  }

  return {
    cookieHeader: [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
    userEmail: data.user.email,
  };
}

async function generateFlowToken(psico2BaseUrl, cookieHeader) {
  const endpoint = new URL('/api/flow/generate-token', psico2BaseUrl).toString();
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader,
    },
  });
  const body = await readJson(response);

  if (!response.ok) {
    const message = body?.message ? `: ${body.message}` : '';
    throw new Error(`Flow token generation failed with HTTP ${response.status}${message}`);
  }
  if (!body || typeof body.activationUrl !== 'string') {
    throw new Error('Flow token generation did not return activationUrl.');
  }

  return body;
}

function assertActivationUrl(rawActivationUrl, expectedOrigin) {
  let activationUrl;
  try {
    activationUrl = new URL(rawActivationUrl);
  } catch {
    throw new Error('Generated activationUrl is not a valid URL.');
  }

  assert(
    activationUrl.origin === expectedOrigin,
    `Generated activationUrl origin is ${activationUrl.origin}, expected ${expectedOrigin}.`
  );
  assert(
    activationUrl.pathname === '/',
    `Generated activationUrl should target the Flow root path, got ${activationUrl.pathname}.`
  );
  assert(
    activationUrl.search === '',
    'Generated activationUrl should not include a query string.'
  );

  const tokenMatch = activationUrl.hash.match(/^#activate=([a-f0-9]{64})$/);
  assert(
    tokenMatch,
    'Generated activationUrl hash must be exactly #activate=<64 lowercase hex token>.'
  );

  return { activationUrl, token: tokenMatch[1] };
}

async function assertActivationTokenRecord(admin, token, userEmail, { used }) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await admin
    .from('activation_tokens')
    .select('email,purpose,expires_at,used_at')
    .eq('token_hash', tokenHash)
    .eq('purpose', FLOW_PURPOSE)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read generated activation token: ${error.message}`);
  }
  if (!data) {
    throw new Error('Generated Flow token was not found by its sha256 hash.');
  }

  assert(data.purpose === FLOW_PURPOSE, `Generated token purpose is not ${FLOW_PURPOSE}.`);
  assert(
    data.email.toLowerCase() === userEmail.toLowerCase(),
    'Generated token email does not match the smoke user.'
  );

  const expiresAt = Date.parse(data.expires_at);
  assert(Number.isFinite(expiresAt), 'Generated token expires_at is not a valid timestamp.');
  assert(expiresAt > Date.now(), 'Generated token is already expired.');

  if (used) {
    assert(data.used_at, 'Generated token was not marked used after validation.');
  } else {
    assert(data.used_at === null, 'Generated token was marked used before validation.');
  }
}

async function assertValidatePreflight(endpoint, expectedFlowOrigin) {
  const response = await fetchWithTimeout(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: expectedFlowOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });

  assert(response.status === 204, `Flow validate-token preflight returned HTTP ${response.status}.`);
  assertCorsHeaders(response, expectedFlowOrigin);

  const methods = response.headers.get('access-control-allow-methods') || '';
  const requestHeaders = response.headers.get('access-control-allow-headers') || '';
  assert(methods.includes('POST') && methods.includes('OPTIONS'), 'Preflight CORS methods are incomplete.');
  assert(requestHeaders.toLowerCase().includes('content-type'), 'Preflight CORS headers are incomplete.');
}

async function validateToken(endpoint, expectedFlowOrigin, token) {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      Origin: expectedFlowOrigin,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const body = await readJson(response);

  assert(response.status === 200, `Flow validate-token returned HTTP ${response.status}.`);
  assertCorsHeaders(response, expectedFlowOrigin);
  assert(body && typeof body.valid === 'boolean', 'Flow validate-token did not return { valid: boolean }.');

  return body;
}

function assertCorsHeaders(response, expectedFlowOrigin) {
  assert(
    response.headers.get('access-control-allow-origin') === expectedFlowOrigin,
    'Flow validate-token CORS origin does not match the expected Flow origin.'
  );
  assert(
    (response.headers.get('vary') || '').toLowerCase().includes('origin'),
    'Flow validate-token response should include Vary: Origin.'
  );
}

async function cleanupToken() {
  if (!state.token || !state.validateEndpoint || !state.expectedFlowOrigin || state.consumed) {
    return;
  }

  try {
    await validateToken(state.validateEndpoint, state.expectedFlowOrigin, state.token);
    state.consumed = true;
    log('Cleanup consumed the generated token after a failed smoke run.');
  } catch {
    log('Cleanup could not consume the generated token; it will expire on the server schedule.');
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out: ${redactTokenFromUrl(url)}`);
    }
    throw new Error(`Request failed for ${redactTokenFromUrl(url)}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response from ${response.url}, got non-JSON body.`);
  }
}

function loadEnvFile(filePath, lockedKeys) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (lockedKeys.has(key)) {
      continue;
    }

    process.env[key] = unquoteEnvValue(rawValue.trim());
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

function normalizeOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL origin.`);
  }
  return url.origin;
}

function redactTokenFromUrl(value) {
  return String(value).replace(/#activate=[a-f0-9]{64}/, '#activate=<redacted>');
}

function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!domain) {
    return '<invalid-email>';
  }
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  console.log(`[flow-smoke] ${message}`);
}

function ok(message) {
  console.log(`[flow-smoke] OK: ${message}`);
}

function fail(error) {
  console.error(`[flow-smoke] FAILED: ${error.message}`);
  process.exitCode = 1;
}
