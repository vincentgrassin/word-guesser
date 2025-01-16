# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set build-time argument for environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}


# Set the working directory in the container
WORKDIR /app

# Copy the package.json and pnpm-lock.yaml files
COPY package.json pnpm-lock.yaml ./
RUN NODE_ENV=development pnpm install 

# Install pnpm globally
RUN npm install -g pnpm

# Copy the rest of the backend code
COPY . .

# Install dependencies for the backend only
RUN NODE_ENV=development pnpm install --filter backend
RUN if [ "$NODE_ENV" != "development" ]; then pnpm build; fi
RUN if [ "$NODE_ENV" != "development" ]; then pnpm prune --prod; fi



# Expose the port that Fastify is listening on
EXPOSE 3000

# Command to run the backend server
CMD [ "sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then pnpm dev; else pnpm start; fi" ]