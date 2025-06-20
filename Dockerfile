# Use Node.js 20 LTS
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps
COPY tools ./tools

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @lifeos/database db:generate

# Build all packages
RUN pnpm build

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Start the API server
CMD ["pnpm", "run", "start:api"]