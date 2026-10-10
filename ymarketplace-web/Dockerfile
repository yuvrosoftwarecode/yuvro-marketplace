# syntax=docker/dockerfile:1.7
# Multi-stage build for YMarketplace React frontend (TanStack Start / SSR)
# BuildKit is required: DOCKER_BUILDKIT=1
# Optimized for faster builds with aggressive caching and minimal production image

# ── base: install dependencies (cached layer) ─────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json ./
# npm install with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ── development: Vite dev server with HMR ────────────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 3004
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3004"]

# Alias for local development stage
FROM development AS local

# ── build: compile SSR bundle ─────────────────────────────────────────────────
FROM base AS build
# VITE_ env vars baked into the bundle at build time
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_YHUB_BACKEND_API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_DEPLOY_ENV
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEPLOY_COMMIT_SHA
ARG VITE_DEPLOY_BRANCH
ARG VITE_DEPLOY_APP_VERSION
# CACHEBUST after VITE_ ARGs — npm install layer stays cached even when URLs change
ARG CACHEBUST=1
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL \
    VITE_YHUB_BACKEND_API_BASE_URL=$VITE_YHUB_BACKEND_API_BASE_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_DEPLOY_ENV=$VITE_DEPLOY_ENV \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_DEPLOY_COMMIT_SHA=$VITE_DEPLOY_COMMIT_SHA \
    VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH \
    VITE_DEPLOY_APP_VERSION=$VITE_DEPLOY_APP_VERSION
COPY . .
RUN NITRO_PRESET=node-server npm run build

# ── production: SSR node server ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/.output /app/.output
COPY --from=build /app/package.json /app/package.json
ENV PORT=3004 \
    NITRO_PORT=3004
EXPOSE 3004
CMD ["node", ".output/server/index.mjs"]

# ── dev: alias for production (EC2 deployment) ───────────────────────────────
FROM production AS dev

# ── serve: alias for production ──────────────────────────────────────────────
FROM production AS serve
