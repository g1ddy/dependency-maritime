#!/bin/bash
set -euo pipefail

bash scripts/setup.sh

# Check if package-lock.json was modified
if ! git diff --quiet package-lock.json; then
  echo "WARNING: package-lock.json was modified during setup. Resetting changes to ensure clean working tree."
  git diff package-lock.json
  git restore package-lock.json
fi

echo "Setup complete. Starting verification..."

# 1. Check critical versions
node -v || { echo "Node is missing"; exit 1; }
npm -v || { echo "NPM is missing"; exit 1; }

# 2. Verify Playwright Browsers are actually present
# (This checks if the folder exists, ensuring the huge download actually finished)
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "Playwright browsers not found!"
  exit 1
fi

# 3. Verify Graphviz is installed
if ! command -v dot &> /dev/null; then
  echo "Graphviz (dot) is missing!"
  exit 1
fi

# 4. Dry run a test (Optional but powerful)
# Runs a list of tests without executing them, just to ensure the test runner boots.
npm run test:unit -- list || { echo "Test runner failed to start"; exit 1; }

echo "Verification Passed. Environment is healthy."
