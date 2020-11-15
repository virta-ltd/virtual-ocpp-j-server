FROM node:14.15.0-alpine3.10 as base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base as build
RUN npm run build
CMD ["node", "dist/main.js"]