FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
# React scripts (vite/cra) usually default to 3000 or 5173. 
# Match-Me client package.json likely has "start" script.
# If Vite, usually 5173. If CRA, 3000.
# Assuming standard React setup from previous context (Create React App).

CMD ["npm", "run", "dev", "--", "--host"]
