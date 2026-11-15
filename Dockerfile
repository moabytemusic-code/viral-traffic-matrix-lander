FROM node:22-alpine

WORKDIR /app

# Install curl/wget for healthchecks
RUN apk add --no-cache curl wget

COPY package.json ./
COPY . ./

ENV NODE_ENV=production
ENV PORT=3000
ENV WEBINAR_ADMIN_TOKEN=adm_prod_vtm_8f92a3c719e04b6a8d2e1c5f3b7a9e0d
ENV WEBINAR_SESSION_SECRET=sec_prod_vtm_4c6e8a0b2d1f9e3a7c5b8d0e2f4a6c8e

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=3s --retries=3 \
  CMD curl -f -s http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
