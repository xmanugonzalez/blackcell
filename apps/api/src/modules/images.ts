import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import multer from 'multer'
import { prisma, TipoEntidadImagen, type Imagen } from '@black-cell/database'
import { imageEntityTypes, type EntityImage, type ImageEntityType } from '@black-cell/shared'
import { z } from 'zod'
import { env } from '../config/env.js'
import { getSessionUserId } from '../auth/session.js'
import { failure, success } from '../http/responses.js'

const maxImageSizeBytes = 5 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxImageSizeBytes,
    files: 8,
  },
})

const entityQuerySchema = z.object({
  entidad_tipo: z.enum(imageEntityTypes),
  entidad_id: z.string().trim().min(1).max(120),
})

const imageIdSchema = z.object({
  id: z.string().trim().min(1),
})

const entityTypeToDb: Record<ImageEntityType, TipoEntidadImagen> = {
  producto: TipoEntidadImagen.PRODUCTO,
  reparacion: TipoEntidadImagen.REPARACION,
  usuario: TipoEntidadImagen.USUARIO,
}

const entityTypeFromDb: Record<TipoEntidadImagen, ImageEntityType> = {
  [TipoEntidadImagen.PRODUCTO]: 'producto',
  [TipoEntidadImagen.REPARACION]: 'reparacion',
  [TipoEntidadImagen.USUARIO]: 'usuario',
}

function getPublicImageUrl(rutaArchivo: string) {
  return `/uploads/${rutaArchivo.split('/').map(encodeURIComponent).join('/')}`
}

function toEntityImage(image: Imagen): EntityImage {
  return {
    id: image.id,
    entityType: entityTypeFromDb[image.entidadTipo as TipoEntidadImagen],
    entityId: image.entidadId,
    originalName: image.nombreOriginal,
    fileName: image.nombreArchivo,
    mimeType: image.mimeType,
    sizeBytes: image.tamanoBytes,
    url: getPublicImageUrl(image.rutaArchivo),
    isPrimary: image.esPrincipal,
    order: image.orden,
    createdAt: image.creadoEn.toISOString(),
  }
}

function validateImage(file: Express.Multer.File) {
  const extension = path.extname(file.originalname).toLowerCase()

  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
    return 'Solo se permiten imágenes JPG, PNG o WebP.'
  }

  if (file.size > maxImageSizeBytes) {
    return 'Cada imagen debe pesar como máximo 5 MB.'
  }

  return null
}

function runUpload(request: Request, response: Response): Promise<Express.Multer.File[]> {
  return new Promise((resolve, reject) => {
    upload.array('imagenes', 8)(request, response, (error: unknown) => {
      if (error) {
        reject(error)
        return
      }

      resolve(Array.isArray(request.files) ? request.files : [])
    })
  })
}

function getMulterErrorMessage(error: unknown) {
  if (!(error instanceof multer.MulterError)) return null

  if (error.code === 'LIMIT_FILE_SIZE') return 'Cada imagen debe pesar como máximo 5 MB.'
  if (error.code === 'LIMIT_FILE_COUNT') return 'Puedes subir hasta 8 imágenes por vez.'

  return 'No se pudieron procesar las imágenes.'
}

function canManageImageEntity(request: Request, entityType: ImageEntityType, entityId: string) {
  return entityType !== 'usuario' || getSessionUserId(request) === entityId
}

async function removeStoredImages(images: Imagen[]) {
  await Promise.all(images.map((image) => (
    unlink(path.join(env.UPLOADS_DIR, image.rutaArchivo)).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  )))
}

export const imagesRouter: ExpressRouter = Router()

imagesRouter.get('/', async (request, response, next) => {
  try {
    const result = entityQuerySchema.safeParse(request.query)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Indica el tipo y el registro de las imágenes.'))
      return
    }

    if (!canManageImageEntity(request, result.data.entidad_tipo, result.data.entidad_id)) {
      response.status(403).json(failure('FORBIDDEN', 'No puedes acceder a estas imagenes.'))
      return
    }

    const images = await prisma.imagen.findMany({
      where: {
        entidadTipo: entityTypeToDb[result.data.entidad_tipo],
        entidadId: result.data.entidad_id,
      },
      orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
    })

    response.json(success(images.map(toEntityImage)))
  } catch (error) {
    next(error)
  }
})

