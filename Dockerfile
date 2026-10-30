FROM node:20-alpine
LABEL io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/muse-marketplace"
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN npm run build || true
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["mcp"]
