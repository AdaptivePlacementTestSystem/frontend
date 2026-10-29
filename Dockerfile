# syntax=docker/dockerfile:1
# Frontend Next.js (output: standalone). Build ở giai đoạn 1, chạy ở giai đoạn 2 (không root).

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# env.ts kiểm tra API_BASE_URL khi build; giá trị thật được cấp lúc chạy (docker-compose).
ARG API_BASE_URL=http://backend:3001/api/v1
ENV API_BASE_URL=${API_BASE_URL}
# git cần để npm cài @apt/shared-types từ GitHub (ảnh alpine không có sẵn).
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN mkdir -p public && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Liveness (không phụ thuộc backend)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
