import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { exec } from 'node:child_process';
import { SPOTIFY_ACCOUNTS, LOOPBACK_PORT, REDIRECT_URI, SCOPES } from './config.js';
import { loadConfig, loadTokens, saveTokens, clearTokens } from './storage.js';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pkcePair() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? `open "${url}"` :
              process.platform === 'win32' ? `start "" "${url}"` :
              `xdg-open "${url}"`;
  exec(cmd);
}

export async function loginFlow() {
  const cfg = await loadConfig();
  if (!cfg?.client_id) {
    throw new Error('no_client_id');
  }

  const { verifier, challenge } = pkcePair();
  const state = base64url(randomBytes(16));

  const authUrl = new URL(`${SPOTIFY_ACCOUNTS}/authorize`);
  authUrl.searchParams.set('client_id', cfg.client_id);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', SCOPES);

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${LOOPBACK_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404); res.end(); return;
      }
      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (err) {
        res.end(`<html><body><h2>Spotify auth error: ${err}</h2><p>You can close this window.</p></body></html>`);
        server.close();
        reject(new Error(`auth_error:${err}`));
        return;
      }
      if (returnedState !== state) {
        res.end('<html><body><h2>State mismatch</h2></body></html>');
        server.close();
        reject(new Error('state_mismatch'));
        return;
      }
      res.end('<html><body><h2>Spotify auth complete.</h2><p>You can close this window and return to your terminal.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.on('error', reject);
    server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
      process.stderr.write(`Opening browser for Spotify login...\nIf it doesn't open, visit:\n${authUrl.toString()}\n\n`);
      openBrowser(authUrl.toString());
    });

    setTimeout(() => {
      server.close();
      reject(new Error('timeout'));
    }, 5 * 60 * 1000);
  });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: cfg.client_id,
    code_verifier: verifier,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token_exchange_failed:${res.status}:${text}`);
  }

  const tok = await res.json();
  const expires_at = Date.now() + tok.expires_in * 1000;
  await saveTokens({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at,
    scope: tok.scope,
    token_type: tok.token_type,
  });
  return { expires_at, scope: tok.scope };
}

export async function refreshTokens() {
  const cfg = await loadConfig();
  const tokens = await loadTokens();
  if (!cfg?.client_id) throw new Error('no_client_id');
  if (!tokens?.refresh_token) throw new Error('no_refresh_token');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: cfg.client_id,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`refresh_failed:${res.status}:${text}`);
  }

  const tok = await res.json();
  const expires_at = Date.now() + tok.expires_in * 1000;
  const next = {
    ...tokens,
    access_token: tok.access_token,
    expires_at,
    scope: tok.scope ?? tokens.scope,
    token_type: tok.token_type ?? tokens.token_type,
  };
  if (tok.refresh_token) next.refresh_token = tok.refresh_token;
  await saveTokens(next);
  return next;
}

export async function getAccessToken() {
  let tokens = await loadTokens();
  if (!tokens?.access_token) throw new Error('not_authenticated');
  if (Date.now() > tokens.expires_at - 60_000) {
    tokens = await refreshTokens();
  }
  return tokens.access_token;
}

export async function logout() {
  await clearTokens();
}
