CREATE TYPE "tipo_entidad_imagen" AS ENUM ('producto', 'reparacion');

CREATE TABLE "imagenes" (
  "id" TEXT NOT NULL,
  "entidad_tipo" "tipo_entidad_imagen" NOT NULL,
  "entidad_id" TEXT NOT NULL,
  "nombre_original" TEXT NOT NULL,
  "nombre_archivo" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "tamano_bytes" INTEGER NOT NULL,
  "ruta_archivo" TEXT NOT NULL,
  "es_principal" BOOLEAN NOT NULL DEFAULT false,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "imagenes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "imagenes_nombre_archivo_key" ON "imagenes"("nombre_archivo");
CREATE INDEX "imagenes_entidad_tipo_entidad_id_idx" ON "imagenes"("entidad_tipo", "entidad_id");
