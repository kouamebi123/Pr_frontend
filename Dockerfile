FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json server.js index.html ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.js"]
