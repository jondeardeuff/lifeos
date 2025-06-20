# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy the railway-app directory
COPY railway-app/package.json ./
COPY railway-app/server.js ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]