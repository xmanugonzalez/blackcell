# BlackCell Manager

Sistema interno para gestion de reparaciones, ventas, inventario, caja y reportes de BlackCell.

## Stack

- Monorepo con pnpm workspaces
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod y Lucide React
- Backend: Node.js, TypeScript, Express, Zod, Helmet, CORS y Argon2
- Base de datos: PostgreSQL con Prisma
- Infraestructura: Docker Compose y Nginx

## Estructura

- `apps/web`: aplicacion web
- `apps/api`: API HTTP
- `packages/database`: Prisma y cliente de base de datos
- `packages/shared`: tipos y utilidades compartidas

## Primer arranque local

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear `.env` desde `.env.example` y levantar PostgreSQL:

```bash
docker compose up -d postgres
```

3. Generar Prisma y crear la primera migracion:

```bash
pnpm db:generate
pnpm db:migrate --name init
```

4. Levantar frontend y API:

```bash
pnpm dev
```

La web corre en `http://localhost:5173` y la API en `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
