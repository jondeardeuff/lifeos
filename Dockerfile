# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production

# Copy the server file
COPY server.js ./

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]