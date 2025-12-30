# backend/Dockerfile

# Usamos Node 24, compatible con Prisma 7
FROM node:24-alpine
ARG ADMIN_PASS=admin123
ARG CORS_ORIGIN=http://localhost:5173
ARG DATABASE_URL=mysql://mysql:<REDACTED>@m8cccc4scogcoog8okw448s8:3306/default
ARG JWT_SECRET=kjashd8723hjkashd7823hjkasd.
ARG PORT=4000
ARG COOLIFY_URL=http://eog4k4ggokskssc00o4c0840.72.62.176.97.sslip.io
ARG COOLIFY_FQDN=eog4k4ggokskssc00o4c0840.72.62.176.97.sslip.io
ARG COOLIFY_BRANCH=main
ARG COOLIFY_RESOURCE_UUID=eog4k4ggokskssc00o4c0840

# Carpeta de trabajo
WORKDIR /app

# Copiamos sólo los package* primero para aprovechar la caché
COPY package*.json ./

# 🔴 ANTES: no instalaba devDependencies
# RUN npm ci --omit=dev

# 🟢 AHORA: instalamos también devDependencies (incluye @types/node)
RUN npm ci

# Copiamos el resto del código del backend
COPY . .

# Generamos el cliente de Prisma
RUN npx prisma generate

# Compilamos TypeScript
RUN npm run build

# Variables de entorno por defecto dentro del contenedor
ENV NODE_ENV=production
ENV PORT=4000

# Puerto que expone el contenedor
EXPOSE 4000

# Al arrancar el contenedor: aplicar migraciones y lanzar el servidor
CMD sh -c "npx prisma db push && npm run start"


