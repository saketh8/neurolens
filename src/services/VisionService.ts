/**
 * VisionService - Real-time object detection and scene understanding
 * Uses TensorFlow Lite with optimized models for Arm architecture
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distance?: number; // estimated distance in meters
}

export interface SceneAnalysis {
  objects: DetectedObject[];
  dominantColors: string[];
  sceneType: string; // 'indoor', 'outdoor', 'street', etc.
  lightingCondition: string; // 'bright', 'dim', 'dark'
  timestamp: number;
}

class VisionService {
  private model: tf.GraphModel | null = null;
  private _isInitialized = false;
  // Use a valid TFJS graph model URL (SSD MobileNet V2)
  private readonly MODEL_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2_owt/model.json';

  public isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Initialize the vision model
   * Downloads and prepares the TensorFlow Lite model optimized for Arm
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      console.log('Initializing Vision Service...');

      // Wait for TensorFlow to be ready
      await tf.ready();

      // Load the object detection model
      this.model = await tf.loadGraphModel(this.MODEL_URL);

      // Warm up the model with a dummy tensor
      const dummyInput = tf.zeros([1, 300, 300, 3], 'int32');
      await this.model.predict(dummyInput);
      dummyInput.dispose();

      this._isInitialized = true;
      console.log('Vision Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Vision Service:', error);
      throw new Error('Vision Service initialization failed');
    }
  }

  /**
   * Process a camera frame and detect objects
   * @param imageBase64 - Base64 encoded image string
   * @returns Scene analysis with detected objects
   */
  async analyzeScene(imageBase64: string): Promise<SceneAnalysis> {
    if (!this._isInitialized || !this.model) {
      throw new Error('Vision Service not initialized');
    }

    try {
      // Decode base64 to Uint8Array
      const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

      // Decode JPEG to tensor
      const imageTensor = decodeJpeg(imageBuffer);

      // Resize and preprocess
      const inputTensor = tf.image.resizeBilinear(imageTensor, [300, 300])
        .expandDims(0)
        .toInt(); // SSD MobileNet expects int32 [0, 255]

      // Run inference
      const result = await this.model.executeAsync(inputTensor) as tf.Tensor[];

      // Process predictions (SSD MobileNet V2 output structure)
      // result[0]: detection_scores
      // result[1]: detection_classes
      // result[2]: number of detections
      // result[3]: detection_boxes
      const objects = await this.processPredictions(result);

      // Analyze scene characteristics
      const sceneType = this.determineSceneType(objects);
      const lightingCondition = await this.analyzeLighting(imageTensor);
      const dominantColors = await this.extractDominantColors(imageTensor);

      // Cleanup tensors
      imageTensor.dispose();
      inputTensor.dispose();
      result.forEach(t => t.dispose());

      return {
        objects,
        dominantColors,
        sceneType,
        lightingCondition,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Scene analysis failed:', error);
      throw error;
    }
  }

  /**
   * Process model predictions into detected objects
   */
  private async processPredictions(predictions: tf.Tensor[]): Promise<DetectedObject[]> {
    // SSD MobileNet V2 OWT output indices might vary, usually:
    // 0: detection_boxes
    // 1: detection_scores
    // 2: detection_classes
    // 3: num_detections
    // We need to check shapes or rely on standard order. 
    // For 'ssd_mobilenet_v2_owt':
    // Tensor 0: detection_boxes [1, 1917, 4]
    // Tensor 1: detection_scores [1, 1917]
    // Tensor 2: detection_classes [1, 1917]

    // Let's assume standard order or find by shape
    const scoresTensor = predictions.find(t => t.shape.length === 2 && t.shape[1] > 100); // [1, N]
    const boxesTensor = predictions.find(t => t.shape.length === 3 && t.shape[2] === 4); // [1, N, 4]
    const classesTensor = predictions.find(t => t.shape.length === 2 && t.shape[1] > 100 && t !== scoresTensor); // [1, N]

    if (!scoresTensor || !boxesTensor || !classesTensor) {
      console.warn('Unexpected model output shapes');
      return [];
    }

    const scores = await scoresTensor.data();
    const boxes = await boxesTensor.data();
    const classes = await classesTensor.data();

    const detectedObjects: DetectedObject[] = [];
    const confidenceThreshold = 0.5;

    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > confidenceThreshold) {
        const [y1, x1, y2, x2] = [
          boxes[i * 4],
          boxes[i * 4 + 1],
          boxes[i * 4 + 2],
          boxes[i * 4 + 3],
        ];

        detectedObjects.push({
          label: this.getClassLabel(classes[i]),
          confidence: scores[i],
          boundingBox: {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
          },
          distance: this.estimateDistance(y2 - y1),
        });
      }
    }

    return detectedObjects;
  }

  /**
   * Estimate distance to object based on bounding box size
   */
  private estimateDistance(objectHeight: number): number {
    const focalLength = 600;
    const realHeight = 1.7;

    if (objectHeight === 0) return 10;

    return (realHeight * focalLength) / (objectHeight * 300);
  }

  /**
   * Determine scene type based on detected objects
   */
  private determineSceneType(objects: DetectedObject[]): string {
    const labels = objects.map(obj => obj.label.toLowerCase());

    if (labels.some(l => ['car', 'traffic light', 'street sign'].includes(l))) {
      return 'street';
    }
    if (labels.some(l => ['tree', 'bench', 'bicycle'].includes(l))) {
      return 'outdoor';
    }
    if (labels.some(l => ['chair', 'table', 'couch'].includes(l))) {
      return 'indoor';
    }

    return 'unknown';
  }

  /**
   * Analyze lighting conditions
   */
  private async analyzeLighting(imageTensor: tf.Tensor): Promise<string> {
    const meanBrightness = await imageTensor.mean().data();
    const brightness = meanBrightness[0] / 255.0; // Normalize if not already

    if (brightness > 0.7) return 'bright';
    if (brightness > 0.3) return 'moderate';
    return 'dim';
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(imageTensor: tf.Tensor): Promise<string[]> {
    const rgbMean = await imageTensor.mean([0, 1]).data(); // Mean across height and width

    const r = Math.round(rgbMean[0]);
    const g = Math.round(rgbMean[1]);
    const b = Math.round(rgbMean[2]);

    return [`rgb(${r}, ${g}, ${b})`];
  }

  /**
   * Get human-readable label for class ID
   */
  private getClassLabel(classId: number): string {
    const cocoLabels = [
      'unknown', 'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'street sign', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
      'giraffe', 'hat', 'backpack', 'umbrella', 'shoe', 'eye glasses', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
      'skateboard', 'surfboard', 'tennis racket', 'bottle', 'plate', 'wine glass', 'cup',
      'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
      'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
      'potted plant', 'bed', 'mirror', 'dining table', 'window', 'desk', 'toilet', 'door', 'tv', 'laptop', 'mouse',
      'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'blender', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
      'toothbrush', 'hair brush'
    ];

    return cocoLabels[Math.floor(classId)] || 'unknown';
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this._isInitialized = false;
  }
}

export default new VisionService();
