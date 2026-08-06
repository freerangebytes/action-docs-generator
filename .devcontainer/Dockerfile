FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install mise for vscode user
RUN su - vscode -c 'curl https://mise.run | sh \
    && echo '\''eval "$(~/.local/bin/mise activate bash)"'\'' >> ~/.bashrc \
    && echo '\''eval "$(~/.local/bin/mise activate zsh)"'\'' >> ~/.zshrc'

# Add mise shims to PATH for non-interactive commands
ENV PATH="/home/vscode/.local/share/mise/shims:/home/vscode/.local/bin:${PATH}"
