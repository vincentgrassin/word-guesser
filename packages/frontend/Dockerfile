# Use the official Node.js image
FROM node:18-alpine

# Set build-time argument for environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and pnpm-lock.yaml files
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Build the shared package
RUN pnpm --filter @word-guesser/shared build

# Install frontend dependencies using pnpm
RUN NODE_ENV=development pnpm  install

# Copy the entire frontend project into the container
COPY . .

# Build the frontend for production if in production mode
RUN if [ "$NODE_ENV" != "development" ]; then pnpm build; fi
RUN if [ "$NODE_ENV" != "development" ]; then pnpm prune --prod; fi

# Expose the port that Vue 3 app will run on (default is 8080 or 5173)
EXPOSE 5173

# Run the Vue development server (assuming it's using Vite)
CMD [ "sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then pnpm dev; else pnpm preview; fi" ]