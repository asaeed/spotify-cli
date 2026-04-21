import { SPOTIFY_API } from './config.js';
import { getAccessToken, refreshTokens } from './auth.js';

async function requestOnce(method, path, { query, body, token } = {}) {
  const url = new URL(path.startsWith('http') ? path : `${SPOTIFY_API}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = { Authorization: `Bearer ${token}` };
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });
  return res;
}

export async function api(method, path, opts = {}) {
  let token = await getAccessToken();
  let res = await requestOnce(method, path, { ...opts, token });

  if (res.status === 401) {
    const refreshed = await refreshTokens();
    token = refreshed.access_token;
    res = await requestOnce(method, path, { ...opts, token });
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? '1');
    const err = new Error(`rate_limited:${retryAfter}`);
    err.code = 'rate_limited';
    err.retryAfter = retryAfter;
    throw err;
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = new Error(`api_error:${res.status}`);
    err.code = 'api_error';
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export const get = (path, opts) => api('GET', path, opts);
export const post = (path, opts) => api('POST', path, opts);
export const put = (path, opts) => api('PUT', path, opts);
export const del = (path, opts) => api('DELETE', path, opts);

export async function paginate(path, opts = {}, max = Infinity) {
  const items = [];
  let next = path;
  let params = opts.query ?? {};
  while (next && items.length < max) {
    const page = await get(next, { query: params });
    if (!page) break;
    const batch = page.items ?? [];
    items.push(...batch);
    next = page.next ?? null;
    params = undefined;
    if (!next || !batch.length) break;
  }
  return items.slice(0, max);
}
