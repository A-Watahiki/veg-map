# Dockerfile for veg-map-simple service
# Explicit container build for Cloud Run

# Base image with Node.js 20 LTS on Alpine for smaller footprint
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package definition and lockfile
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy rest of application source
COPY . .

# Expose port (Cloud Run expects the container to listen on $PORT)
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
