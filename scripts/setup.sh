#!/bin/bash
set -e

# Install Node.js dependencies
npm install

# Install Playwright browsers (Chromium and others if needed)
# Installing WebKit is required for Mobile Safari tests
npx playwright install chromium webkit

# Install system dependencies required for browsers
# This handles libraries like libgtk, libgstreamer, etc.
npx playwright install-deps

# Install Graphviz for dependency graph generation
if command -v apt-get &> /dev/null; then
  echo "Installing Graphviz..."
  sudo apt-get update
  sudo apt-get install -y graphviz
elif command -v brew &> /dev/null; then
  echo "Installing Graphviz..."
  brew install graphviz
else
  echo "Graphviz installation skipped (package manager not found)."
  echo "Please install Graphviz manually to use dependency graph features."
fi
