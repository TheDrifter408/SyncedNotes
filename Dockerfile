# Stage 1: Build the application
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /user/src/app

# Copy the package.json and pnpm-lock.yaml to install dependencies
COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

RUN pnpm prune --prod

# Stage 2: Run the application
FROM node:20-alpine as runner

WORKDIR /user/src/app

ENV NODE_ENV=production

COPY --from=builder /user/src/app/package.json ./
COPY --from=builder /user/src/app/node_modules ./node_modules
COPY --from=builder /user/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
