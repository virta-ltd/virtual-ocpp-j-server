FROM node:12.19-alpine

WORKDIR /app

COPY . .

RUN npm install

# Compile
RUN npm run build

EXPOSE 8080

CMD [ "npm", "run", "start:prod" ]
