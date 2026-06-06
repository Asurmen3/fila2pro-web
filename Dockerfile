FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN node node_modules/vite/bin/vite.js build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
EXPOSE 8080
ENV DB_PATH=/app/data/fila2pro.db
CMD ["node", "server/index.js"]
