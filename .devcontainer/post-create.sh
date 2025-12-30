#!/usr/bin/env bash
set -e

# Trust mise configuration
mise trust .mise.toml

# Install tools defined in .mise.toml
mise install

# Activate mise environment for this session
eval "$(mise activate bash)"

# Setup pnpm global directory
export PNPM_HOME="$HOME/.local/share/pnpm"
mkdir -p "$PNPM_HOME"
export PATH="$PNPM_HOME:$PATH"

# Persist PNPM_HOME for future sessions
echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc

# Install global packages
pnpm add -g @anthropic-ai/claude-code
