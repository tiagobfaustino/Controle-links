FROM node:22-alpine AS web-build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM alpine:latest

ARG PB_VERSION=0.38.1

RUN apk add --no-cache unzip ca-certificates wget

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY --from=web-build /app/dist /pb/pb_public

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks", "--publicDir=/pb/pb_public"]
