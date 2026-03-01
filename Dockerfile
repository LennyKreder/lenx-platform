FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Include Prisma CLI and migrations for deploy (installed in separate dir to avoid conflicts)
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY --from=deps /app/generated ./generated
RUN mkdir /prisma-cli && cd /prisma-cli && npm init -y && npm install prisma dotenv

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "export NODE_PATH=/prisma-cli/node_modules; export PRISMA=/prisma-cli/node_modules/.bin/prisma; $PRISMA migrate resolve --applied 20260124000000_init 2>/dev/null || true; $PRISMA migrate resolve --applied 20260124164145_init 2>/dev/null || true; $PRISMA migrate resolve --applied 20260124200000_add_default_price_to_template 2>/dev/null || true; $PRISMA migrate resolve --applied 20260125000000_add_reviews 2>/dev/null || true; $PRISMA migrate deploy && node server.js"]
