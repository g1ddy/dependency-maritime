#!/bin/bash
set -euo pipefail

bash scripts/maintenance.sh

node -v
npm -v

if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "Playwright browsers not found!"
  exit 1
fi

if ! command -v dot &> /dev/null; then
  echo "Graphviz (dot) is missing!"
  exit 1
fi

npm run test:unit -- list
