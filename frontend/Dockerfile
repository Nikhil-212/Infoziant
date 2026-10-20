# Frontend Dockerfile — multi-stage build
#
# Stage 1 (build): Install dependencies and produce a Vite production build.
# Stage 2 (runtime): Copy only the built assets into an Nginx image.
# node_modules and dev tooling never appear in the final image.

# ---- Stage 1: Build ----
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies reproducibly before copying source
# (separate layer — only rebuilt when package files change)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
# Produces /app/dist

# ---- Stage 2: Runtime ----
FROM nginx:1.27-alpine AS runtime

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled React app
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our Nginx configuration (replaces the default config)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Nginx runs in the foreground by default in official image
CMD ["nginx", "-g", "daemon off;"]
