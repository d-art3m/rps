import * as ort from 'onnxruntime-web'
import type { GestureClass, ModelMetadata, Prediction } from '../types'
import { softmax } from './preprocess'

const MODEL_URL = '/models/rps_cnn.onnx'
const METADATA_URL = '/models/rps_cnn_metadata.json'

let sessionPromise: Promise<ort.InferenceSession> | null = null
let metadataPromise: Promise<ModelMetadata> | null = null

export async function loadMetadata(): Promise<ModelMetadata> {
  if (!metadataPromise) {
    metadataPromise = fetch(METADATA_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to load model metadata.')
      }
      return response.json() as Promise<ModelMetadata>
    })
  }
  return metadataPromise
}

export async function loadModel(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/'

    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
  }
  return sessionPromise
}

export async function predict(
  session: ort.InferenceSession,
  metadata: ModelMetadata,
  input: Float32Array,
): Promise<Prediction> {
  const { img_size: size, class_names: classNames } = metadata
  const tensor = new ort.Tensor('float32', input, [1, 3, size, size])
  const result = await session.run({ input: tensor })
  const logits = result.logits.data as Float32Array
  const probabilitiesArray = softmax(logits)

  const probabilities = {} as Record<GestureClass, number>
  classNames.forEach((label, index) => {
    probabilities[label] = probabilitiesArray[index] ?? 0
  })

  let bestLabel = classNames[0]
  let bestConfidence = probabilitiesArray[0] ?? 0

  classNames.forEach((label, index) => {
    const confidence = probabilitiesArray[index] ?? 0
    if (confidence > bestConfidence) {
      bestConfidence = confidence
      bestLabel = label
    }
  })

  return {
    label: bestLabel,
    confidence: bestConfidence,
    probabilities,
  }
}
