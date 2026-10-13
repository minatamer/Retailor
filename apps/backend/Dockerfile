# Official Node 24.21.0 Debian slim manifest, verified 2026-10-13.
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base
RUN apt-get update && apt-get install --no-install-recommends --only-upgrade -y perl-base=5.36.0-7+deb12u4 && rm -rf /var/lib/apt/lists/*
FROM base AS build
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

FROM base AS runtime
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production APP_ENV=production FAKE_MODE=false PAID_DEMO_ENABLED=false LIVE_POLICY_APPROVED=false LOGO_GENERATION_ENABLED=false LOGO_POLICY_APPROVED=false PROCESS_BUDGET_MICRO_USD=0 PORT=4311
COPY --from=build --chown=node:node /runtime/backend ./
USER node
EXPOSE 4311
CMD ["node", "dist/server.js"]
