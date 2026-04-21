#!/bin/bash
# Installs spotify-cli: symlinks binary to ~/.local/bin/spotify.
# If ~/.claude/commands/ exists, also installs skill.md for Claude Code agents.
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
BIN_SRC="$REPO/bin/spotify.js"
BIN_DEST="$HOME/.local/bin/spotify"

mkdir -p "$HOME/.local/bin"
ln -sf "$BIN_SRC" "$BIN_DEST"
chmod +x "$BIN_SRC"
echo "Installed binary: $BIN_DEST -> $BIN_SRC"

if [ -d "$HOME/.claude/commands" ]; then
  SKILL_DEST="$HOME/.claude/commands/spotify-cli.md"
  cp "$REPO/skill.md" "$SKILL_DEST"
  echo "Installed skill:  $SKILL_DEST"
fi

if ! command -v spotify >/dev/null 2>&1; then
  echo ""
  echo "Warning: 'spotify' not found on PATH."
  echo "Ensure \$HOME/.local/bin is on your PATH."
fi

echo ""
echo "Next steps:"
echo "  1) spotify setup   (configure Client ID)"
echo "  2) spotify login   (OAuth flow)"
echo "  3) spotify me      (verify)"
