FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for node-gyp / native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
