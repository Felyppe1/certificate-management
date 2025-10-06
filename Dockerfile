# Use a Node.js base image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Cloud Run will use
EXPOSE 8080

# Start the Next.js server in production mode
CMD ["npm", "run", "start"]