imagesRouter.post('/', async (request, response, next) => {
  try {
    let files: Express.Multer.File[]

    try {
      files = await runUpload(request, response)
    } catch (error) {
      const message = getMulterErrorMessage(error)
      if (message) {
        response.status(400).json(failure('UPLOAD_ERROR', message))
        return
      }

      throw error
    }

    const result = entityQuerySchema.safeParse(request.body)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Indica el tipo y el registro de las imágenes.'))
      return
    }

    if (!files.length) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Selecciona al menos una imagen.'))
      return
    }

    if (result.data.entidad_tipo === 'usuario' && files.length > 1) {
      response.status(400).json(failure('VALIDATION_ERROR', 'El perfil solo puede tener una foto.'))
      return
    }

    if (!canManageImageEntity(request, result.data.entidad_tipo, result.data.entidad_id)) {
      response.status(403).json(failure('FORBIDDEN', 'No puedes modificar estas imagenes.'))
      return
    }

    const invalidFileMessage = files.map(validateImage).find(Boolean)
    if (invalidFileMessage) {
      response.status(400).json(failure('VALIDATION_ERROR', invalidFileMessage))
      return
    }

    const entityType = result.data.entidad_tipo
    const entityId = result.data.entidad_id
    const dbEntityType = entityTypeToDb[entityType]
    const directory = path.join(env.UPLOADS_DIR, entityType, entityId)
    await mkdir(directory, { recursive: true })

    const existingCount = await prisma.imagen.count({
      where: { entidadTipo: dbEntityType, entidadId: entityId },
    })
    const previousProfileImages = entityType === 'usuario'
      ? await prisma.imagen.findMany({ where: { entidadTipo: dbEntityType, entidadId: entityId } })
      : []

    const createdImages: Imagen[] = []

    for (const [index, file] of files.entries()) {
      const extension = path.extname(file.originalname).toLowerCase()
      const fileName = `${Date.now()}-${randomUUID()}${extension}`
      const relativePath = `${entityType}/${entityId}/${fileName}`
      const filePath = path.join(directory, fileName)
      await writeFile(filePath, file.buffer)

      const image = await prisma.imagen.create({
        data: {
          entidadTipo: dbEntityType,
          entidadId: entityId,
          nombreOriginal: file.originalname,
          nombreArchivo: fileName,
          mimeType: file.mimetype,
          tamanoBytes: file.size,
          rutaArchivo: relativePath,
          esPrincipal: entityType === 'usuario' || (existingCount === 0 && index === 0),
          orden: existingCount + index,
        },
      })

      createdImages.push(image)
    }

    if (previousProfileImages.length) {
      await prisma.imagen.deleteMany({
        where: { id: { in: previousProfileImages.map((image) => image.id) } },
      })
      await removeStoredImages(previousProfileImages)
    }

    response.status(201).json(success(createdImages.map(toEntityImage)))
  } catch (error) {
    next(error)
  }
})

imagesRouter.patch('/:id/principal', async (request, response, next) => {
  try {
    const { id } = imageIdSchema.parse(request.params)
    const image = await prisma.imagen.findUnique({ where: { id } })

    if (!image) {
      response.status(404).json(failure('NOT_FOUND', 'Imagen no encontrada.'))
      return
    }

    if (!canManageImageEntity(request, entityTypeFromDb[image.entidadTipo as TipoEntidadImagen], image.entidadId)) {
      response.status(403).json(failure('FORBIDDEN', 'No puedes modificar esta imagen.'))
      return
    }

    const updatedImage = await prisma.$transaction(async (transaction) => {
      await transaction.imagen.updateMany({
        where: {
          entidadTipo: image.entidadTipo,
          entidadId: image.entidadId,
        },
        data: { esPrincipal: false },
      })

      return transaction.imagen.update({
        where: { id },
        data: { esPrincipal: true },
      })
    })

    response.json(success(toEntityImage(updatedImage)))
  } catch (error) {
    next(error)
  }
})

imagesRouter.delete('/:id', async (request, response, next) => {
  try {
    const { id } = imageIdSchema.parse(request.params)
    const image = await prisma.imagen.findUnique({ where: { id } })

    if (!image) {
      response.status(404).json(failure('NOT_FOUND', 'Imagen no encontrada.'))
      return
    }

    if (!canManageImageEntity(request, entityTypeFromDb[image.entidadTipo as TipoEntidadImagen], image.entidadId)) {
      response.status(403).json(failure('FORBIDDEN', 'No puedes eliminar esta imagen.'))
      return
    }

    await prisma.imagen.delete({ where: { id } })

    await removeStoredImages([image])

    if (image.esPrincipal) {
      const nextPrimaryImage = await prisma.imagen.findFirst({
        where: {
          entidadTipo: image.entidadTipo,
          entidadId: image.entidadId,
        },
        orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
      })

      if (nextPrimaryImage) {
        await prisma.imagen.update({
          where: { id: nextPrimaryImage.id },
          data: { esPrincipal: true },
        })
      }
    }

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})
