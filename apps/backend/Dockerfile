# Official Node 24.19.0 Debian slim manifest, verified 2026-10-13.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS build
WORKDIR /workspace
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/commerce/package.json ./packages/commerce/package.json
RUN pnpm install --frozen-lockfile
COPY packages ./packages
COPY apps/backend ./apps/backend
# Pinned pnpm 11's legacy deploy supports the existing linked workspace.
# package.files limits all three local packages to their compiled output.
RUN pnpm build:shared && pnpm --filter @retailor/backend build && pnpm --filter @retailor/backend deploy --prod --legacy /runtime/backend

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runtime
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production APP_ENV=production FAKE_MODE=false PAID_DEMO_ENABLED=false LIVE_POLICY_APPROVED=false LOGO_GENERATION_ENABLED=false LOGO_POLICY_APPROVED=false PROCESS_BUDGET_MICRO_USD=0 PORT=4311
COPY --from=build --chown=node:node /runtime/backend ./
USER node
EXPOSE 4311
CMD ["node", "dist/server.js"]
