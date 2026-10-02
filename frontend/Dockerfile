# Multi-stage build for React frontend (TanStack Start / SSR)
FROM oven/bun:1-alpine as base

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json bun.lock* ./
RUN bun install

# Local development stage — Vite dev server with HMR
FROM base as local
ARG CACHEBUST=1
COPY . .
EXPOSE 3004
CMD ["bunx", "vite", "dev", "--host", "0.0.0.0", "--port", "3004"]

# Build stage
FROM base as build
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_YHUB_BACKEND_API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_DEPLOY_ENV
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL
ENV VITE_YHUB_BACKEND_API_BASE_URL=$VITE_YHUB_BACKEND_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_DEPLOY_ENV=$VITE_DEPLOY_ENV
ARG CACHEBUST=1
COPY . .
RUN NITRO_PRESET=node-server bun run build

# Dev stage (Production on EC2) — SSR node server
FROM node:20-alpine as dev
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/.output /app/.output
COPY --from=build /app/package.json /app/package.json
ENV PORT=3004
ENV NITRO_PORT=3004
EXPOSE 3004
CMD ["node", ".output/server/index.mjs"]
