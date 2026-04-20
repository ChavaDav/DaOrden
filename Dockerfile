# Imagen base de Node (usamos 20 que es más reciente)
FROM node:20-slim

# Instalar dependencias del sistema necesarias para compilar módulos nativos (como sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (esto compilará módulos nativos como sqlite3 desde fuente para evitar problemas de GLIBC)
RUN npm install --production --build-from-source && npm cache clean --force

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3005

# Comando de inicio
CMD ["node", "index.js"]
