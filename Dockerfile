# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy all files
COPY . .

# Expose port
EXPOSE 4000

# Make start script executable
RUN chmod +x start.sh

# Start the server
CMD ["./start.sh"]