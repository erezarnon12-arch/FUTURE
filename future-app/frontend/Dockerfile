FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
COPY node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
