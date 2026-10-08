# ==========================================================================
# MAJARRA COMMUNITY CENTER - PRODUCTION DOCKERFILE
# ==========================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to start Express Backend
CMD ["node", "server.js"]
