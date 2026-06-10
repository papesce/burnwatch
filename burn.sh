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
    echo "Done. Run 'burn open' to start."
    ;;
  open)
    echo "==> Starting BurnWatch in background (logs → .burnwatch.log)..."
    nohup npm run dev --prefix "$PROJECT_DIR" > "$PROJECT_DIR/.burnwatch.log" 2>&1 &
    echo "PID: $!"
    ;;
  dev)
    echo "==> Starting BurnWatch (foreground)..."
    exec npm run dev --prefix "$PROJECT_DIR"
    ;;
  kill)
    echo "==> Killing processes on ports 3777 and 5777..."
    lsof -ti:3777,5777 | xargs kill -9 2>/dev/null || true
    echo "Done."
    ;;
  restart)
    "$0" kill
    "$0" dev
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
      echo "Done. You can now run 'burn <command>' from any terminal."
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
    echo "Usage: burn <command>"
    echo ""
    echo "Commands:"
    echo "  install       Install all dependencies (npm install + ccusage)"
    echo "  open          Start the development server (background)"
    echo "  dev           Start the development server (foreground with logs)"
    echo "  kill          Stop processes on ports 3777 and 5777"
    echo "  restart       Kill then restart"
    echo "  build         Production build"
    echo "  setup         Make 'burn' available globally (symlink in /usr/local/bin)"
    echo "  uninstall     Remove global symlink and node_modules"
    echo "  version       Show version"
    echo "  help          Show this help"
    ;;
esac
