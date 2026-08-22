#!/usr/bin/env bash
set -e

# Trust mise configuration
mise trust .mise.toml

# Install tools defined in .mise.toml
mise install

# Activate mise environment for this session
eval "$(mise activate bash)"

# Setup pnpm global directory. Since pnpm 11 the global bin directory is
# $PNPM_HOME/bin, not $PNPM_HOME itself, and pnpm refuses to install globally
# unless that exact directory is on PATH.
export PNPM_HOME="$HOME/.local/share/pnpm"
mkdir -p "$PNPM_HOME/bin"
export PATH="$PNPM_HOME/bin:$PATH"

# Persist PNPM_HOME for future sessions
echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME/bin:$PATH"' >> ~/.bashrc

# Install global packages
pnpm add -g @anthropic-ai/claude-code
