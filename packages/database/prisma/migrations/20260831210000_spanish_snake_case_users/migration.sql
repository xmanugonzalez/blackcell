-- Rename the existing initial user schema to Spanish snake_case database names.
ALTER TYPE "UserRole" RENAME TO "rol_usuario";

ALTER TYPE "rol_usuario" RENAME VALUE 'ADMIN' TO 'administrador';
ALTER TYPE "rol_usuario" RENAME VALUE 'MANAGER' TO 'gerente';
ALTER TYPE "rol_usuario" RENAME VALUE 'TECHNICIAN' TO 'tecnico';
ALTER TYPE "rol_usuario" RENAME VALUE 'CASHIER' TO 'cajero';

ALTER TABLE "User" RENAME TO "usuarios";
ALTER TABLE "usuarios" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "usuarios" RENAME COLUMN "passwordHash" TO "contrasena_hash";
ALTER TABLE "usuarios" RENAME COLUMN "role" TO "rol";
ALTER TABLE "usuarios" RENAME COLUMN "isActive" TO "activo";
ALTER TABLE "usuarios" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "usuarios" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "usuarios" RENAME CONSTRAINT "User_pkey" TO "usuarios_pkey";
ALTER INDEX "User_email_key" RENAME TO "usuarios_email_key";
ALTER TABLE "usuarios" ALTER COLUMN "rol" SET DEFAULT 'cajero';
