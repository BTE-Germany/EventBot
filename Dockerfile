# syntax=docker/dockerfile:1

FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "./"]

RUN npm install --production
RUN npx prisma generate

COPY . .

CMD ["node", "server.js"]
