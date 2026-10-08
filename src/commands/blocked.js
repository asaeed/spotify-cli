import { readFile } from 'node:fs/promises';
import { ok } from '../envelope.js';

// Account-data export only: the public Web API has no blocked-artist endpoint.
export function blockedArtists(value) {
  if (!value || !Array.isArray(value.bannedArtists)) throw new Error('bad_input:Expected YourLibrary.json with a bannedArtists array; a missing field does not mean no artists are blocked.');
  const artists = new Map();
  for (const entry of value.bannedArtists) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('bad_input:Unsupported bannedArtists entry; provide the original Spotify YourLibrary.json export.');
    const uri = typeof entry.uri === 'string' ? entry.uri : null;
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    if (uri && !/^spotify:artist:[A-Za-z0-9]{22}$/.test(uri)) throw new Error('bad_input:Invalid artist URI in bannedArtists; provide the original Spotify YourLibrary.json export.');
    if (!uri && !name) throw new Error('bad_input:A bannedArtists entry has neither an artist name nor URI.');
    const artist = { id: uri ? uri.split(':')[2] : null, uri, name };
    artists.set(uri || name, artist);
  }
  return [...artists.values()];
}

export async function cmdBlocked({ file } = {}) {
  if (typeof file !== 'string' || !file.trim()) throw new Error('bad_input:Live blocked-artist reads are unavailable in the public API. Download your Spotify Account data, then run: spotify blocked --file /path/to/YourLibrary.json');
  let value;
  try { value = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error('bad_input:Invalid JSON; provide the original Spotify YourLibrary.json export.');
    throw new Error('bad_input:Could not read the file; run: spotify blocked --file /path/to/YourLibrary.json');
  }
  const artists = blockedArtists(value);
  ok({ source: 'spotify:account-export', live: false, count: artists.length, artists });
}
