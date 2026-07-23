# Stage 1: Install dependencies and generate Prisma client
# Used by docker-compose.dev.yml as the dev target
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy dependency manifests and workspace config (needed by pnpm)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# Copy Prisma schema & config, then generate the client
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate

# ------------------------------------------------------------------- #
# Stage 2: Build the application
FROM deps AS builder

COPY . .
RUN pnpm run build

# Prisma is a regular dependency now, so it survives --prod pruning
RUN pnpm prune --prod

# ------------------------------------------------------------------- #
# Stage 3: Production runner
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only what's needed at runtime
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
