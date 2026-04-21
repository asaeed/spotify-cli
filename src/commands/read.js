import { ok } from '../envelope.js';
import { get, paginate } from '../api.js';

const trackBrief = (t) => t && ({
  id: t.id,
  uri: t.uri,
  name: t.name,
  artists: (t.artists ?? []).map(a => a.name),
  album: t.album?.name,
  duration_ms: t.duration_ms,
  popularity: t.popularity,
  explicit: t.explicit,
});

const artistBrief = (a) => ({
  id: a.id,
  uri: a.uri,
  name: a.name,
  genres: a.genres,
  popularity: a.popularity,
  followers: a.followers?.total,
});

const playlistBrief = (p) => ({
  id: p.id,
  uri: p.uri,
  name: p.name,
  description: p.description,
  owner: p.owner?.display_name,
  owner_id: p.owner?.id,
  public: p.public,
  collaborative: p.collaborative,
  tracks_total: p.tracks?.total,
  snapshot_id: p.snapshot_id,
});

export async function cmdMe() {
  const me = await get('/me');
  ok({
    id: me.id,
    display_name: me.display_name,
    email: me.email,
    country: me.country,
    product: me.product,
    followers: me.followers?.total,
  });
}

export async function cmdPlaylists({ limit }) {
  const max = Number(limit ?? 200);
  const items = await paginate('/me/playlists', { query: { limit: 50 } }, max);
  ok({ count: items.length, playlists: items.map(playlistBrief) });
}

export async function cmdPlaylist(id, { limit }) {
  if (!id) throw new Error('bad_input:playlist id required');
  const meta = await get(`/playlists/${id}`);
  const max = Number(limit ?? 500);
  const items = await paginate(`/playlists/${id}/items`, { query: { limit: 50 } }, max);
  ok({
    ...playlistBrief(meta),
    tracks: items.map(it => ({
      added_at: it.added_at,
      added_by: it.added_by?.id,
      ...trackBrief(it.item ?? it.track),
    })),
    fetched: items.length,
  });
}

export async function cmdSaved({ limit }) {
  const max = Number(limit ?? 200);
  const items = await paginate('/me/tracks', { query: { limit: 50 } }, max);
  ok({
    count: items.length,
    tracks: items.map(it => ({ added_at: it.added_at, ...trackBrief(it.track) })),
  });
}

export async function cmdTop(kind, { time_range, limit }) {
  if (!['tracks', 'artists'].includes(kind)) throw new Error('bad_input:top kind must be tracks|artists');
  const tr = time_range ?? 'medium_term';
  const lim = Number(limit ?? 20);
  const data = await get(`/me/top/${kind}`, { query: { time_range: tr, limit: lim } });
  const items = (data.items ?? []).map(kind === 'tracks' ? trackBrief : artistBrief);
  ok({ kind, time_range: tr, count: items.length, items });
}

export async function cmdRecent({ limit }) {
  const lim = Number(limit ?? 50);
  const data = await get('/me/player/recently-played', { query: { limit: lim } });
  ok({
    count: data.items?.length ?? 0,
    items: (data.items ?? []).map(it => ({
      played_at: it.played_at,
      context: it.context?.type,
      ...trackBrief(it.item ?? it.track),
    })),
  });
}

export async function cmdSearch(query, { type, limit }) {
  if (!query) throw new Error('bad_input:query required');
  const t = type ?? 'track';
  const lim = Math.min(Number(limit ?? 10), 10);
  const data = await get('/search', { query: { q: query, type: t, limit: lim } });
  const out = {};
  if (data.tracks) out.tracks = (data.tracks.items ?? []).map(trackBrief);
  if (data.artists) out.artists = (data.artists.items ?? []).map(artistBrief);
  if (data.albums) out.albums = (data.albums.items ?? []).map(a => ({
    id: a.id, uri: a.uri, name: a.name,
    artists: (a.artists ?? []).map(x => x.name),
    release_date: a.release_date, total_tracks: a.total_tracks,
  }));
  if (data.playlists) out.playlists = (data.playlists.items ?? []).map(playlistBrief);
  ok({ query, type: t, ...out });
}

export async function cmdNowPlaying() {
  const data = await get('/me/player/currently-playing');
  if (!data) return ok({ playing: false });
  ok({
    playing: data.is_playing,
    progress_ms: data.progress_ms,
    device: data.device?.name,
    shuffle: data.shuffle_state,
    repeat: data.repeat_state,
    context_uri: data.context?.uri,
    ...trackBrief(data.item),
  });
}

export async function cmdDevices() {
  const data = await get('/me/player/devices');
  ok({
    devices: (data.devices ?? []).map(d => ({
      id: d.id, name: d.name, type: d.type,
      is_active: d.is_active, is_private_session: d.is_private_session,
      volume_percent: d.volume_percent,
    })),
  });
}

export async function cmdPlayerState() {
  const data = await get('/me/player');
  if (!data) return ok({ active: false });
  ok({
    active: true,
    playing: data.is_playing,
    progress_ms: data.progress_ms,
    device: { id: data.device?.id, name: data.device?.name, type: data.device?.type, volume_percent: data.device?.volume_percent },
    shuffle: data.shuffle_state,
    repeat: data.repeat_state,
    context_uri: data.context?.uri,
    track: trackBrief(data.item),
  });
}
