#!/usr/bin/env bash
set -euo pipefail

# Resolve the real script directory, following symlinks
SOURCE="$0"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
PROJECT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
CMD="${1:-help}"

# Alias resolution: accept old names and intuitive synonyms
case "$CMD" in
  open)   CMD="start" ;;
  start)  CMD="start" ;;
  stop)   CMD="kill" ;;
  link)   CMD="setup" ;;
esac

# Resolve nvm-managed node into PATH so nohup/background runs can find it
if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
  NODE_BIN="$(ls "$NVM_DIR/versions/node"/*/bin/node 2>/dev/null | sort -V | tail -1 | xargs dirname 2>/dev/null || true)"
  [ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
fi

case "$CMD" in
  install)
    echo "==> Installing BurnWatch dependencies..."
    npm install --prefix "$PROJECT_DIR"
    if ! command -v ccusage &>/dev/null; then
      echo "==> Installing ccusage globally (required by proxy)..."
      npm install -g ccusage
    else
      echo "==> ccusage already installed"
    fi
    echo "Done. Run 'burn start' to launch."
    ;;
  start)
    echo "==> Starting BurnWatch in background (logs → .burnwatch.log)..."
    nohup npm run dev --prefix "$PROJECT_DIR" > "$PROJECT_DIR/.burnwatch.log" 2>&1 &
    echo "PID: $! — open http://localhost:5777"
    ;;
  dev)
    echo "==> Starting BurnWatch (foreground)..."
    exec npm run dev --prefix "$PROJECT_DIR"
    ;;
  kill)
    echo "==> Stopping processes on ports 3777 and 5777..."
    lsof -ti:3777,5777 | xargs kill -9 2>/dev/null || true
    echo "Done."
    ;;
  restart)
    "$0" kill
    "$0" start
    ;;
  build)
    npm run build --prefix "$PROJECT_DIR"
    ;;
  setup)
    LINK="/usr/local/bin/burn"
    if [ -L "$LINK" ] && [ "$(readlink "$LINK")" = "$PROJECT_DIR/burn.sh" ]; then
      echo "burn already linked to this project."
    else
      echo "==> Creating symlink: sudo ln -sf '$PROJECT_DIR/burn.sh' '$LINK'"
      sudo ln -sf "$PROJECT_DIR/burn.sh" "$LINK"
      echo "Done. You can now run 'burn start' from any terminal."
    fi
    ;;
  uninstall)
    LINK="/usr/local/bin/burn"
    if [ -L "$LINK" ] || [ -f "$LINK" ]; then
      echo "==> Removing symlink: sudo rm '$LINK'"
      sudo rm "$LINK"
      echo "burn command removed from global PATH."
    else
      echo "No global burn command found."
    fi
    if [ -d "$PROJECT_DIR/node_modules" ]; then
      echo "==> Removing node_modules..."
      rm -rf "$PROJECT_DIR/node_modules"
      echo "node_modules removed."
    fi
    echo "Uninstall complete."
    ;;
  version|--version|-v)
    echo "BurnWatch $(node -p "require('$PROJECT_DIR/package.json').version")"
    ;;
  help|*)
    echo "BurnWatch — real-time Claude token burn rate dashboard"
    echo ""
    echo "Usage: burn <command>"
    echo ""
    echo "First-time setup:"
    echo "  install       Install npm dependencies and ccusage"
    echo "  link          Symlink 'burn' into /usr/local/bin (run once)"
    echo ""
    echo "Daily use:"
    echo "  start         Launch dashboard in background  → http://localhost:5777"
    echo "  dev           Launch dashboard in foreground (with live logs)"
    echo "  stop          Stop the running dashboard (ports 3777 + 5777)"
    echo "  restart       Stop then start in background"
    echo ""
    echo "Other:"
    echo "  build         Production build (output in dist/)"
    echo "  uninstall     Remove global symlink and node_modules"
    echo "  version       Show version"
    ;;
esac
