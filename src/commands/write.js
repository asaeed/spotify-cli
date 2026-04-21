import { ok } from '../envelope.js';
import { get, post, put, del } from '../api.js';

function toUri(idOrUri, kind) {
  if (!idOrUri) return null;
  if (idOrUri.startsWith('spotify:')) return idOrUri;
  return `spotify:${kind}:${idOrUri}`;
}

export async function cmdPlay({ device_id, uri, context_uri, uris }) {
  const body = {};
  if (context_uri) body.context_uri = context_uri;
  if (uri) body.uris = [uri];
  if (uris) body.uris = uris.split(',').map(s => s.trim()).filter(Boolean);
  const query = device_id ? { device_id } : undefined;
  await put('/me/player/play', { query, body: Object.keys(body).length ? body : undefined });
  ok({ playing: true });
}

export async function cmdPause({ device_id }) {
  await put('/me/player/pause', { query: device_id ? { device_id } : undefined });
  ok({ paused: true });
}

export async function cmdNext({ device_id }) {
  await post('/me/player/next', { query: device_id ? { device_id } : undefined });
  ok({ skipped: 'next' });
}

export async function cmdPrev({ device_id }) {
  await post('/me/player/previous', { query: device_id ? { device_id } : undefined });
  ok({ skipped: 'previous' });
}

export async function cmdQueue(uri, { device_id }) {
  if (!uri) throw new Error('bad_input:uri required');
  const fullUri = uri.startsWith('spotify:') ? uri : toUri(uri, 'track');
  await post('/me/player/queue', { query: { uri: fullUri, ...(device_id ? { device_id } : {}) } });
  ok({ queued: fullUri });
}

export async function cmdVolume(percent, { device_id }) {
  const v = Number(percent);
  if (!(v >= 0 && v <= 100)) throw new Error('bad_input:volume must be 0-100');
  await put('/me/player/volume', { query: { volume_percent: v, ...(device_id ? { device_id } : {}) } });
  ok({ volume_percent: v });
}

export async function cmdShuffle(state, { device_id }) {
  const s = state === 'true' || state === 'on' || state === '1';
  await put('/me/player/shuffle', { query: { state: s, ...(device_id ? { device_id } : {}) } });
  ok({ shuffle: s });
}

export async function cmdRepeat(mode, { device_id }) {
  if (!['track', 'context', 'off'].includes(mode)) throw new Error('bad_input:repeat must be track|context|off');
  await put('/me/player/repeat', { query: { state: mode, ...(device_id ? { device_id } : {}) } });
  ok({ repeat: mode });
}

export async function cmdTransfer(device_id, { play }) {
  if (!device_id) throw new Error('bad_input:device_id required');
  await put('/me/player', { body: { device_ids: [device_id], play: play === 'true' } });
  ok({ transferred_to: device_id, play: play === 'true' });
}

export async function cmdSave(uris) {
  if (!uris || !uris.length) throw new Error('bad_input:uris required');
  const full = uris.map(u => u.startsWith('spotify:') ? u : toUri(u, 'track'));
  await put('/me/library', { query: { uris: full.join(',') } });
  ok({ saved: full });
}

export async function cmdUnsave(uris) {
  if (!uris || !uris.length) throw new Error('bad_input:uris required');
  const full = uris.map(u => u.startsWith('spotify:') ? u : toUri(u, 'track'));
  await del('/me/library', { query: { uris: full.join(',') } });
  ok({ unsaved: full });
}

export async function cmdPlaylistCreate(name, { description, public: isPublic, collaborative }) {
  if (!name) throw new Error('bad_input:name required');
  const playlist = await post('/me/playlists', {
    body: {
      name,
      description: description ?? '',
      public: isPublic === 'true' || isPublic === true,
      collaborative: collaborative === 'true' || collaborative === true,
    },
  });
  ok({ id: playlist.id, uri: playlist.uri, name: playlist.name, owner: playlist.owner?.display_name });
}

export async function cmdPlaylistAdd(playlistId, uris, { position }) {
  if (!playlistId) throw new Error('bad_input:playlist_id required');
  if (!uris || !uris.length) throw new Error('bad_input:uris required');
  const full = uris.map(u => u.startsWith('spotify:') ? u : toUri(u, 'track'));
  const body = { uris: full };
  if (position !== undefined) body.position = Number(position);
  const res = await post(`/playlists/${playlistId}/items`, { body });
  ok({ added: full, snapshot_id: res?.snapshot_id });
}

export async function cmdPlaylistRemove(playlistId, uris) {
  if (!playlistId) throw new Error('bad_input:playlist_id required');
  if (!uris || !uris.length) throw new Error('bad_input:uris required');
  const full = uris.map(u => u.startsWith('spotify:') ? u : toUri(u, 'track'));
  const res = await del(`/playlists/${playlistId}/items`, { body: { items: full.map(uri => ({ uri })) } });
  ok({ removed: full, snapshot_id: res?.snapshot_id });
}

export async function cmdPlaylistEdit(playlistId, { name, description, public: isPublic, collaborative }) {
  if (!playlistId) throw new Error('bad_input:playlist_id required');
  const body = {};
  if (name !== undefined) body.name = name;
  if (description !== undefined) body.description = description;
  if (isPublic !== undefined) body.public = isPublic === 'true' || isPublic === true;
  if (collaborative !== undefined) body.collaborative = collaborative === 'true' || collaborative === true;
  if (!Object.keys(body).length) throw new Error('bad_input:nothing to update');
  await put(`/playlists/${playlistId}`, { body });
  ok({ updated: playlistId, fields: Object.keys(body) });
}

export async function cmdFollow(artistIds) {
  if (!artistIds || !artistIds.length) throw new Error('bad_input:artist_ids required');
  const ids = artistIds.map(x => x.startsWith('spotify:artist:') ? x.split(':').pop() : x);
  await put('/me/following', { query: { type: 'artist', ids: ids.join(',') } });
  ok({ followed: ids });
}

export async function cmdUnfollow(artistIds) {
  if (!artistIds || !artistIds.length) throw new Error('bad_input:artist_ids required');
  const ids = artistIds.map(x => x.startsWith('spotify:artist:') ? x.split(':').pop() : x);
  await del('/me/following', { query: { type: 'artist', ids: ids.join(',') } });
  ok({ unfollowed: ids });
}
