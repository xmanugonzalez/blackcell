CREATE TYPE "tipo_cliente" AS ENUM ('regular', 'frecuente', 'empresa');
CREATE TYPE "estado_cliente" AS ENUM ('activo', 'vip', 'inactivo');

CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "ciudad" TEXT NOT NULL DEFAULT '',
    "tipo" "tipo_cliente" NOT NULL DEFAULT 'regular',
    "estado" "estado_cliente" NOT NULL DEFAULT 'activo',
    "equipo_reciente" TEXT NOT NULL DEFAULT '',
    "notas" TEXT NOT NULL DEFAULT '',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clientes_nombre_idx" ON "clientes"("nombre");
CREATE INDEX "clientes_documento_idx" ON "clientes"("documento");
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");
