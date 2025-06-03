ARG NODE_VERSION="22.14.0"

FROM node:${NODE_VERSION}-alpine3.21 AS base

WORKDIR /usr/src

ENV PNPM_HOME="$HOME/.pnpm"

ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY . .

FROM base AS dependencies

RUN --mount=id=dependencies,target=${PNPM_HOME}/store,type=cache \
  pnpm install --frozen-lockfile

FROM dependencies AS build

RUN pnpm run build

FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /opt/app

ENV NODE_ENV="production"

COPY --from=build --link \
	/usr/src/dist /opt/app/dist

COPY --from=build --link \
    /usr/src/node_modules /opt/app/node_modules

COPY --from=build --link \
    /usr/src/package.json /opt/app/package.json

CMD [ "/opt/app/dist/index.js" ]
