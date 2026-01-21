FROM node:22.12.0-alpine

WORKDIR /app

# Copiamos package y prisma ANTES para que prisma pueda generarse
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Ahora sí copiamos el resto del código
COPY . .

# Generar Prisma Client (clave)
RUN npx prisma generate

# Compilar TS
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
