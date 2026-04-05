FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src/ ./src/

# Create data directory for persistent state
RUN mkdir -p /app/data

CMD ["npx", "tsx", "src/index.ts"]
