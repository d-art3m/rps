import type { ModelMetadata } from '../types'

export function preprocessFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
  metadata: ModelMetadata,
  mirror = true,
): Float32Array {
  const { img_size: size, normalization } = metadata
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const sourceWidth = 'videoWidth' in source ? source.videoWidth : width
  const sourceHeight = 'videoHeight' in source ? source.videoHeight : height
  const cropSize = Math.min(sourceWidth, sourceHeight)
  const sx = (sourceWidth - cropSize) / 2
  const sy = (sourceHeight - cropSize) / 2

  ctx.save()
  if (mirror) {
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
  }

  ctx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, size, size)
  ctx.restore()

  const { data } = ctx.getImageData(0, 0, size, size)
  const tensor = new Float32Array(3 * size * size)
  const pixelCount = size * size
  const [meanR, meanG, meanB] = normalization.mean
  const [stdR, stdG, stdB] = normalization.std

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4
    const r = data[offset] / 255
    const g = data[offset + 1] / 255
    const b = data[offset + 2] / 255

    tensor[i] = (r - meanR) / stdR
    tensor[pixelCount + i] = (g - meanG) / stdG
    tensor[2 * pixelCount + i] = (b - meanB) / stdB
  }

  return tensor
}

export function softmax(logits: Float32Array): number[] {
  const max = Math.max(...logits)
  const exps = Array.from(logits, (value) => Math.exp(value - max))
  const sum = exps.reduce((acc, value) => acc + value, 0)
  return exps.map((value) => value / sum)
}
