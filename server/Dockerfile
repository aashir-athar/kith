# Build context is the repo root so we can copy the sibling ../shared package that the server
# imports as @kith/shared (file:../shared).

FROM node:24-alpine

WORKDIR /app
# shared is a self-contained package (its own @noble + zod); install its deps first.
COPY shared ./shared
RUN cd shared && npm install

COPY server/package.json ./server/package.json
WORKDIR /app/server
RUN npm install

COPY server ./

EXPOSE 8787
# Apply migrations, then start the relay. Migrations are generated + committed under drizzle/.
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
