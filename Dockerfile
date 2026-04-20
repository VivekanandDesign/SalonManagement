FROM node:20-alpine AS builder

WORKDIR /app

COPY salon-backend/package*.json ./
RUN npm ci --omit=dev

COPY salon-backend/prisma ./prisma/
COPY salon-backend/prisma.config.ts ./
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY salon-backend/package*.json ./
COPY salon-backend/src ./src/

RUN addgroup -g 1001 -S nodejs && adduser -S orrenza -u 1001
USER orrenza

EXPOSE 4000

CMD ["npm", "run", "start"]

CMD ["node", "src/index.js"]
