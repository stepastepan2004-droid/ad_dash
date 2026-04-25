FROM oven/bun:1 AS base
WORKDIR /app

# Install nginx + Node.js (for DbGate)
RUN apt-get update && apt-get install -y nginx nodejs npm && rm -rf /var/lib/apt/lists/*

# Install DbGate globally with plugin in its plugin directory
RUN npm install -g dbgate-serve@latest \
    && DBGATE_DIR=$(dirname $(which dbgate-serve))/../lib/node_modules/dbgate-serve \
    && mkdir -p $DBGATE_DIR/plugins/dbgate-plugin-postgres \
    && cd $DBGATE_DIR/plugins/dbgate-plugin-postgres \
    && npm init -y && npm install dbgate-plugin-postgres@latest

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --linker=hoisted

# Copy source
COPY . .

# Build Nuxt
RUN bun run build

# @vercel/nft picks the wrong conditional export for @emotion/cache
# (edge-light instead of node), so dist/emotion-cache.cjs.js — the file
# the package's "main" field points to — is missing from the traced copy.
# Overwrite the traced @emotion/* and stylis with the full packages from
# our install so runtime module resolution actually works. Same root cause
# for stylis's subpath exports. Touches only server node_modules.
RUN rm -rf .output/server/node_modules/@emotion .output/server/node_modules/stylis \
    && cp -r node_modules/@emotion .output/server/node_modules/ \
    && cp -r node_modules/stylis .output/server/node_modules/

# Nginx config
COPY nginx.conf /etc/nginx/sites-enabled/default

EXPOSE 3000

# nginx (:3000) → Nuxt (:3002) + DbGate (:3003)
# Elysia API on :3001, proxied by Nuxt routeRules
CMD ["sh", "-c", "nginx && bun run backend/index.ts & WEB_ROOT=/db PORT=3003 CONNECTIONS=con1 LABEL_con1='Ad Dashboard' SERVER_con1=$DB_HOST USER_con1=$DB_USER PASSWORD_con1=$DB_PASSWORD PORT_con1=${DB_PORT:-5432} DATABASE_con1=$DB_NAME ENGINE_con1=postgres@dbgate-plugin-postgres dbgate-serve & sleep 1 && PORT=3002 bun run .output/server/index.mjs"]
