FROM node:22.23.4-alpine

WORKDIR /app
COPY ./package.json /app
RUN npm install