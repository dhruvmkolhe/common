FROM node:20-alpine

RUN apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/v3.16/main/ libssl1.1

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./

RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY src ./src/

EXPOSE 5000

CMD ["node", "src/index.js"]
