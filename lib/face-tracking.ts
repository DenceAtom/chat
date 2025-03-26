import * as tf from "@tensorflow/tfjs"
import * as faceapi from "face-api.js"

// Face detection result interface
export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

// 3D point interface
export interface Point3D {
  x: number
  y: number
  z?: number
}

// Face landmarks interface
export interface FaceLandmarks {
  points: Point3D[]
  leftEye: Point3D[]
  rightEye: Point3D[]
  nose: Point3D[]
  mouth: Point3D[]
  jawline: Point3D[]
}

// Face detection result interface
export interface FaceDetection {
  faceBox: FaceBox | null
  landmarks: FaceLandmarks | null
  expressions: Record<string, number> | null
  rotationAngles?: { pitch: number; yaw: number; roll: number }
}

// Performance stats interface
export interface PerformanceStats {
  fps: number
  processingTime: number
}

// Face tracking service class
export class FaceTrackingService {
  private isInitialized = false
  private isModelLoaded = false
  private faceDetectionModel: any = null
  private faceMeshModel: any = null
  private lastDetection: FaceDetection | null = null
  private debugMode = false
  private faceDetectedCallbacks: ((face: FaceDetection) => void)[] = []
  private faceLostCallbacks: (() => void)[] = []
  private performanceUpdateCallbacks: ((stats: PerformanceStats) => void)[] = []
  private frameCount = 0
  private lastFpsUpdateTime = 0
  private currentFps = 0
  private processingTimeHistory: number[] = []
  private averageProcessingTime = 0
  private frameSkipCount = 0
  private maxFrameSkip = 2 // Skip every N frames for performance
  private detectionConfidence = 0.8
  private trackingConfidence = 0.75
  private maxFaces = 1

  // Initialize face tracking
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // Initialize TensorFlow.js
      await tf.ready()

      // Set backend to WebGL for better performance
      await tf.setBackend("webgl")

      // Load face-api.js models
      await this.loadFaceApiModels()

      // Initialize performance monitoring
      this.initPerformanceMonitoring()

