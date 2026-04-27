FROM node:20 AS base
WORKDIR /app
RUN npm install -g pnpm@10

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy all package manifests
COPY packages/ai/package.json ./packages/ai/
COPY packages/db/package.json ./packages/db/
COPY packages/domain/package.json ./packages/domain/
COPY packages/github-adapter/package.json ./packages/github-adapter/
COPY packages/observability/package.json ./packages/observability/
COPY packages/onboarding/package.json ./packages/onboarding/
COPY packages/parser/package.json ./packages/parser/
COPY packages/planner/package.json ./packages/planner/
COPY packages/reporter/package.json ./packages/reporter/
COPY packages/runner-playwright/package.json ./packages/runner-playwright/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/vercel-adapter/package.json ./packages/vercel-adapter/
COPY packages/code-reviewer/package.json ./packages/code-reviewer/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/api/package.json ./apps/api/
COPY apps/browser-runner/package.json ./apps/browser-runner/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/web/package.json ./apps/web/
COPY apps/webhook-api/package.json ./apps/webhook-api/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy all package sources
COPY packages/ai/src ./packages/ai/src
COPY packages/ai/tsconfig.json ./packages/ai/
COPY packages/db/src ./packages/db/src
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/domain/src ./packages/domain/src
COPY packages/domain/tsconfig.json ./packages/domain/
COPY packages/github-adapter/src ./packages/github-adapter/src
COPY packages/github-adapter/tsconfig.json ./packages/github-adapter/
COPY packages/observability/src ./packages/observability/src
COPY packages/observability/tsconfig.json ./packages/observability/
COPY packages/onboarding/src ./packages/onboarding/src
COPY packages/onboarding/tsconfig.json ./packages/onboarding/
COPY packages/parser/src ./packages/parser/src
COPY packages/parser/tsconfig.json ./packages/parser/
COPY packages/planner/src ./packages/planner/src
COPY packages/planner/tsconfig.json ./packages/planner/
COPY packages/reporter/src ./packages/reporter/src
COPY packages/reporter/tsconfig.json ./packages/reporter/
COPY packages/runner-playwright/src ./packages/runner-playwright/src
COPY packages/runner-playwright/tsconfig.json ./packages/runner-playwright/
COPY packages/schemas/src ./packages/schemas/src
COPY packages/schemas/tsconfig.json ./packages/schemas/
COPY packages/vercel-adapter/src ./packages/vercel-adapter/src
COPY packages/vercel-adapter/tsconfig.json ./packages/vercel-adapter/
COPY packages/code-reviewer/src ./packages/code-reviewer/src
COPY packages/code-reviewer/tsconfig.json ./packages/code-reviewer/
COPY apps/orchestrator/src ./apps/orchestrator/src
COPY apps/orchestrator/tsconfig.json ./apps/orchestrator/

# Build all workspace packages and orchestrator using pnpm recursive
# --filter ...orchestrator builds orchestrator AND all its workspace dependencies
RUN pnpm --filter @preview-qa/domain build
RUN pnpm --filter @preview-qa/db build
RUN pnpm --filter @preview-qa/schemas build
RUN pnpm --filter @preview-qa/observability build
RUN pnpm --filter @preview-qa/ai build
RUN pnpm --filter @preview-qa/parser build
RUN pnpm --filter @preview-qa/planner build
RUN pnpm --filter @preview-qa/reporter build
RUN pnpm --filter @preview-qa/github-adapter build
RUN pnpm --filter @preview-qa/vercel-adapter build
RUN pnpm --filter @preview-qa/runner-playwright build
RUN pnpm --filter @preview-qa/onboarding build
RUN pnpm --filter @preview-qa/code-reviewer build
RUN pnpm --filter @preview-qa/orchestrator build

# Install Playwright browsers and system dependencies
RUN node_modules/.pnpm/node_modules/.bin/playwright install --with-deps chromium

ENV NODE_ENV=production

CMD ["node", "apps/orchestrator/dist/apps/orchestrator/src/index.js"]
