#!/bin/sh

clone_and_checkout() {
  local REPO_URL=$1
  local TARGET_DIR=$2
  local BRANCH_NAME=$3

  if [ ! -d "$TARGET_DIR" ]; then
    git clone "$REPO_URL" "$TARGET_DIR"
  fi

  cd "$TARGET_DIR"
  git checkout "$BRANCH_NAME"
  cd - > /dev/null
}

clone_and_checkout "https://github.com/winetree94/xterm-pty.git" "packages/xterm-pty" "features/modules"
# clone_and_checkout "https://github.com/winetree94/browser_wasi_shim.git" "packages/browser_wasi_shim" "features/modules"
