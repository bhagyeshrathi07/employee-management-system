# =================================================================================================
# Stage 1: build the static bundle with Vite
# =================================================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Install exact versions from the lockfile; cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# =================================================================================================
# Stage 2: serve with nginx (static files + /api reverse proxy to the backend container)
# =================================================================================================
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
