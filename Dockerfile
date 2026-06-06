FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm ci --ignore-scripts && node node_modules/vite/bin/vite.js build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
EXPOSE 8080
ENV DB_PATH=/app/data/fila2pro.db
CMD ["node", "server/index.js"]
