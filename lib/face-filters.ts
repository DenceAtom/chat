import * as faceapi from "face-api.js"
import * as tf from "@tensorflow/tfjs"

// Define the filter types
export type FilterType =
  | "none"
  | "dog"
  | "cat"
  | "bunny"
  | "glasses"
  | "hat"
  | "crown"
  | "mustache"
  | "alien"
  | "zombie"
  | "heart"
  | "fire"
  | "rainbow"
  | "glitter"
  | "neon"
  | "pixelate"
  | "cartoon"
  | "comic"
  | "watercolor"
  | "oil-painting"
  | "cyberpunk"
  | "vaporwave"
  | "retro"
  | "glitch"
  | "3d-glasses"
  | "hologram"
  | "floating-hearts"
  | "floating-stars"
  | "mouth-laser"
  | "eye-laser"
  | "rainbow-tears"
  | "fire-breath"
  | "ice-breath"
  | "lightning-eyes"
  | "golden-crown"
  | "devil-horns"
  | "angel-halo"
  | "butterfly-lashes"
  | "diamond-tears"

// Make sure the FaceFilterType is exported
export type FaceFilterType =
  | "glasses"
  | "hat"
  | "mustache"
  | "dog"
  | "cat"
  | "bunny"
  | "rainbow"
  | "pixelate"
  | "blur"
  | "none"

// Ensure any other necessary exports are present
export interface FaceFilterOptions {
  type: FaceFilterType
  // Add any other properties needed for filters
}

// Face filter configuration interface
export interface FilterConfig {
  intensity: number
  animationSpeed: number
  glowColor?: string
  borderColor?: string
  particleColor?: string
  debug: boolean
}

// Advanced face filter manager with complex tracking capabilities
export class FaceFilterManager {
  private isModelLoaded = false
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private video: HTMLVideoElement | null = null
  private activeFilter: FilterType = "none"
  private filterImages: Record<string, HTMLImageElement> = {}
  private animationFrame: number | null = null
  private isProcessing = false
  private detectionInterval = 100 // ms between detections
  private lastDetectionTime = 0
  private detections: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[] = []

  // Advanced tracking properties
  private faceMeshPoints: number[][] = []
  private faceExpressions: faceapi.FaceExpressions | null = null
  private eyeOpenness: { left: number; right: number } = { left: 0, right: 0 }
  private mouthOpenness = 0
  private headPose: { pitch: number; yaw: number; roll: number } = { pitch: 0, yaw: 0, roll: number }
  private blinkDetection: { left: boolean; right: boolean } = { left: false, right: false }
  private smileDetection = false
  private frownDetection = false
  private surpriseDetection = false
  private angryDetection = false
  private neutralDetection = false
  private lastBlinkTime: { left: number; right: number } = { left: 0, right: 0 }
  private blinkCount: { left: number; right: number } = { left: 0, right: 0 }
  private lastSmileTime = 0
  private smileCount = 0
  private lastExpressionTime = 0
  private expressionHistory: string[] = []
  private facialFeatures: {
    eyebrows: { left: number[][]; right: number[][] }
    eyes: { left: number[][]; right: number[][] }
    nose: number[][]
    mouth: number[][]
    jawline: number[][]
  } = {
    eyebrows: { left: [], right: [] },
    eyes: { left: [], right: [] },
    nose: [],
    mouth: [],
    jawline: [],
  }

  // Filter customization properties
  private filterIntensity = 1.0
  private filterBlend = 0.75
  private filterSpeed = 1.0
  private filterColor = "#ff0000"
  private filterScale = 1.0
  private filterRotation = 0
  private filterOffset: { x: number; y: number } = { x: 0, y: 0 }
  private filterOpacity = 1.0
  private filterAnimationPhase = 0
  private filterLastUpdateTime = 0
  private filterAnimationFrameCount = 0
  private filterAnimationFrames: HTMLImageElement[] = []

