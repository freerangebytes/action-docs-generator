#!/usr/bin/env bash
set -e

# Trust mise configuration
mise trust .mise.toml

# yamllint is pinned in .mise.toml but only distributed through mise's pipx
# backend, which shells out to a pipx binary. Install it before mise runs.
# --user puts it in ~/.local/bin, already on PATH via the Dockerfile.
pip install --user pipx

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
