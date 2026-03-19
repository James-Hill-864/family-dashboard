FROM node:20-alpine

# Build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ libc6-compat jq

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source
COPY app/ ./app/
COPY components/ ./components/
COPY lib/ ./lib/
COPY prisma/ ./prisma/
COPY public/ ./public/
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY .eslintrc.json ./
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Build
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# CRITICAL: standalone output omits static assets — copy them in so CSS/JS loads
RUN cp -r .next/static .next/standalone/.next/static \
 && (cp -r public .next/standalone/public 2>/dev/null || mkdir -p .next/standalone/public)

# Copy run script
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["/app/run.sh"]
