import { createInterface } from 'node:readline/promises';
import { ok, fail } from '../envelope.js';
import { loadConfig, saveConfig, loadTokens } from '../storage.js';
import { loginFlow, logout, refreshTokens } from '../auth.js';

export async function cmdSetup() {
  const existing = (await loadConfig()) ?? {};
  process.stderr.write(`
Spotify CLI setup
=================
1. Go to https://developer.spotify.com/dashboard and create a new app.
2. Set Redirect URI to EXACTLY:  http://127.0.0.1:8787/callback
3. Enable "Web API" under "Which API/SDKs are you planning to use?"
4. Copy the Client ID below.

(Client Secret is NOT needed — we use PKCE.)

`);
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const client_id = (await rl.question(`Client ID [${existing.client_id ?? ''}]: `)).trim() || existing.client_id;
  rl.close();
  if (!client_id) return fail('bad_input', 'Client ID required.');
  await saveConfig({ ...existing, client_id });
  ok({ saved: true, client_id_prefix: client_id.slice(0, 8) + '...' });
}

export async function cmdLogin() {
  try {
    const { expires_at, scope } = await loginFlow();
    ok({ authenticated: true, expires_at, expires_at_iso: new Date(expires_at).toISOString(), scope });
  } catch (e) {
    if (e.message === 'no_client_id') {
      return fail('bad_input', 'No Client ID configured.', 'Run: spotify setup');
    }
    fail('generic_failure', e.message);
  }
}

export async function cmdLogout() {
  await logout();
  ok({ logged_out: true });
}

export async function cmdStatus() {
  const cfg = await loadConfig();
  const tokens = await loadTokens();
  if (!cfg?.client_id) return ok({ authenticated: false, configured: false, hint: 'Run: spotify setup' });
  if (!tokens?.access_token) return ok({ authenticated: false, configured: true, hint: 'Run: spotify login' });
  const valid = Date.now() < tokens.expires_at;
  ok({
    authenticated: true,
    configured: true,
    expires_at: tokens.expires_at,
    expires_at_iso: new Date(tokens.expires_at).toISOString(),
    access_token_valid: valid,
    scope: tokens.scope,
  });
}

export async function cmdRefresh() {
  try {
    const t = await refreshTokens();
    ok({ refreshed: true, expires_at: t.expires_at, expires_at_iso: new Date(t.expires_at).toISOString() });
  } catch (e) {
    fail('not_authenticated', e.message, 'Run: spotify login');
  }
}
