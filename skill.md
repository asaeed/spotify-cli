`spotify` is a Spotify CLI installed at `~/.local/bin/spotify`. Use it to read and modify the user's Spotify library, playlists, and playback. It talks directly to the Spotify Web API — no third-party hosts in the middle.

## Before anything else

Run `spotify status` first. If it exits with code 2 (`not_authenticated`), stop and tell the user to run `!spotify login` in their terminal. The OAuth flow opens a browser; you cannot complete it for them.

If `status` reports `configured: false`, tell them to run `!spotify setup` first (it prompts interactively for the Client ID).

## Commands

### Read
| Command | Purpose |
|---|---|
| `spotify me` | Current user profile |
| `spotify playlists [--limit N]` | All playlists |
| `spotify playlist <id> [--limit N]` | One playlist with tracks |
| `spotify saved [--limit N]` | Saved tracks |
| `spotify top <tracks\|artists> [--time_range short_term\|medium_term\|long_term] [--limit N]` | Top items |
| `spotify recent [--limit N]` | Recently played |
| `spotify search <query> [--type track\|artist\|album\|playlist] [--limit N]` | Search (limit max 10 per Feb 2026 API change) |
| `spotify now` | Currently playing |
| `spotify player` | Full player state |
| `spotify devices` | Available devices |

### Write — playback
| Command | Purpose |
|---|---|
| `spotify play [--uri URI\|--uris u1,u2\|--context_uri URI] [--device_id ID]` | Start/resume playback |
| `spotify pause` | Pause |
| `spotify next` / `spotify prev` | Skip |
| `spotify queue <uri\|id>` | Queue track |
| `spotify volume <0-100>` | Set volume |
| `spotify shuffle <on\|off>` | Toggle shuffle |
| `spotify repeat <track\|context\|off>` | Repeat mode |
| `spotify transfer <device_id> [--play true]` | Move playback to device |

### Write — library
| Command | Purpose |
|---|---|
| `spotify save <uri\|id> [...]` | Save tracks to library (Feb 2026: goes through `/me/library`) |
| `spotify unsave <uri\|id> [...]` | Remove from library |
| `spotify follow <artist_id> [...]` | Follow artist |
| `spotify unfollow <artist_id> [...]` | Unfollow artist |

### Write — playlists
| Command | Purpose |
|---|---|
| `spotify playlist-create <name> [--description D] [--public true\|false] [--collaborative true\|false]` | New playlist |
| `spotify playlist-add <playlist_id> <uri\|id> [...] [--position N]` | Add tracks |
| `spotify playlist-remove <playlist_id> <uri\|id> [...]` | Remove tracks |
| `spotify playlist-edit <playlist_id> [--name N] [--description D] [--public ...] [--collaborative ...]` | Rename/reconfigure |

## Envelope

All commands emit one line of JSON on stdout:
```json
{ "status": "ok", "data": { ... }, "error": null }
```
On error: `status: "error"`, `error: {code, message, hint?}`.

## Exit codes

- `0` — success
- `1` — generic failure
- `2` — not authenticated → tell the user to run `!spotify login`
- `3` — bad input (unknown command, missing arg, etc.)
- `4` — network error
- `5` — rate limited (respect `Retry-After`)

## Critical rules

- **Login is interactive.** `spotify login` starts a local HTTP server on 127.0.0.1:8787 and opens a browser. Only the user can complete it. If status is "not_authenticated," tell them to run `!spotify login`. Never try it yourself.
- **Parse JSON; don't show the envelope verbatim.** Use `jq` or `python -c` to extract relevant fields, then summarize in natural language.
- **Fetch once, analyze in memory.** The CLI has no sort/filter flags. Pull the full list, then rank/filter yourself.
- **URIs accepted.** Any write command that takes IDs also accepts full `spotify:track:...` / `spotify:artist:...` URIs.
- **Spotify API is in flux.** Feb 2026 removed many endpoints. If a command fails with a 404/410-looking error, mention it — the CLI may need patching.

## Typical flows

**"What are my biggest playlists?"** → `spotify playlists` → sort by `tracks_total`, show top N.

**"What was the song I was listening to yesterday around 9pm?"** → `spotify recent --limit 50` → filter items by `played_at` within the window.

**"Add the track I'm playing now to my Running playlist."** → `spotify now` → extract `uri` → `spotify playlists` → find "Running" → `spotify playlist-add <running_id> <uri>`.

**"Who have I been listening to the most lately?"** → `spotify top artists --time_range short_term --limit 20` → report names + popularity.

**"Play that Kendrick track on my laptop."** → `spotify devices` → find laptop → `spotify search "kendrick <something>" --type track` → pick URI → `spotify play --uri <uri> --device_id <id>`.


`top --limit N` is the total requested across pages, not the API page size. Use `--limit 100000` to exhaust available rankings. The API is requested in pages of at most 50. Track outputs retain `artists` as names and add `artist_details` with artist IDs for durable identity matching.

`spotify followed [--limit N]` returns all followed artists by default, using cursor pagination and `user-follow-read`.

## Explicit artist preferences

`spotify followed --limit 100000` reads followed artists, not every observed track artist. There is no separate public listener starred-artist or blocked-artist list endpoint. `spotify blocked --file /path/to/YourLibrary.json` reads the `bannedArtists` array from a downloaded Spotify Account data export, offline without login. It outputs `{source: "spotify:account-export", live: false, count, artists: [{id, uri, name}]}` and never changes Spotify or concerts data. Missing fields/unsupported shapes fail instead of implying no blocks. The user's snapshot must be supplied before actual exclusions can be read. Do not upload raw account exports or infer dislikes from absent follows/rankings. The status-before-API rule does not apply to this offline export reader.
