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

## Despliegue en Vercel

El frontend se despliega desde la raiz del monorepo usando `vercel.json`.

Configuracion recomendada del proyecto en Vercel:

- Framework Preset: `Vite`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter @black-cell/web build`
- Output Directory: `apps/web/dist`

Dominio:

- Produccion: `blackcell.lat`
- Alias recomendado: `www.blackcell.lat`

Variables de entorno futuras:

- `VITE_API_URL`: URL publica de la API, por ejemplo `https://api.blackcell.lat`

## Produccion en VPS

El backend y PostgreSQL se ejecutan en el VPS con `docker-compose.prod.yml`.
PostgreSQL no expone puertos publicos; la API solo escucha en `127.0.0.1:3000` y Nginx publica `https://api.blackcell.lat`.

Variables requeridas en `/opt/blackcell/.env`:

```env
POSTGRES_USER=blackcell
POSTGRES_PASSWORD=password_seguro
POSTGRES_DB=blackcell

NODE_ENV=production
API_PORT=3000
CORS_ORIGIN=https://blackcell.lat
DATABASE_URL=postgresql://blackcell:password_seguro@postgres:5432/blackcell?schema=public
JWT_SECRET=jwt_secret_seguro_de_32_caracteres_o_mas
```

Comandos principales en el VPS:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api pnpm --filter @black-cell/database exec prisma migrate deploy
curl https://api.blackcell.lat/health
```

Para crear o actualizar el primer administrador:

```bash
docker compose -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL=admin@blackcell.lat \
  -e ADMIN_PASSWORD=password_temporal_seguro \
  -e ADMIN_NAME="Pedro Admin" \
  api pnpm --filter @black-cell/api seed:admin
```

## Backups

El script `scripts/backup-postgres.ps1` crea una copia comprimida de PostgreSQL desde la PC usando SSH:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-postgres.ps1
```

Por defecto guarda los archivos en `~/BlackCellBackups` y se conecta a `root@74.208.118.199`.
