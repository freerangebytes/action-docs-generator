FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install mise for root user
RUN curl https://mise.run | sh \
    && echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc \
    && echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc

# Install tools using mise (as root)
RUN ~/.local/bin/mise use --global actionlint@latest gomplate@latest node@24

# Install yamllint via apt (it's a Python package, simpler than mise)
RUN apt-get update && apt-get install -y yamllint && rm -rf /var/lib/apt/lists/*

# Install mise for vscode user (run as vscode but stay as root after)
RUN su - vscode -c 'curl https://mise.run | sh \
    && echo '\''eval "$(~/.local/bin/mise activate bash)"'\'' >> ~/.bashrc \
    && echo '\''eval "$(~/.local/bin/mise activate zsh)"'\'' >> ~/.zshrc \
    && ~/.local/bin/mise use --global actionlint@latest gomplate@latest node@24'

# Set PATH for both users - vscode path takes precedence when running as vscode
ENV PATH="/home/vscode/.local/share/mise/shims:/root/.local/share/mise/shims:${PATH}"
