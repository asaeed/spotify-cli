import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = process.env.SPOTIFY_CLI_DIR || join(homedir(), '.config', 'spotify-cli');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const TOKENS_PATH = join(CONFIG_DIR, 'tokens.json');

export const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
export const SPOTIFY_API = 'https://api.spotify.com/v1';

export const LOOPBACK_PORT = 8787;
export const REDIRECT_URI = `http://127.0.0.1:${LOOPBACK_PORT}/callback`;

export const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
  'user-top-read',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'user-follow-read',
  'user-follow-modify',
].join(' ');
