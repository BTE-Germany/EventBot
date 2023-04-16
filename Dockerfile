# syntax=docker/dockerfile:1

FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "./"]

RUN npm install --production
RUN npx prisma generate

COPY . .
EXPOSE 6969

CMD ["/bin/bash", "-c", "npx prisma migrate deploy;node index.js"]
