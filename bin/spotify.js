#!/usr/bin/env node
import { fail } from '../src/envelope.js';
import * as auth from '../src/commands/auth.js';
import * as read from '../src/commands/read.js';
import * as write from '../src/commands/write.js';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

const USAGE = `spotify <command> [args] [--flags]

Auth:
  setup                         Configure Spotify app client_id
  login                         OAuth flow (opens browser)
  logout                        Clear local tokens
  status                        Show auth status
  refresh                       Force token refresh

Read:
  me                            Current user profile
  playlists [--limit N]         List my playlists
  playlist <id> [--limit N]     Show playlist + tracks
  saved [--limit N]             Saved tracks
  top <tracks|artists> [--time_range short_term|medium_term|long_term] [--limit N]
  recent [--limit N]            Recently played
  search <query> [--type track|artist|album|playlist] [--limit N(max 10)]
  now                           Currently playing
  player                        Full player state
  devices                       Available devices

Write — playback:
  play [--uri URI] [--uris u1,u2] [--context_uri URI] [--device_id ID]
  pause [--device_id ID]
  next [--device_id ID]
  prev [--device_id ID]
  queue <uri|id> [--device_id ID]
  volume <0-100> [--device_id ID]
  shuffle <on|off> [--device_id ID]
  repeat <track|context|off> [--device_id ID]
  transfer <device_id> [--play true|false]

Write — library:
  save <uri|id> [<uri|id> ...]
  unsave <uri|id> [<uri|id> ...]
  follow <artist_id> [<artist_id> ...]
  unfollow <artist_id> [<artist_id> ...]

Write — playlists:
  playlist-create <name> [--description D] [--public true|false] [--collaborative true|false]
  playlist-add <playlist_id> <uri|id> [<uri|id> ...] [--position N]
  playlist-remove <playlist_id> <uri|id> [<uri|id> ...]
  playlist-edit <playlist_id> [--name N] [--description D] [--public true|false] [--collaborative true|false]

All commands emit JSON: {status, data, error}.
`;

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const { positional, flags } = parseArgs(rest);

  try {
    switch (cmd) {
      case 'setup': return auth.cmdSetup();
      case 'login': return auth.cmdLogin();
      case 'logout': return auth.cmdLogout();
      case 'status': return auth.cmdStatus();
      case 'refresh': return auth.cmdRefresh();

      case 'me': return read.cmdMe();
      case 'playlists': return read.cmdPlaylists(flags);
      case 'playlist': return read.cmdPlaylist(positional[0], flags);
      case 'saved': return read.cmdSaved(flags);
      case 'top': return read.cmdTop(positional[0], flags);
      case 'recent': return read.cmdRecent(flags);
      case 'search': return read.cmdSearch(positional[0], flags);
      case 'now': return read.cmdNowPlaying();
      case 'player': return read.cmdPlayerState();
      case 'devices': return read.cmdDevices();

      case 'play': return write.cmdPlay(flags);
      case 'pause': return write.cmdPause(flags);
      case 'next': return write.cmdNext(flags);
      case 'prev': return write.cmdPrev(flags);
      case 'queue': return write.cmdQueue(positional[0], flags);
      case 'volume': return write.cmdVolume(positional[0], flags);
      case 'shuffle': return write.cmdShuffle(positional[0], flags);
      case 'repeat': return write.cmdRepeat(positional[0], flags);
      case 'transfer': return write.cmdTransfer(positional[0], flags);

      case 'save': return write.cmdSave(positional);
      case 'unsave': return write.cmdUnsave(positional);
      case 'follow': return write.cmdFollow(positional);
      case 'unfollow': return write.cmdUnfollow(positional);

      case 'playlist-create': return write.cmdPlaylistCreate(positional[0], flags);
      case 'playlist-add': return write.cmdPlaylistAdd(positional[0], positional.slice(1), flags);
      case 'playlist-remove': return write.cmdPlaylistRemove(positional[0], positional.slice(1));
      case 'playlist-edit': return write.cmdPlaylistEdit(positional[0], flags);

      default:
        return fail('bad_input', `unknown command: ${cmd}`, 'Run: spotify --help');
    }
  } catch (e) {
    const msg = e.message ?? String(e);
    if (msg.startsWith('bad_input:')) return fail('bad_input', msg.slice('bad_input:'.length));
    if (msg === 'not_authenticated' || msg.includes('not_authenticated')) {
      return fail('not_authenticated', 'Not logged in.', 'Run: spotify login');
    }
    if (e.code === 'rate_limited') {
      return fail('rate_limited', `Rate limited. Retry after ${e.retryAfter}s.`);
    }
    if (e.code === 'api_error') {
      return fail('generic_failure', `Spotify API ${e.status}: ${JSON.stringify(e.body)}`);
    }
    return fail('generic_failure', msg);
  }
}

main();
