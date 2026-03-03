FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY . .

EXPOSE 8080

CMD ["serve", ".", "-l", "8080", "-s"]
