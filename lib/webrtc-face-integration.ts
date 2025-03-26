import type { OptimizedWebRTCService } from "./webrtc-optimized"
import { FaceFilterManager, FilterType } from "./face-filters"

/**
 * Integration class for WebRTC with face tracking and filters
 */
export class WebRTCFaceIntegration {
  private webrtcService: OptimizedWebRTCService
  private faceFilterManager: FaceFilterManager
  private localVideo: HTMLVideoElement | null = null
  private localCanvas: HTMLCanvasElement | null = null
  private remoteVideo: HTMLVideoElement | null = null
  private remoteCanvas: HTMLCanvasElement | null = null
  private isProcessingLocal = false
  private isProcessingRemote = false
  private usingLocalFilter = false
  private usingRemoteFilter = false

  constructor(webrtcService: OptimizedWebRTCService) {
    this.webrtcService = webrtcService
    this.faceFilterManager = new FaceFilterManager()
  }

  /**
   * Initialize integration
   */
  async initialize(
    localVideo: HTMLVideoElement,
    localCanvas: HTMLCanvasElement,
    remoteVideo: HTMLVideoElement,
    remoteCanvas: HTMLCanvasElement,
  ): Promise<boolean> {
    this.localVideo = localVideo
    this.localCanvas = localCanvas
    this.remoteVideo = remoteVideo
    this.remoteCanvas = remoteCanvas

    // Initialize the face filter manager
    const filterInitialized = await this.faceFilterManager.initialize(localVideo, localCanvas)
    if (!filterInitialized) {
      console.error("Failed to initialize face filter manager")
      return false
    }

    // Set up event listeners
    this.setupEventListeners()

    return true
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Handle WebRTC remote stream
    this.webrtcService.onRemoteStream((stream) => {
      if (this.remoteVideo) {
        this.remoteVideo.srcObject = stream

        // Start processing remote video for filters if needed
        if (this.usingRemoteFilter) {
          this.startRemoteFilters()
        }
      }
    })

    // Handle WebRTC disconnection
    this.webrtcService.onDisconnected(() => {
      this.stopRemoteFilters()
    })
  }

  /**
   * Start local face filters
   */
  startLocalFilters(filter: FilterType = FilterType.NONE): void {
    if (this.isProcessingLocal) {
      this.setLocalFilter(filter)
      return
    }

    this.isProcessingLocal = true
    this.usingLocalFilter = true

    // Set initial filter
    this.setLocalFilter(filter)

    // Start filter processing
    this.faceFilterManager.start()

    console.log("Started local face filters")
  }

  /**
   * Stop local face filters
   */
  stopLocalFilters(): void {
    if (!this.isProcessingLocal) return

    this.isProcessingLocal = false
    this.usingLocalFilter = false

    // Stop filter processing
    this.faceFilterManager.stop()

    console.log("Stopped local face filters")

    // Restore original video display
    if (this.localVideo && this.localCanvas) {
      const ctx = this.localCanvas.getContext("2d")
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, this.localCanvas.width, this.localCanvas.height)

        // Draw original video
        ctx.drawImage(this.localVideo, 0, 0, this.localCanvas.width, this.localCanvas.height)
      }
    }
  }

  /**
   * Set local filter type
   */
  setLocalFilter(filter: FilterType): void {
    if (!this.isProcessingLocal) {
      this.startLocalFilters(filter)
      return
    }

    this.faceFilterManager.setFilter(filter)
  }

  /**
   * Start remote face filters
   */
  startRemoteFilters(): void {
    if (this.isProcessingRemote || !this.remoteVideo || !this.remoteCanvas) return

    this.isProcessingRemote = true
    this.usingRemoteFilter = true

    // Create a separate filter manager for remote video
    // (Note: In a real app, you might want to create this on demand)
    const remoteFilterManager = new FaceFilterManager()

    // Initialize and start the remote filter manager
    remoteFilterManager
      .initialize(this.remoteVideo, this.remoteCanvas)
      .then((initialized) => {
        if (initialized) {
          remoteFilterManager.start()
          console.log("Started remote face filters")
        } else {
          console.error("Failed to initialize remote face filters")
          this.isProcessingRemote = false
          this.usingRemoteFilter = false
        }
      })
      .catch((error) => {
        console.error("Error starting remote face filters:", error)
        this.isProcessingRemote = false
        this.usingRemoteFilter = false
      })
  }

  /**
   * Stop remote face filters
   */
  stopRemoteFilters(): void {
    if (!this.isProcessingRemote) return

    this.isProcessingRemote = false
    this.usingRemoteFilter = false

    // Note: In a real app, you would stop and clean up the remote filter manager

    console.log("Stopped remote face filters")

    // Restore original video display
    if (this.remoteVideo && this.remoteCanvas) {
      const ctx = this.remoteCanvas.getContext("2d")
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, this.remoteCanvas.width, this.remoteCanvas.height)

        // Draw original video
        ctx.drawImage(this.remoteVideo, 0, 0, this.remoteCanvas.width, this.remoteCanvas.height)
      }
    }
  }

  /**
   * Toggle local filter debug mode
   */
  toggleDebugMode(enabled: boolean): void {
    this.faceFilterManager.configure({ debug: enabled })
  }

  /**
   * Configure local filters
   */
  configureFilters(intensity: number, animationSpeed: number): void {
    this.faceFilterManager.configure({
      intensity,
      animationSpeed,
    })
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopLocalFilters()
    this.stopRemoteFilters()
    this.faceFilterManager.cleanup()
  }
}

