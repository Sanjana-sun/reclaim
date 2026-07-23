FROM node:20-alpine

WORKDIR /app

# Install production deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Basic container healthcheck against the API
HEALTHCHECK --interval=30s --timeout=4s --start-period=8s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/api/health" || exit 1

CMD ["node", "server/index.js"]
