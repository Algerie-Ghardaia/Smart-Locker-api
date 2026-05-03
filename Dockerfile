# ============================================
# Étape 1 : Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json yarn.lock ./

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN yarn install --frozen-lockfile

# Copier le reste du code source
COPY . .

# Builder le projet NestJS
RUN yarn build

# ============================================
# Étape 2 : Production
# ============================================
FROM node:20-alpine

WORKDIR /app

# Copier uniquement ce qui est nécessaire en production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Lancer NestJS en production
CMD ["node", "--max-old-space-size=400", "dist/main"]