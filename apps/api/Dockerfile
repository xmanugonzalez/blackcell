FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/database packages/database
COPY packages/shared packages/shared
RUN pnpm --filter @black-cell/database prisma:generate
RUN pnpm --filter @black-cell/api build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/database/package.json packages/database/package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/database packages/database
COPY --from=build /app/packages/shared packages/shared

EXPOSE 3000
CMD ["pnpm", "--filter", "@black-cell/api", "start"]
