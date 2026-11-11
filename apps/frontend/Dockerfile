# Official Node 24.22.3 Debian slim manifest, verified 2026-11-11.
# Includes patched APT 2.6.2, Perl deb12u4 and PCRE2 deb12u2.
FROM node:24.22.3-bookworm-slim@sha256:4d897dfbf2bed5e4e09128f8b8da96a2bdf36e3cace084a32c9c4e637ec0ff81 AS base
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
COPY apps/frontend ./apps/frontend
ENV NEXT_TELEMETRY_DISABLED=1 RETAILOR_DEV=false
RUN pnpm build:shared && pnpm --filter @retailor/frontend build

FROM base AS runtime
WORKDIR /app
# Runtime starts Node directly; no install/build command or package manager.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production APP_ENV=production RETAILOR_DEV=false NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=4310
COPY --from=build --chown=node:node /workspace/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=node:node /workspace/apps/frontend/public ./apps/frontend/public
USER node
EXPOSE 4310
CMD ["node", "apps/frontend/server.js"]
