#!/bin/bash
set -euo pipefail

# Refresh Node.js dependencies.
npm install

# Keep Playwright browsers and their system dependencies available.
npx playwright install chromium webkit
npx playwright install-deps

# Keep Graphviz available for dependency graph generation.
if command -v apt-get &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y graphviz
elif command -v brew &> /dev/null; then
  brew install graphviz
else
  echo "Graphviz installation skipped (package manager not found)."
  echo "Please install Graphviz manually to use dependency graph features."
fi
