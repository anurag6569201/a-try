FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY .eslintrc.js ./

# Copy package manifests
COPY packages/domain/package.json ./packages/domain/
COPY packages/runner-playwright/package.json ./packages/runner-playwright/
COPY apps/browser-runner/package.json ./apps/browser-runner/

# Install only prod + browser-runner deps
RUN pnpm install --filter @preview-qa/browser-runner... --frozen-lockfile

# Copy source
COPY packages/domain/src ./packages/domain/src
COPY packages/domain/tsconfig.json ./packages/domain/
COPY packages/runner-playwright/src ./packages/runner-playwright/src
COPY packages/runner-playwright/tsconfig.json ./packages/runner-playwright/
COPY apps/browser-runner/src ./apps/browser-runner/src
COPY apps/browser-runner/tsconfig.json ./apps/browser-runner/

# Build
RUN pnpm --filter @preview-qa/browser-runner build

ENV NODE_ENV=production

CMD ["node", "apps/browser-runner/dist/apps/browser-runner/src/index.js"]
