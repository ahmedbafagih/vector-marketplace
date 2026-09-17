#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
REPO_DIR=${SCRIPT_DIR:h}
INSTALL_DIR=${VECTOR_INSTALL_DIR:-"$HOME/Applications"}
APP_PATH="$INSTALL_DIR/Vector.app"
BUILD_APP="$REPO_DIR/build/Vector.app"
OPEN_AFTER_INSTALL=true
TEST_DIR=""
STAGE_DIR=""
[[ "${1:-}" == "--no-open" ]] && OPEN_AFTER_INSTALL=false

cleanup() {
  [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]] && rm -rf "$TEST_DIR"
  [[ -n "$STAGE_DIR" && -d "$STAGE_DIR" ]] && rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

fail() {
  print -u2 "Vector setup stopped: $1"
  exit 1
}

[[ "$(uname -s)" == "Darwin" ]] || fail "this installer currently supports macOS only."
command -v python3 >/dev/null || fail "Python 3 is required to run the build."
command -v swiftc >/dev/null || fail "Install Apple Command Line Tools with: xcode-select --install"
command -v codesign >/dev/null || fail "Apple code signing tools are unavailable."

if [[ -d /Library/Developer/CommandLineTools ]]; then
  export DEVELOPER_DIR=/Library/Developer/CommandLineTools
fi

print "Building Vector..."
cd "$REPO_DIR"
python3 build.py

TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/vector-install.XXXXXX")
print "Checking the local build..."
VECTOR_DATA_DIR="$TEST_DIR" "$BUILD_APP/Contents/MacOS/Vector" --self-test

if pgrep -x Vector >/dev/null 2>&1; then
  print "Closing the running Vector app before updating it..."
  osascript -e 'tell application id "com.ahmed.vector" to quit' >/dev/null 2>&1 || true
  for _ in {1..40}; do
    pgrep -x Vector >/dev/null 2>&1 || break
    sleep 0.25
  done
  pgrep -x Vector >/dev/null 2>&1 && fail "Vector is still running. Quit it and run this installer again."
fi

mkdir -p "$INSTALL_DIR"
STAGE_DIR=$(mktemp -d "$INSTALL_DIR/.vector-install.XXXXXX")
STAGED_APP="$STAGE_DIR/Vector.app"
ditto "$BUILD_APP" "$STAGED_APP"
[[ -x "$STAGED_APP/Contents/MacOS/Vector" ]] || fail "the staged app could not be verified."

BACKUP_APP=""
if [[ -e "$APP_PATH" ]]; then
  BACKUP_APP="$INSTALL_DIR/Vector.previous-$(date +%Y%m%d%H%M%S).app"
  mv "$APP_PATH" "$BACKUP_APP"
fi
if ! mv "$STAGED_APP" "$APP_PATH"; then
  [[ -n "$BACKUP_APP" && -e "$BACKUP_APP" ]] && mv "$BACKUP_APP" "$APP_PATH"
  fail "the new app could not be moved into place. The previous app was restored."
fi
rmdir "$STAGE_DIR"
STAGE_DIR=""

[[ -x "$APP_PATH/Contents/MacOS/Vector" ]] || fail "the installed app could not be verified."
cmp -s "$REPO_DIR/Web/index.html" "$APP_PATH/Contents/Resources/index.html" || fail "the installed interface does not match this build."

if $OPEN_AFTER_INSTALL; then
  print "Opening Vector and the Chrome extension setup..."
  open "$APP_PATH"
  open "$APP_PATH/Contents/Resources/Extension"
  if [[ -d "/Applications/Google Chrome.app" ]] || [[ -d "$HOME/Applications/Google Chrome.app" ]]; then
    open -a "Google Chrome" "chrome://extensions" || true
  fi
fi

cat <<EOF

Vector is installed at:
$APP_PATH

One Chrome step remains:
1. On chrome://extensions, turn on Developer mode.
2. Choose Load unpacked.
3. Select the Extension folder that Finder opened.
4. Open the Vector companion and choose Connect Marketplace.

Then return to Vector and complete the short setup guide.
EOF

