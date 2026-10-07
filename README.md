# spotify-cli

A zero-dependency Spotify CLI for use from the terminal or AI coding agents (Claude Code, etc.). Direct Spotify Web API access via local OAuth — no third-party hosts, no SDKs.

Runs on Node 20+ (for native `fetch` and Web Crypto). No `node_modules`.

For Concert Radar integration, use the [fresh-machine quickstart](https://github.com/asaeed/concerts-cli/blob/main/docs/quickstart.md). Complete ranking imports are available on `main`.

## Install (macOS / Linux)

```bash
git clone https://github.com/asaeed/spotify-cli.git
cd spotify-cli
./install.sh
```

This symlinks `bin/spotify.js` to `~/.local/bin/spotify`. If `~/.claude/commands/` exists, it also installs a Claude Code skill file so agents know how to use the CLI.

Ensure `~/.local/bin` is on your `$PATH`.

## Setup

1. Create a Spotify app at <https://developer.spotify.com/dashboard>
   - **Redirect URI** (exact): `http://127.0.0.1:8787/callback`
   - Enable **Web API**
2. Copy the Client ID.
3. Run:
   ```bash
   spotify setup    # prompts for Client ID
   spotify login    # OAuth flow, opens browser
   spotify me       # verify
   ```

Config and tokens are stored at `~/.config/spotify-cli/` with `0600` permissions. PKCE is used — no client secret needed.

Override the config directory with `SPOTIFY_CLI_DIR=/custom/path`.

## Use with Concert Radar

After installing both repositories and authorizing your own Spotify account:

```sh
concerts favorite sync
# From the concerts-cli checkout, after adding a region:
./run-digest.sh --no-post
node web/server.js
```

Open <http://localhost:8737/>. The concert dashboard saves artist rankings and a durable watchlist locally. Each person starts with their own data; no access to someone else's recovery repo is needed. Teams delivery and GitHub recovery backups are optional. See the [concerts-cli README](https://github.com/asaeed/concerts-cli#concert-radar-quick-setup) for city setup, manual favorites and persistent macOS hosting.

To contribute, fork this repository and open a pull request against `main`. OAuth tokens and local configurations stay outside Git; never copy another user's credentials.

## Auth flow

1. `spotify login` starts a local HTTP server on `127.0.0.1:8787`.
2. Opens Spotify's authorize URL with `code_challenge` (PKCE, SHA-256).
3. After you approve, Spotify redirects to `http://127.0.0.1:8787/callback?code=...&state=...`.
4. CLI exchanges the code + verifier for access + refresh tokens.
5. Access token is refreshed automatically when within 60s of expiry, or on any 401 response.

## Commands

See `spotify --help` or [`skill.md`](skill.md).

## Dev Mode / Premium

As of Feb 2026, Spotify's Developer Mode apps require a Premium account on the authorized user.

## Notes on Feb 2026 API changes

This CLI targets the post-February-2026 API surface:

- Saves and library writes go through `PUT/DELETE /me/library` (query-param URIs, max 40 at a time).
- Playlist modify endpoints use `/items` not `/tracks`.
- Search is capped at `limit=10` per request.
- Many batch fetch endpoints were removed; the CLI uses per-item fetches where needed.

If an endpoint breaks on a future API change, patch the relevant file under `src/commands/`.

## Files

- `bin/spotify.js` — CLI entry and arg router
- `src/config.js` — paths, constants, scopes
- `src/storage.js` — config + token JSON at `~/.config/spotify-cli/`
- `src/auth.js` — PKCE OAuth, refresh, logout
- `src/api.js` — `fetch` wrapper with 401-refresh-retry and pagination
- `src/envelope.js` — JSON envelope + exit codes
- `src/commands/auth.js` — setup, login, logout, status, refresh
- `src/commands/read.js` — read endpoints
- `src/commands/write.js` — playback, library, playlist mutations

## License

MIT


## Complete artist imports and automation

`spotify top artists --time_range long_term --limit 100000` exhausts available ranking pages. `--limit` now controls the total requested; each API request uses at most 50 items. The same paging applies to top tracks.

Track results keep the existing `artists` array of names and add `artist_details` containing artist IDs and names. This lets concerts-cli retain identities and spelling aliases across daily imports.

Large JSON envelopes finish draining stdout before the CLI exits, so pipe consumers receive complete results. This fixes intermittent parse failures for large liked-song and ranking imports. OAuth credentials remain local under `~/.config/spotify-cli` and are not part of concerts-cli's GitHub data backup.

Run regression checks with `npm test`.