      this.isInitialized = true
      console.log("Face tracking service initialized")
      return true
    } catch (error) {
      console.error("Error initializing face tracking service:", error)
      return false
    }
  }

  // Load face-api.js models
  private async loadFaceApiModels(): Promise<void> {
    if (this.isModelLoaded) return

    try {
      // Load models from public directory
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
      await faceapi.nets.faceExpressionNet.loadFromUri("/models")

      console.log("Face detection models loaded successfully")
      this.isModelLoaded = true
    } catch (error) {
      console.error("Error loading face detection models:", error)
      throw new Error("Failed to load face detection models")
    }
  }

  // Initialize performance monitoring
  private initPerformanceMonitoring(): void {
    this.lastFpsUpdateTime = performance.now()
  }

  // Process video frame
  async processFrame(videoElement: HTMLVideoElement): Promise<FaceDetection | null> {
    if (!this.isInitialized || !this.isModelLoaded) {
      console.warn("Face tracking service not initialized")
      return null
    }

    // Skip frames for performance
    this.frameSkipCount = (this.frameSkipCount + 1) % (this.maxFrameSkip + 1)
    if (this.frameSkipCount !== 0 && this.lastDetection) {
      return this.lastDetection
    }

    const processingStartTime = performance.now()

    try {
      // Update FPS counter
      this.frameCount++
      const now = performance.now()
      if (now - this.lastFpsUpdateTime > 1000) {
        this.currentFps = this.frameCount
        this.frameCount = 0
        this.lastFpsUpdateTime = now
      }

      // Detect faces with landmarks and expressions
      const detectionResults = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: this.detectionConfidence,
          }),
        )
        .withFaceLandmarks()
        .withFaceExpressions()

      // Process detection results
      if (detectionResults.length > 0) {
        const detection = detectionResults[0]
        const faceBox: FaceBox = {
          x: detection.detection.box.x,
          y: detection.detection.box.y,
          width: detection.detection.box.width,
          height: detection.detection.box.height,
        }

        // Process landmarks
        const landmarks = this.processFaceLandmarks(detection.landmarks)

        // Create face detection result
        const faceDetection: FaceDetection = {
          faceBox,
          landmarks,
          expressions: detection.expressions,
          rotationAngles: this.estimateHeadPose(landmarks),
        }

        // Notify face detected
        this.notifyFaceDetected(faceDetection)

        // Update last detection
        this.lastDetection = faceDetection

        // Calculate processing time
        const processingTime = performance.now() - processingStartTime
        this.updateProcessingTime(processingTime)

        // Adjust frame skip based on performance
        this.adjustFrameSkip(processingTime)

        return faceDetection
      } else {
        // No face detected
        if (this.lastDetection) {
          this.notifyFaceLost()
          this.lastDetection = null
        }

        return null
      }
    } catch (error) {
      console.error("Error processing video frame:", error)
      return this.lastDetection
    }
  }

  // Process face landmarks
  private processFaceLandmarks(landmarks: faceapi.FaceLandmarks68): FaceLandmarks {
    const points = landmarks.positions.map((p) => ({ x: p.x, y: p.y }))

    return {
      points,
      leftEye: points.slice(36, 42),
      rightEye: points.slice(42, 48),
      nose: points.slice(27, 36),
      mouth: points.slice(48, 68),
      jawline: points.slice(0, 17),
    }
  }

  // Estimate head pose from landmarks
  private estimateHeadPose(landmarks: FaceLandmarks): { pitch: number; yaw: number; roll: number } {
    if (!landmarks || landmarks.points.length === 0) {
      return { pitch: 0, yaw: 0, roll: 0 }
    }

    // Get key points
    const leftEye = landmarks.leftEye[0]
    const rightEye = landmarks.rightEye[0]
    const nose = landmarks.nose[0]

    // Calculate eye distance
    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2))

    // Calculate eye-nose distance
    const eyeNoseDistance = Math.sqrt(
      Math.pow(nose.x - (leftEye.x + rightEye.x) / 2, 2) + Math.pow(nose.y - (leftEye.y + rightEye.y) / 2, 2),
    )

    // Estimate head pose (simplified)
    return {
      yaw: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
      pitch: eyeNoseDistance / eyeDistance,
      roll: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
    }
  }

  // Update processing time
  private updateProcessingTime(processingTime: number): void {
    this.processingTimeHistory.push(processingTime)

    // Keep only the last 30 frames for average calculation
    if (this.processingTimeHistory.length > 30) {
      this.processingTimeHistory.shift()
    }

    // Calculate average processing time
    this.averageProcessingTime =
      this.processingTimeHistory.reduce((sum, time) => sum + time, 0) / this.processingTimeHistory.length

    // Notify performance update
    this.notifyPerformanceUpdate({
      fps: this.currentFps,
      processingTime: this.averageProcessingTime,
    })
  }

  // Adjust frame skip based on performance
  private adjustFrameSkip(processingTime: number): void {
    // Adjust frame skip based on processing time
    if (processingTime > 33) {
      // More than 30fps
      this.maxFrameSkip = Math.min(5, this.maxFrameSkip + 1)
    } else if (processingTime < 16 && this.maxFrameSkip > 0) {
      // Less than 60fps
      this.maxFrameSkip = Math.max(0, this.maxFrameSkip - 1)
    }
  }

  // Set debug mode
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
  }

  // Register face detected callback
  onFaceDetected(callback: (face: FaceDetection) => void): void {
    this.faceDetectedCallbacks.push(callback)
  }

  // Register face lost callback
  onFaceLost(callback: () => void): void {
    this.faceLostCallbacks.push(callback)
  }

  // Register performance update callback
  onPerformanceUpdate(callback: (stats: PerformanceStats) => void): void {
    this.performanceUpdateCallbacks.push(callback)
  }

  // Notify face detected
  private notifyFaceDetected(face: FaceDetection): void {
    for (const callback of this.faceDetectedCallbacks) {
      callback(face)
    }
  }

  // Notify face lost
  private notifyFaceLost(): void {
    for (const callback of this.faceLostCallbacks) {
      callback()
    }
  }

  // Notify performance update
  private notifyPerformanceUpdate(stats: PerformanceStats): void {
    for (const callback of this.performanceUpdateCallbacks) {
      callback(stats)
    }
  }

  // Clean up resources
  dispose(): void {
    this.faceDetectedCallbacks = []
    this.faceLostCallbacks = []
    this.performanceUpdateCallbacks = []
    this.lastDetection = null
    this.isInitialized = false
  }

  // Get performance stats
  getPerformanceStats(): PerformanceStats {
    return {
      fps: this.currentFps,
      processingTime: this.averageProcessingTime,
    }
  }
}