  // Performance monitoring
  private fpsCounter = 0
  private lastFpsUpdateTime = 0
  private currentFps = 0
  private processingTimeHistory: number[] = []
  private averageProcessingTime = 0

  constructor() {
    this.loadFilterImages()
    this.initPerformanceMonitoring()
  }

  // Load the face detection models with advanced capabilities
  async loadModels(): Promise<void> {
    if (this.isModelLoaded) return

    try {
      // Load models from public directory with extended capabilities
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models")
      await faceapi.nets.faceExpressionNet.loadFromUri("/models")

      // Initialize TensorFlow.js
      await tf.ready()

      console.log("Face detection models loaded successfully with advanced capabilities")
      this.isModelLoaded = true
    } catch (error) {
      console.error("Error loading face detection models:", error)
      throw new Error("Failed to load face detection models")
    }
  }

  // Preload filter images with extended collection
  private loadFilterImages(): void {
    const filters = ["dog", "cat", "bunny", "glasses", "hat", "crown", "mustache", "alien", "zombie", "heart", "fire"]

    filters.forEach((filter) => {
      const img = new Image()
      img.src = `/filters/${filter}.png`
      img.crossOrigin = "anonymous"
      this.filterImages[filter] = img

      // Log when image is loaded
      img.onload = () => console.log(`Loaded filter image: ${filter}`)
      img.onerror = () => console.error(`Failed to load filter image: ${filter}`)
    })
  }

  // Initialize with video and canvas elements
  initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    this.video = video
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")

    // Set canvas dimensions to match video
    this.updateCanvasDimensions()

