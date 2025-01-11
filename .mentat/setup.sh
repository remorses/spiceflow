curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
npm install -g pnpm
mkdir -p openapi-schema-diff
echo '{"name":"openapi-schema-diff","version":"1.0.0"}' > openapi-schema-diff/package.json
pnpm install
pnpm add -D vitest@latest
pnpm build