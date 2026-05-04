# ============================================================
# OLYMP-ID — Dockerfile Backend Node.js
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copia package.json e installa le dipendenze
COPY package.json .
RUN npm install --production

# Copia il resto del codice
COPY src/ ./src/

EXPOSE 3000
EXPOSE 3001

CMD ["node", "src/index.js"]
