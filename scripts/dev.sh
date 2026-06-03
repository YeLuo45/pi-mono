#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ensure_node() {
  if [ -x "${N_PREFIX:-$HOME/.n}/bin/node" ]; then
    export PATH="${N_PREFIX:-$HOME/.n}/bin:$PATH"
  fi

  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])")"
  if [ "$major" -lt 20 ]; then
    echo "需要 Node.js 20.19+（Vite 8 要求），当前: $(node -v)" >&2
    echo "安装示例: N_PREFIX=\$HOME/.n n 22 && export PATH=\$HOME/.n/bin:\$PATH" >&2
    exit 1
  fi
}

ensure_electron() {
  if pnpm exec electron --version >/dev/null 2>&1; then
    return
  fi

  local install_js
  install_js="$(find node_modules/.pnpm -path '*/electron@*/node_modules/electron/install.js' 2>/dev/null | head -1)"
  if [ -n "$install_js" ]; then
    echo "正在下载 Electron 二进制..."
    node "$install_js"
  fi
}

ensure_node

if command -v pnpm >/dev/null; then
  pnpm install
  ensure_electron
  exec pnpm run dev
fi

npm install --legacy-peer-deps
exec npm run dev
