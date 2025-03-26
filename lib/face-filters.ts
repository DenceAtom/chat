import * as faceapi from "face-api.js"

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

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
  private detections: any[] = []

  // Advanced tracking properties
  private faceMeshPoints: number[][] = []
  private faceExpressions: any | null = null
  private eyeOpenness: { left: number; right: number } = { left: 0, right: 0 }
  private mouthOpenness = 0
  private headPose: { pitch: number; yaw: number; roll: number } = { pitch: 0, yaw: 0, roll: 0 }
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
    if (isBrowser) {
      this.initPerformanceMonitoring()
      // Don't try to load filter images immediately - we'll do it on demand
    }
  }

  // Load the face detection models with advanced capabilities
  async loadModels(): Promise<void> {
    if (!isBrowser) return Promise.resolve()
    if (this.isModelLoaded) return Promise.resolve()

    try {
      // Load models from public directory with extended capabilities
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models")
      await faceapi.nets.faceExpressionNet.loadFromUri("/models")

      // Initialize TensorFlow.js
      if (typeof window !== "undefined") {
        const tf = await import("@tensorflow/tfjs")
        await tf.ready()
      }

      console.log("Face detection models loaded successfully with advanced capabilities")
      this.isModelLoaded = true
      return Promise.resolve()
    } catch (error) {
      console.error("Error loading face detection models:", error)
      return Promise.reject(new Error("Failed to load face detection models"))
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
    if (!isBrowser) return

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
      // Load the filter image if needed
      this.loadFilterImage(filterType)

      // Start processing if not already
      if (!this.isProcessing) {
        this.startProcessing()
      }
    }
  }

  // Load a specific filter image on demand
  private loadFilterImage(filterType: FilterType): void {
    if (
      !isBrowser ||
      filterType === "none" ||
      filterType === "rainbow" ||
      filterType === "glitter" ||
      filterType === "neon" ||
      filterType === "pixelate"
    ) {
      return // These filters don't need images or are already loaded
    }

    // Check if we already have this image
    if (this.filterImages[filterType] && this.filterImages[filterType].complete) {
      return
    }

    // Create a placeholder image for now
    const img = new Image()
    img.crossOrigin = "anonymous"

    // Try to load the actual filter image
    img.src = `/filters/${filterType}.png`

    // Handle loading errors by using a colored rectangle as fallback
    img.onerror = () => {
      console.warn(`Failed to load filter image: ${filterType}`)

      // Create a canvas to generate a placeholder image
      const canvas = document.createElement("canvas")
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Draw a colored rectangle based on filter type
        switch (filterType) {
          case "dog":
            ctx.fillStyle = "#8B4513" // Brown
            break
          case "cat":
            ctx.fillStyle = "#FFA500" // Orange
            break
          case "bunny":
            ctx.fillStyle = "#FFB6C1" // Pink
            break
          case "glasses":
            ctx.fillStyle = "#000000" // Black
            break
          case "hat":
            ctx.fillStyle = "#00008B" // Dark blue
            break
          case "crown":
            ctx.fillStyle = "#FFD700" // Gold
            break
          case "mustache":
            ctx.fillStyle = "#000000" // Black
            break
          default:
            ctx.fillStyle = "#FF0000" // Red
        }

        ctx.fillRect(0, 0, 100, 100)

        // Use the canvas as the image source
        img.src = canvas.toDataURL()
      }
    }

    this.filterImages[filterType] = img
  }

  // Initialize with video and canvas elements
  initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (!isBrowser) return

    this.video = video
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")

    // Set canvas dimensions to match video
    this.updateCanvasDimensions()

    console.log("Face filter manager initialized with advanced capabilities")
  }

  // Update canvas dimensions to match video
  updateCanvasDimensions(): void {
    if (!isBrowser || !this.video || !this.canvas) return

    const { videoWidth, videoHeight } = this.video

    if (videoWidth && videoHeight) {
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight
      console.log(`Canvas dimensions set to ${videoWidth}x${videoHeight}`)
    }
  }

  // Start face detection and filter application with advanced tracking
  async startProcessing(): Promise<void> {
    if (!isBrowser || !this.video || !this.canvas || !this.ctx || this.isProcessing) return

    // Ensure models are loaded
    if (!this.isModelLoaded) {
      await this.loadModels()
    }

    this.isProcessing = true
    this.processFrame()
  }

  // Stop processing
  stopProcessing(): void {
    if (!isBrowser) return

    this.isProcessing = false

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  // Process video frame with advanced face tracking
  private processFrame = async (): Promise<void> => {
    if (!isBrowser || !this.isProcessing || !this.video || !this.canvas || !this.ctx) {
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
    if (!isBrowser) return

    // Set up FPS counter
    this.lastFpsUpdateTime = performance.now()
  }

  // Extract facial features for advanced tracking
  private extractFacialFeatures(landmarks: any): void {
    if (!isBrowser) return

    const positions = landmarks.positions

    // Extract eyebrows
    this.facialFeatures.eyebrows.left = positions.slice(17, 22).map((p: any) => [p.x, p.y])
    this.facialFeatures.eyebrows.right = positions.slice(22, 27).map((p: any) => [p.x, p.y])

    // Extract eyes
    this.facialFeatures.eyes.left = positions.slice(36, 42).map((p: any) => [p.x, p.y])
    this.facialFeatures.eyes.right = positions.slice(42, 48).map((p: any) => [p.x, p.y])

    // Extract nose
    this.facialFeatures.nose = positions.slice(27, 36).map((p: any) => [p.x, p.y])

    // Extract mouth
    this.facialFeatures.mouth = positions.slice(48, 68).map((p: any) => [p.x, p.y])

    // Extract jawline
    this.facialFeatures.jawline = positions.slice(0, 17).map((p: any) => [p.x, p.y])

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
    if (!isBrowser || !this.faceExpressions) return

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
    if (!isBrowser) return

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
    if (!isBrowser || !this.ctx || this.activeFilter === "none") return

    // Update animation phase for animated filters
    this.updateAnimationPhase()

    for (const detection of this.detections) {
      const { landmarks, detection: faceDetection } = detection
      const box = faceDetection.box

      // Apply the appropriate filter based on the active filter type
      switch (this.activeFilter) {
        case "dog":
        case "cat":
        case "bunny":
        case "glasses":
        case "hat":
        case "crown":
        case "mustache":
        case "alien":
        case "zombie":
        case "heart":
        case "fire":
          this.applyImageFilter(this.activeFilter, landmarks, box)
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

  // Apply image-based filter (dog, cat, glasses, etc.)
  private applyImageFilter(filterType: FilterType, landmarks: any, box: any): void {
    if (!isBrowser || !this.ctx) return

    const img = this.filterImages[filterType]
    if (!img || !img.complete) return

    const positions = landmarks.positions

    // Get key facial points
    const nose = positions[30]
    const leftEye = positions[36]
    const rightEye = positions[45]
    const mouth = positions[57]

    // Calculate face width and position
    const faceWidth = box.width
    const scale = (faceWidth / img.width) * 1.5 * this.filterScale

    // Draw filter
    this.ctx.save()

    // Position based on filter type
    let centerX, centerY

    switch (filterType) {
      case "glasses":
        // Position at center between eyes
        centerX = (leftEye.x + rightEye.x) / 2 + this.filterOffset.x
        centerY = (leftEye.y + rightEye.y) / 2 + this.filterOffset.y
        break
      case "mustache":
        // Position between nose and mouth
        centerX = nose.x + this.filterOffset.x
        centerY = nose.y + (mouth.y - nose.y) * 0.4 + this.filterOffset.y
        break
      case "hat":
      case "crown":
        // Position at top of head
        centerX = (leftEye.x + rightEye.x) / 2 + this.filterOffset.x
        centerY = leftEye.y - faceWidth * 0.6 + this.filterOffset.y
        break
      default:
        // Default position at center of face, slightly above
        centerX = (leftEye.x + rightEye.x) / 2 + this.filterOffset.x
        centerY = leftEye.y - faceWidth * 0.3 + this.filterOffset.y
    }

    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.filterRotation + this.headPose.roll)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = this.filterOpacity
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2)

    this.ctx.restore()
  }

  // Apply rainbow filter
  private applyRainbowFilter(landmarks: any, box: any): void {
    if (!isBrowser || !this.ctx) return

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
  private applyGlitterFilter(landmarks: any, box: any): void {
    if (!isBrowser || !this.ctx) return

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
  private applyNeonFilter(landmarks: any, box: any): void {
    if (!isBrowser || !this.ctx) return

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
  private applyPixelateFilter(landmarks: any, box: any): void {
    if (!isBrowser || !this.ctx || !this.canvas || !this.video) return

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
    if (!isBrowser) return

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