    console.log("Face filter manager initialized with advanced capabilities")
  }

  // Update canvas dimensions to match video
  updateCanvasDimensions(): void {
    if (!this.video || !this.canvas) return

    const { videoWidth, videoHeight } = this.video

    if (videoWidth && videoHeight) {
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight
      console.log(`Canvas dimensions set to ${videoWidth}x${videoHeight}`)
    }
  }

  // Set active filter with customization options
  setFilter(
    filterType: FilterType,
    options?: {
      intensity?: number
      blend?: number
      speed?: number
      color?: string
      scale?: number
      rotation?: number
      offset?: { x: number; y: number }
      opacity?: number
    },
  ): void {
    this.activeFilter = filterType
    console.log(`Active filter set to: ${filterType}`)

    // Apply customization options if provided
    if (options) {
      if (options.intensity !== undefined) this.filterIntensity = options.intensity
      if (options.blend !== undefined) this.filterBlend = options.blend
      if (options.speed !== undefined) this.filterSpeed = options.speed
      if (options.color !== undefined) this.filterColor = options.color
      if (options.scale !== undefined) this.filterScale = options.scale
      if (options.rotation !== undefined) this.filterRotation = options.rotation
      if (options.offset !== undefined) this.filterOffset = options.offset
      if (options.opacity !== undefined) this.filterOpacity = options.opacity
    }

    // If no filter, stop processing
    if (filterType === "none") {
      this.stopProcessing()

      // Clear canvas
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
    } else {
      // Start processing if not already
      if (!this.isProcessing) {
        this.startProcessing()
      }
    }
  }

  // Start face detection and filter application with advanced tracking
  async startProcessing(): Promise<void> {
    if (!this.video || !this.canvas || !this.ctx || this.isProcessing) return

    // Ensure models are loaded
    if (!this.isModelLoaded) {
      await this.loadModels()
    }

    this.isProcessing = true
    this.processFrame()
  }

  // Stop processing
  stopProcessing(): void {
    this.isProcessing = false

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  // Process video frame with advanced face tracking
  private processFrame = async (): Promise<void> => {
    if (!this.isProcessing || !this.video || !this.canvas || !this.ctx) {
      return
    }

    const now = performance.now()
    const processingStartTime = now

    // Update FPS counter
    this.fpsCounter++
    if (now - this.lastFpsUpdateTime > 1000) {
      this.currentFps = this.fpsCounter
      this.fpsCounter = 0
      this.lastFpsUpdateTime = now
    }

    // Only run face detection periodically to improve performance
    if (now - this.lastDetectionTime > this.detectionInterval) {
      try {
        // Detect faces with landmarks and expressions
        const detectionResults = await faceapi
          .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()

        this.detections = detectionResults

        // Extract facial expressions from the first face
        if (detectionResults.length > 0) {
          this.faceExpressions = detectionResults[0].expressions

          // Extract facial features for advanced tracking
          this.extractFacialFeatures(detectionResults[0].landmarks)

          // Detect blinks, smiles, and other expressions
          this.detectExpressions()
        }

        this.lastDetectionTime = now
      } catch (error) {
        console.error("Error detecting faces:", error)
      }
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw the video frame first
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)

    // Apply filter if faces detected
    if (this.detections.length > 0 && this.activeFilter !== "none") {
      this.applyFilter()
    }

    // Calculate processing time
    const processingTime = performance.now() - processingStartTime
    this.processingTimeHistory.push(processingTime)

    // Keep only the last 60 frames for average calculation
    if (this.processingTimeHistory.length > 60) {
      this.processingTimeHistory.shift()
    }

    // Calculate average processing time
    this.averageProcessingTime =
      this.processingTimeHistory.reduce((sum, time) => sum + time, 0) / this.processingTimeHistory.length

    // Continue processing
    this.animationFrame = requestAnimationFrame(this.processFrame)
  }

  // Initialize performance monitoring
  private initPerformanceMonitoring(): void {
    // Set up FPS counter
    this.lastFpsUpdateTime = performance.now()
  }

  // Extract facial features for advanced tracking
  private extractFacialFeatures(landmarks: faceapi.FaceLandmarks68): void {
    const positions = landmarks.positions

    // Extract eyebrows
    this.facialFeatures.eyebrows.left = positions.slice(17, 22).map((p) => [p.x, p.y])
    this.facialFeatures.eyebrows.right = positions.slice(22, 27).map((p) => [p.x, p.y])

    // Extract eyes
    this.facialFeatures.eyes.left = positions.slice(36, 42).map((p) => [p.x, p.y])
    this.facialFeatures.eyes.right = positions.slice(42, 48).map((p) => [p.x, p.y])

    // Extract nose
    this.facialFeatures.nose = positions.slice(27, 36).map((p) => [p.x, p.y])

    // Extract mouth
    this.facialFeatures.mouth = positions.slice(48, 68).map((p) => [p.x, p.y])

    // Extract jawline
    this.facialFeatures.jawline = positions.slice(0, 17).map((p) => [p.x, p.y])

    // Calculate eye openness
    const leftEyeTop = positions[37].y
    const leftEyeBottom = positions[41].y
    const rightEyeTop = positions[43].y
    const rightEyeBottom = positions[47].y

    this.eyeOpenness = {
      left: Math.abs(leftEyeTop - leftEyeBottom),
      right: Math.abs(rightEyeTop - rightEyeBottom),
    }

    // Calculate mouth openness
    const mouthTop = positions[62].y
    const mouthBottom = positions[66].y
    this.mouthOpenness = Math.abs(mouthTop - mouthBottom)

    // Calculate head pose (simplified)
    const leftEye = positions[36]
    const rightEye = positions[45]
    const nose = positions[30]

    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2))
    const eyeNoseDistance = Math.sqrt(
      Math.pow(nose.x - (leftEye.x + rightEye.x) / 2, 2) + Math.pow(nose.y - (leftEye.y + rightEye.y) / 2, 2),
    )

    this.headPose = {
      yaw: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
      pitch: eyeNoseDistance / eyeDistance,
      roll: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
    }
  }

  // Detect expressions like blinks, smiles, etc.
  private detectExpressions(): void {
    if (!this.faceExpressions) return

    const now = performance.now()

    // Detect blinks
    const blinkThreshold = 0.3
    const leftEyeRatio = this.eyeOpenness.left / (this.eyeOpenness.left + this.eyeOpenness.right)
    const rightEyeRatio = this.eyeOpenness.right / (this.eyeOpenness.left + this.eyeOpenness.right)

    const leftBlinking = leftEyeRatio < blinkThreshold
    const rightBlinking = rightEyeRatio < blinkThreshold

    // Count blinks
    if (leftBlinking && !this.blinkDetection.left) {
      this.blinkCount.left++
      this.lastBlinkTime.left = now
    }

    if (rightBlinking && !this.blinkDetection.right) {
      this.blinkCount.right++
      this.lastBlinkTime.right = now
    }

    this.blinkDetection = { left: leftBlinking, right: rightBlinking }

    // Detect smile
    const smileThreshold = 0.7
    const isSmiling = this.faceExpressions.happy > smileThreshold

    // Count smiles
    if (isSmiling && !this.smileDetection) {
      this.smileCount++
      this.lastSmileTime = now
    }

    this.smileDetection = isSmiling

    // Detect other expressions
    this.frownDetection = this.faceExpressions.sad > 0.7
    this.surpriseDetection = this.faceExpressions.surprised > 0.7
    this.angryDetection = this.faceExpressions.angry > 0.7
    this.neutralDetection = this.faceExpressions.neutral > 0.7

    // Track expression history
    if (now - this.lastExpressionTime > 1000) {
      // Update every second
      let currentExpression = "neutral"
      let maxScore = this.faceExpressions.neutral

      if (this.faceExpressions.happy > maxScore) {
        currentExpression = "happy"
        maxScore = this.faceExpressions.happy
      }

      if (this.faceExpressions.sad > maxScore) {
        currentExpression = "sad"
        maxScore = this.faceExpressions.sad
      }

      if (this.faceExpressions.angry > maxScore) {
        currentExpression = "angry"
        maxScore = this.faceExpressions.angry
      }

      if (this.faceExpressions.surprised > maxScore) {
        currentExpression = "surprised"
        maxScore = this.faceExpressions.surprised
      }

      if (this.faceExpressions.fearful > maxScore) {
        currentExpression = "fearful"
        maxScore = this.faceExpressions.fearful
      }

      if (this.faceExpressions.disgusted > maxScore) {
        currentExpression = "disgusted"
        maxScore = this.faceExpressions.disgusted
      }

      this.expressionHistory.push(currentExpression)
      if (this.expressionHistory.length > 10) {
        this.expressionHistory.shift()
      }

      this.lastExpressionTime = now
    }
  }

  // Update animation phase for animated filters
  private updateAnimationPhase(): void {
    const now = performance.now()
    const deltaTime = now - this.filterLastUpdateTime

    // Update animation phase based on speed
    this.filterAnimationPhase += deltaTime * 0.001 * this.filterSpeed

    // Keep phase between 0 and 1
    this.filterAnimationPhase = this.filterAnimationPhase % 1

    this.filterLastUpdateTime = now
    this.filterAnimationFrameCount++
  }

  // Apply the selected filter to detected faces
  private applyFilter(): void {
    if (!this.ctx || this.activeFilter === "none") return

    // Update animation phase for animated filters
    this.updateAnimationPhase()

    for (const detection of this.detections) {
      const { landmarks, detection: faceDetection } = detection
      const box = faceDetection.box

      // Apply the appropriate filter based on the active filter type
      switch (this.activeFilter) {
        case "dog":
          this.applyDogFilter(landmarks, box)
          break
        case "cat":
          this.applyCatFilter(landmarks, box)
          break
        case "bunny":
          this.applyBunnyFilter(landmarks, box)
          break
        case "glasses":
          this.applyGlassesFilter(landmarks, box)
          break
        case "hat":
          this.applyHatFilter(landmarks, box)
          break
        case "crown":
          this.applyCrownFilter(landmarks, box)
          break
        case "mustache":
          this.applyMustacheFilter(landmarks, box)
          break
        case "alien":
          this.applyAlienFilter(landmarks, box)
          break
        case "zombie":
          this.applyZombieFilter(landmarks, box)
          break
        case "heart":
          this.applyHeartFilter(landmarks, box)
          break
        case "fire":
          this.applyFireFilter(landmarks, box)
          break
        case "rainbow":
          this.applyRainbowFilter(landmarks, box)
          break
        case "glitter":
          this.applyGlitterFilter(landmarks, box)
          break
        case "neon":
          this.applyNeonFilter(landmarks, box)
          break
        case "pixelate":
          this.applyPixelateFilter(landmarks, box)
          break
        // Add more filter cases as needed
      }
    }
  }

  // Apply dog filter
  private applyDogFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["dog"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Get key facial points
    const nose = positions[30]
    const leftEye = positions[36]
    const rightEye = positions[45]
    const mouth = positions[57]

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.5 * this.filterScale

    // Draw dog filter (ears, nose, etc.)
    this.ctx.save()

    // Position at center of face, slightly above
    const centerX = (leftEye.x + rightEye.x) / 2 + this.filterOffset.x
    const centerY = leftEye.y - faceWidth * 0.3 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.filterRotation + this.headPose.roll)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()

    // Add animated tongue if mouth is open
    if (this.mouthOpenness > 20) {
      this.ctx.save()

      const tongueX = mouth.x
      const tongueY = mouth.y + 10

      // Make tongue move up and down
      const tongueOffset = Math.sin(this.filterAnimationPhase * Math.PI * 2) * 5

      this.ctx.translate(tongueX, tongueY)
      this.ctx.beginPath()
      this.ctx.moveTo(-10, 0)
      this.ctx.quadraticCurveTo(0, 20 + tongueOffset, 10, 0)
      this.ctx.fillStyle = "#ff7777"
      this.ctx.fill()

      this.ctx.restore()
    }
  }

  // Apply cat filter
  private applyCatFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["cat"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.5 * this.filterScale

    // Draw cat filter
    this.ctx.save()

    // Position at center of face, slightly above
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.2 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.filterRotation + this.headPose.roll)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()

    // Add whiskers that move with facial expressions
    this.ctx.save()

    const noseX = positions[30].x
    const noseY = positions[30].y
    const whiskerLength = faceWidth * 0.2

    // Whisker movement based on smile
    const whiskerAngleOffset = this.smileDetection ? 0.2 : 0

    // Left whiskers
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI * 0.75 - i * 0.15 + whiskerAngleOffset
      const startX = noseX - 5
      const startY = noseY + i * 3
      const endX = startX - Math.cos(angle) * whiskerLength
      const endY = startY - Math.sin(angle) * whiskerLength

      this.ctx.beginPath()
      this.ctx.moveTo(startX, startY)
      this.ctx.lineTo(endX, endY)
      this.ctx.strokeStyle = "black"
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    // Right whiskers
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI * 0.25 + i * 0.15 - whiskerAngleOffset
      const startX = noseX + 5
      const startY = noseY + i * 3
      const endX = startX + Math.cos(angle) * whiskerLength
      const endY = startY - Math.sin(angle) * whiskerLength

      this.ctx.beginPath()
      this.ctx.moveTo(startX, startY)
      this.ctx.lineTo(endX, endY)
      this.ctx.strokeStyle = "black"
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  // Apply bunny filter
  private applyBunnyFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["bunny"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.8 * this.filterScale

    // Draw bunny filter
    this.ctx.save()

    // Position at top of head
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.5 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.filterRotation + this.headPose.roll)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()

    // Add animated bunny nose
    this.ctx.save()

    const noseX = positions[30].x
    const noseY = positions[30].y

    // Make nose twitch
    const twitchOffset = Math.sin(this.filterAnimationPhase * Math.PI * 10) * 2

    this.ctx.translate(noseX + twitchOffset, noseY)
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2)
    this.ctx.fillStyle = "#ffaaaa"
    this.ctx.fill()

    this.ctx.restore()
  }

  // Apply glasses filter
  private applyGlassesFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["glasses"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Get eye positions
    const leftEye = positions[36]
    const rightEye = positions[45]

    // Calculate angle between eyes
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)

    // Calculate distance between eyes and scale
    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2))
    const scale = (eyeDistance / (img.width * 0.5)) * this.filterScale

    // Draw glasses
    this.ctx.save()

    // Position at center between eyes
    const centerX = (leftEye.x + rightEye.x) / 2 + this.filterOffset.x
    const centerY = (leftEye.y + rightEye.y) / 2 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(angle + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply hat filter
  private applyHatFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["hat"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.2 * this.filterScale

    // Draw hat
    this.ctx.save()

    // Position at top of head
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.6 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply crown filter
  private applyCrownFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["crown"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.2 * this.filterScale

    // Draw crown
    this.ctx.save()

    // Position at top of head
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.7 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()

    // Add sparkling effect to crown
    this.ctx.save()

    // Generate sparkles
    for (let i = 0; i < 5; i++) {
      const sparkleX = centerX + (Math.random() - 0.5) * faceWidth * 0.8
      const sparkleY = centerY + (Math.random() - 0.5) * faceWidth * 0.3
      const sparkleSize = 2 + Math.random() * 4

      // Sparkle animation
      const sparkleOpacity = Math.sin((this.filterAnimationPhase + i * 0.2) * Math.PI * 2) * 0.5 + 0.5

      // Draw sparkle
      this.ctx.beginPath()
      this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 255, 100, ${sparkleOpacity})`
      this.ctx.fill()
    }

    this.ctx.restore()
  }

  // Apply mustache filter
  private applyMustacheFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["mustache"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Get nose and mouth positions
    const nose = positions[33]
    const mouth = positions[57]

    // Calculate position between nose and mouth
    const centerX = nose.x + this.filterOffset.x
    const centerY = nose.y + (mouth.y - nose.y) * 0.4 + this.filterOffset.y

    // Calculate scale based on face width
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 0.6 * this.filterScale

    // Draw mustache
    this.ctx.save()
    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)
    this.ctx.restore()
  }

  // Apply alien filter
  private applyAlienFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["alien"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.8 * this.filterScale

    // Draw alien filter
    this.ctx.save()

    // Position at center of face, slightly above
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.3 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()

    // Add glowing eyes
    this.ctx.save()

    const leftEyeX = positions[37].x
    const leftEyeY = positions[37].y
    const rightEyeX = positions[44].x
    const rightEyeY = positions[44].y

    // Pulsating glow
    const glowIntensity = Math.sin(this.filterAnimationPhase * Math.PI * 2) * 0.3 + 0.7
    const glowSize = 5 + glowIntensity * 5

    // Create radial gradient for glow
    const leftGlow = this.ctx.createRadialGradient(leftEyeX, leftEyeY, 0, leftEyeX, leftEyeY, glowSize)
    leftGlow.addColorStop(0, `rgba(0, 255, 0, ${glowIntensity})`)
    leftGlow.addColorStop(1, "rgba(0, 255, 0, 0)")

    const rightGlow = this.ctx.createRadialGradient(rightEyeX, rightEyeY, 0, rightEyeX, rightEyeY, glowSize)
    rightGlow.addColorStop(0, `rgba(0, 255, 0, ${glowIntensity})`)
    rightGlow.addColorStop(1, "rgba(0, 255, 0, 0)")

    // Draw glowing eyes
    this.ctx.beginPath()
    this.ctx.arc(leftEyeX, leftEyeY, glowSize, 0, Math.PI * 2)
    this.ctx.fillStyle = leftGlow
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.arc(rightEyeX, rightEyeY, glowSize, 0, Math.PI * 2)
    this.ctx.fillStyle = rightGlow
    this.ctx.fill()

    this.ctx.restore()
  }

  // Apply zombie filter
  private applyZombieFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["zombie"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.5 * this.filterScale

    // Draw zombie filter
    this.ctx.save()

    // Position at center of face
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = (positions[36].y + positions[57].y) / 2 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply heart filter
  private applyHeartFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["heart"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Get eye positions
    const leftEye = positions[37]
    const rightEye = positions[44]

    // Calculate scale based on face width
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 0.5 * this.filterScale

    // Draw hearts over eyes
    this.ctx.save()

    // Left eye
    this.ctx.translate(leftEye.x + this.filterOffset.x, leftEye.y + this.filterOffset.y)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    // Right eye
    this.ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
    this.ctx.translate(rightEye.x + this.filterOffset.x, rightEye.y + this.filterOffset.y)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply fire filter
  private applyFireFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const img = this.filterImages["fire"]
    if (!img.complete) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.5 * this.filterScale

    // Draw fire on top of head
    this.ctx.save()

    // Position at top of head
    const centerX = (positions[36].x + positions[45].x) / 2 + this.filterOffset.x
    const centerY = positions[36].y - faceWidth * 0.5 + this.filterOffset.y

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.headPose.roll + this.filterRotation)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply rainbow filter
  private applyRainbowFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const positions = landmarks.positions

    // Calculate face width and position
    const faceWidth = box.width

    // Draw rainbow arc above head
    this.ctx.save()

    const headCenterX = (positions[36].x + positions[45].x) / 2
    const headTopY = positions[24].y - faceWidth * 0.3
    const rainbowWidth = faceWidth * 1.5
    const rainbowHeight = faceWidth * 0.8

    // Rainbow colors
    const colors = [
      "#ff0000", // Red
      "#ff9900", // Orange
      "#ffff00", // Yellow
      "#00ff00", // Green
      "#0099ff", // Blue
      "#6633ff", // Indigo
      "#ff00ff", // Violet
    ]

    // Draw rainbow arcs
    for (let i = 0; i < colors.length; i++) {
      const arcWidth = rainbowWidth * (1 - i * 0.1)
      const arcHeight = rainbowHeight * (1 - i * 0.1)
      const lineWidth = faceWidth * 0.05

      this.ctx.beginPath()
      this.ctx.ellipse(
        headCenterX + this.filterOffset.x,
        headTopY + this.filterOffset.y,
        arcWidth / 2,
        arcHeight / 2,
        0,
        Math.PI,
        0,
        true,
      )
      this.ctx.strokeStyle = colors[i]
      this.ctx.lineWidth = lineWidth
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  // Apply glitter filter
  private applyGlitterFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const positions = landmarks.positions

    // Calculate face dimensions
    const faceWidth = box.width
    const faceHeight = box.height
    const faceLeft = box.x
    const faceTop = box.y

    // Draw glitter particles around the face
    this.ctx.save()

    // Create glitter particles
    for (let i = 0; i < 50; i++) {
      // Calculate particle position
      const particlePhase = (this.filterAnimationPhase + i * 0.02) % 1
      const particleX = faceLeft + Math.random() * faceWidth
      const particleY = faceTop + Math.random() * faceHeight

      // Calculate particle size and opacity with animation
      const particleSize = faceWidth * 0.01 * (0.5 + Math.sin(this.filterAnimationPhase * Math.PI * 10 + i) * 0.5)
      const particleOpacity = 0.5 + Math.sin(this.filterAnimationPhase * Math.PI * 8 + i) * 0.5

      // Draw glitter particle
      this.ctx.beginPath()
      this.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2)

      // Random glitter colors
      const hue = Math.floor(Math.random() * 360)
      this.ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${particleOpacity * this.filterOpacity})`
      this.ctx.fill()
    }

    this.ctx.restore()
  }

  // Apply neon filter
  private applyNeonFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx) return

    const positions = landmarks.positions

    // Draw neon outline around face
    this.ctx.save()

    // Face outline points
    const outlinePoints = [
      ...positions.slice(0, 17), // Jawline
      ...positions.slice(17, 22), // Left eyebrow
      ...positions.slice(22, 27), // Right eyebrow
      ...positions.slice(27, 36), // Nose bridge and tip
      ...positions.slice(36, 42), // Left eye
      ...positions.slice(42, 48), // Right eye
      ...positions.slice(48, 60), // Outer lips
    ]

    // Neon glow effect
    const glowColor = this.filterColor || "#00ffff"
    const glowWidth = box.width * 0.01
    const glowIntensity = 0.7 + Math.sin(this.filterAnimationPhase * Math.PI * 2) * 0.3

    // Draw neon outline
    this.ctx.beginPath()
    this.ctx.moveTo(outlinePoints[0].x, outlinePoints[0].y)

    for (let i = 1; i < outlinePoints.length; i++) {
      this.ctx.lineTo(outlinePoints[i].x, outlinePoints[i].y)
    }

    this.ctx.closePath()
    this.ctx.strokeStyle = glowColor
    this.ctx.lineWidth = glowWidth
    this.ctx.globalAlpha = glowIntensity * this.filterOpacity
    this.ctx.stroke()

    // Add outer glow
    this.ctx.shadowColor = glowColor
    this.ctx.shadowBlur = glowWidth * 10
    this.ctx.stroke()

    this.ctx.restore()
  }

  // Apply pixelate filter
  private applyPixelateFilter(landmarks: faceapi.FaceLandmarks68, box: faceapi.Box): void {
    if (!this.ctx || !this.canvas || !this.video) return

    // Get face region
    const faceLeft = Math.max(0, box.x)
    const faceTop = Math.max(0, box.y)
    const faceWidth = Math.min(this.canvas.width - faceLeft, box.width)
    const faceHeight = Math.min(this.canvas.height - faceTop, box.height)

    // Skip if face is out of bounds
    if (faceWidth <= 0 || faceHeight <= 0) return

    // Get face image data
    const faceImageData = this.ctx.getImageData(faceLeft, faceTop, faceWidth, faceHeight)

    // Pixelation size (larger = more pixelated)
    const pixelSize = Math.max(2, Math.floor(faceWidth * 0.05 * this.filterIntensity))

    // Pixelate the face region
    for (let y = 0; y < faceHeight; y += pixelSize) {
      for (let x = 0; x < faceWidth; x += pixelSize) {
        // Get the color of the first pixel in the block
        const pixelIndex = (y * faceWidth + x) * 4
        const r = faceImageData.data[pixelIndex]
        const g = faceImageData.data[pixelIndex + 1]
        const b = faceImageData.data[pixelIndex + 2]

        // Fill the entire block with this color
        for (let blockY = 0; blockY < pixelSize && y + blockY < faceHeight; blockY++) {
          for (let blockX = 0; blockX < pixelSize && x + blockX < faceWidth; blockX++) {
            const blockIndex = ((y + blockY) * faceWidth + (x + blockX)) * 4
            faceImageData.data[blockIndex] = r
            faceImageData.data[blockIndex + 1] = g
            faceImageData.data[blockIndex + 2] = b
          }
        }
      }
    }

    // Put the pixelated image data back
    this.ctx.putImageData(faceImageData, faceLeft, faceTop)
  }

  // Clean up resources
  dispose(): void {
    this.stopProcessing()
    this.canvas = null
    this.ctx = null
    this.video = null
  }

  // Get performance stats
  getPerformanceStats(): { fps: number; processingTime: number } {
    return {
      fps: this.currentFps,
      processingTime: this.averageProcessingTime,
    }
  }
}

// Make sure any filter-related functions are exported
export function applyFaceFilter(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  filterType: FaceFilterType | null,
  landmarks?: any,
): void {
  // Implementation details
}

// Create and export a singleton instance
const faceFilterManager = new FaceFilterManager()
export default faceFilterManager

