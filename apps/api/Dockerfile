FROM node:20-slim AS base
WORKDIR /app
RUN npm install -g pnpm@10

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./

COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY packages/observability/package.json ./packages/observability/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @preview-qa/api...

COPY packages/domain/src ./packages/domain/src
COPY packages/domain/tsconfig.json ./packages/domain/
COPY packages/db/src ./packages/db/src
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/observability/src ./packages/observability/src
COPY packages/observability/tsconfig.json ./packages/observability/
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsup.config.ts ./apps/api/

# tsup bundles everything (including workspace packages) into a single file
RUN pnpm --filter @preview-qa/api build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
