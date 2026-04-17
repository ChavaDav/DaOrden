# Imagen base de Node
FROM node:18-slim

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3005

# Comando de inicio
CMD ["node", "index.js"]
