apt-get update
apt-get install -y unzip
curl -fsSL https://fnm.vercel.app/install | bash
export PATH=/root/.local/share/fnm:$PATH
eval "$(fnm env)"
fnm install 20
fnm use 20
npm install -g pnpm
mkdir -p openapi-schema-diff
echo '{"name":"openapi-schema-diff","version":"1.0.0"}' > openapi-schema-diff/package.json
pnpm install
pnpm build