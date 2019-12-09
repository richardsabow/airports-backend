FROM node:10-slim

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Copy app dependencies
COPY src ./src/
COPY *.json ./
COPY index.js .

# Install app dependencies & build source & clean dev deps
RUN npm i
RUN npm run build
RUN rm -fR /app/src && rm -f tslint.json tsconfig.json
RUN npm prune --production

CMD [ "npm", "start" ]
