#!/bin/bash

# Mobile E2E Test Runner
# This script sets up the environment and runs Maestro e2e tests

set -e

# Load environment from .env.e2e if it exists
if [ -f "e2e/.env.e2e" ]; then
  export $(grep -v '^#' e2e/.env.e2e | xargs)
fi

# Check for required environment variables with defaults
MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"

# Add Maestro and Java to PATH
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
export MAESTRO_DRIVER_STARTUP_TIMEOUT

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
  echo "Error: Maestro is not installed."
  echo ""
  echo "Install Maestro with:"
  echo "  curl -Ls \"https://get.maestro.mobile.dev\" | bash"
  echo ""
  echo "Then ensure it's in your PATH or set MAESTRO_PATH in e2e/.env.e2e"
  exit 1
fi

# Check if Java is available
if ! command -v java &> /dev/null; then
  echo "Error: Java is not installed or not in PATH."
  echo ""
  echo "Install Java with:"
  echo "  brew install openjdk@17"
  echo ""
  echo "Then set JAVA_HOME in e2e/.env.e2e or your shell profile"
  exit 1
fi

# Check if a simulator is running
if ! xcrun simctl list devices booted 2>/dev/null | grep -q "Booted"; then
  echo "Error: No iOS simulator is running."
  echo ""
  echo "Start a simulator with:"
  echo "  open -a Simulator"
  echo ""
  echo "Or boot a specific device:"
  echo "  xcrun simctl boot \"iPhone 16\""
  exit 1
fi

# Check if the app is installed on the simulator
if ! xcrun simctl listapps booted 2>/dev/null | grep -q "com.livestore.todo"; then
  echo "Error: The LiveStore app is not installed on the simulator."
  echo ""
  echo "Build and install the app with:"
  echo "  cd apps/mobile"
  echo "  npx expo prebuild --platform ios"
  echo "  npx expo run:ios"
  exit 1
fi

# Check if the backend server is running
if ! curl -s http://localhost:8787 > /dev/null 2>&1; then
  echo "Warning: Backend server doesn't appear to be running on localhost:8787"
  echo ""
  echo "Start the server with:"
  echo "  pnpm dev:server"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "Running Maestro e2e tests..."
echo ""

# Run Maestro tests
# If first argument is a file path, run that specific flow
# Otherwise, run all flows in e2e/flows/
if [ -n "$1" ] && [ -f "$1" ]; then
  maestro test "$@"
else
  maestro test e2e/flows/ "$@"
fi
