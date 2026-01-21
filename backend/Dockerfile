FROM node:20-alpine

WORKDIR /app

# deps
COPY package*.json ./
RUN npm ci

# prisma
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

# build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
