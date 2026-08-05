import type { GestureClass } from './gesture'

export interface ModelMetadata {
  class_names: GestureClass[]
  class_to_idx: Record<GestureClass, number>
  img_size: number
  normalization: {
    mean: [number, number, number]
    std: [number, number, number]
  }
  test_accuracy: number
  best_val_accuracy: number
}

export interface Prediction {
  label: GestureClass
  confidence: number
  probabilities: Record<GestureClass, number>
}
