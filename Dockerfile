FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN mkdir -p backend/data

EXPOSE 5173 3001

ENV PORT=3001
ENV VITE_API_TARGET=http://127.0.0.1:3001
ENV NODE_ENV=development
ENV JWT_SECRET=contract-demo-secret-2025

CMD ["sh", "-c", "npm run server:dev & sleep 5 && npm run client:dev -- --host 0.0.0.0 --port 5173"]
