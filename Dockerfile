FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js nfb-client.js render-lander.js offers.json index.html launchpad.html ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
