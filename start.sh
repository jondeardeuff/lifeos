#!/bin/sh

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the server
echo "Starting server..."
node server.js