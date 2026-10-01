# Build stage: compile the Vite/React app into static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite env vars are baked in at build time
ARG VITE_FINANCE_API_URL
ENV VITE_FINANCE_API_URL=${VITE_FINANCE_API_URL}
RUN npm run build

# Serve stage: static assets served by Nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
