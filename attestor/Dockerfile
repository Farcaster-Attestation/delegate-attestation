FROM node:18-alpine As development

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

COPY --from=development /usr/src/app/node_modules ./node_modules

COPY . .

RUN yarn build

ENV NODE_ENV production

RUN yarn install --frozen-lockfile && yarn cache clean --force

FROM node:18-alpine AS production

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
COPY script/start.sh ./

CMD [ "sh", "start.sh" ]