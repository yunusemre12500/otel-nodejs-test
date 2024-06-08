ARG NODE_VERSION="20.14.0"

FROM node:${NODE_VERSION}-alpine3.19 AS base

WORKDIR /usr/src

ENV PNPM_HOME="/home/pnpm"

ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY . .

FROM base AS dependencies

RUN --mount=id=pnpm,target=${PNPM_HOME}/store,type=cache \
    pnpm install --prod --frozen-lockfile

FROM base AS build

RUN --mount=id=pnpm,target=${PNPM_HOME}/store,type=cache \
	pnpm run build

FROM gcr.io/distroless/nodejs22-debian12

ENV NODE_ENV="production"

COPY --from=build \
	/usr/src/dist /opt/app/dist

COPY --from=dependencies \
    /usr/src/node_modules /opt/app/node_modules

STOPSIGNAL SIGINT

CMD [ "/opt/app/dist/index.js" ]