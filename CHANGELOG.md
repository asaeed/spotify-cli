# Changelog

## 0.3.1 — 2026-10-08

- Read blocked artists offline from Spotify Account data with `blocked --file YourLibrary.json`, without exposing unrelated export fields or treating missing fields as an empty list.
- Document followed artists, public API limitations and export snapshot semantics.

## 0.2.0 — 2026-10-05

- Fetch all requested top-artist and top-track pages, respecting Spotify's 50-item API page limit.
- Preserve artist IDs alongside existing track artist-name arrays for durable concert-watchlist imports.
- Drain large JSON envelopes before process exit so piped library imports are complete.
- Add pagination and large-output regression tests and document concert-watchlist integration.
