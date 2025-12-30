# backend/Dockerfile

# Usamos Node 24, compatible con Prisma 7
FROM node:24-alpine

# Carpeta de trabajo
WORKDIR /app

# Copiamos sólo los package* primero para aprovechar la caché
COPY package*.json ./

# Instalamos dependencias (sin dev para producción)
RUN npm ci --omit=dev

# Copiamos el resto del código del backend
COPY . .

# Generamos el cliente de Prisma
RUN npx prisma generate

# Compilamos TypeScript (usa tu script build)
RUN npm run build

# Variables de entorno por defecto dentro del contenedor
ENV NODE_ENV=production
ENV PORT=4000

# Puerto que expone el contenedor
EXPOSE 4000

# Al arrancar el contenedor: aplicar migraciones y lanzar el servidor
CMD sh -c "npx prisma migrate deploy && npm run start"
