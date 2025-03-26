import type { SignalingService } from "./signaling-service"
import { ICE_SERVERS, DEBUG_MODE } from "./config"

// Import the client database service instead of the server one
import clientDatabaseService from "./client-database-service"
import { v4 as uuidv4 } from "uuid"
import sharedStateService from "./shared-state"

// Advanced WebRTC service with optimized performance
export class OptimizedWebRTCService {
  // Core WebRTC components
  public peerConnection: RTCPeerConnection | null = null
  public localStream: MediaStream | null = null
  private dataChannel: RTCDataChannel | null = null
  private signalingService: SignalingService

  // Connection state tracking
  private isInitiator = false
  private isConnecting = false
  private isReconnecting = false
  private hasSentOffer = false
  private isExpectingAnswer = false
  private currentPeerId: string | null = null
  private currentCallId: string | null = null
  private waitingForMatch = false
  private connectionAttemptCount = 0
  private userInitiatedStop = false
  private connectionTimeout: NodeJS.Timeout | null = null

  // Advanced connection management
  private recentlySkippedPeers: Set<string> = new Set()
  private skippedPeerTimeout = 1000 // 1 second cooldown before reconnecting to skipped peer
  private maxConnectionAttempts = 5 // Maximum number of consecutive connection attempts before resetting
  private reconnectBackoffTime = 1000 // Base reconnect time in ms
  private maxReconnectBackoffTime = 30000 // Maximum reconnect time in ms
  private currentReconnectBackoffTime = 1000 // Current reconnect time (increases with failures)
  private reconnectAttempts = 0 // Number of reconnect attempts
  private maxReconnectAttempts = 10 // Maximum number of reconnect attempts

  // Media constraints and configuration
  private videoConstraints: MediaStreamConstraints = {
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  }
  private audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
  private videoCodecPreferences: RTCRtpCodecCapability[] = [
    { mimeType: "video/VP9" },
    { mimeType: "video/VP8" },
    { mimeType: "video/H264" },
    { mimeType: "video/AV1" },
  ]

  // User preferences and matching
  private preferences: any = {}
  private currentPeerPreferences: any = null
  private matchingCriteria: string[] = ["country", "userGender", "preferredGender", "interests"]
  private matchingWeights: Record<string, number> = {
    country: 3,
    userGender: 2,
    preferredGender: 2,
    interests: 4,
  }

  // Performance monitoring
  private connectionQualityMetrics = {
    packetsLost: 0,
    packetsReceived: 0,
    bytesReceived: 0,
    bytesSent: 0,
    roundTripTime: 0,
    jitter: 0,
    framerate: 0,
    resolution: { width: 0, height: 0 },
    bandwidth: 0,
    latency: 0,
  }
  private statsInterval: NodeJS.Timeout | null = null
  private statsIntervalTime = 2000 // 2 seconds

  // Heartbeat and connection health
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null
  private lastHeartbeatResponse = 0
  private heartbeatMissedCount = 0
  private maxHeartbeatMissed = 3

  // Callbacks
  private onConnectedCallback: () => void = () => {}
  private onDisconnectedCallback: (reason?: string) => void = () => {}
  private onRemoteStreamCallback: (stream: MediaStream) => void = () => {}
  private onMessageCallback: (message: string) => void = () => {}
  private onConnectionStatusCallback: (status: string) => void = () => {}
  private onErrorCallback: (error: string) => void = () => {}
  private onMatchFoundCallback: (peerId: string, peerPreferences: any) => void = () => {}
  private onConnectionQualityCallback: (metrics: any) => void = () => {}
  private onNetworkChangeCallback: (online: boolean) => void = () => {}

  // Advanced features
  private transceivers: RTCRtpTransceiver[] = []
  private encodingParameters: RTCRtpEncodingParameters[] = [
    { maxBitrate: 1000000, priority: "high" },
    { maxBitrate: 500000, priority: "medium", scaleResolutionDownBy: 2 },
    { maxBitrate: 250000, priority: "low", scaleResolutionDownBy: 4 },
  ]
  private adaptiveStreamingEnabled = true
  private bandwidthEstimator: BandwidthEstimator | null = null

  constructor(signalingService: SignalingService) {
    this.signalingService = signalingService
    this.setupSignalingListeners()
    this.setupNetworkListeners()
    this.setupHeartbeat()
    this.bandwidthEstimator = new BandwidthEstimator()
  }

  // Set up signaling listeners with enhanced error handling and logging
  private setupSignalingListeners() {
    // Listen for signaling messages
    this.signalingService.onMessage((type, data) => {
      if (DEBUG_MODE) console.log(`Received signaling message: ${type}`, data)

      try {
        switch (type) {
          case "find-match":
            this.handleFindMatch(data.senderId, data.preferences)
            break
          case "match-request":
            this.handleMatchRequest(data.senderId, data.preferences)
            break
          case "match-response":
            this.handleMatchResponse(data.senderId, data.accepted, data.preferences)
            break
          case "match-found":
            this.handleMatchFound(data.senderId, data.isInitiator, data.peerPreferences)
            break
          case "offer":
            this.handleOffer(data.offer, data.senderId)
            break
          case "answer":
            this.handleAnswer(data.answer)
            break
          case "ice-candidate":
            this.handleIceCandidate(data.candidate)
            break
          case "disconnect":
            this.handlePeerDisconnected(data.reason)
            break
          case "error":
            this.onErrorCallback(data.message)
            break
          case "heartbeat":
            // Respond to heartbeat to confirm we're still active
            if (data.senderId && data.senderId !== this.signalingService.getClientId()) {
              this.signalingService.sendDirectMessage(data.senderId, "heartbeat-response", {
                timestamp: Date.now(),
              })
            }
            break
          case "heartbeat-response":
            this.handleHeartbeatResponse(data)
            break
          case "bandwidth-estimation":
            this.handleBandwidthEstimation(data)
            break
          case "connection-stats":
            this.handleConnectionStats(data)
            break
          case "media-constraints-change":
            this.handleMediaConstraintsChange(data)
            break
          case "codec-preferences-change":
            this.handleCodecPreferencesChange(data)
            break
          default:
            if (DEBUG_MODE) console.log(`Unknown message type: ${type}`)
        }
      } catch (error) {
        console.error(`Error handling signaling message of type ${type}:`, error)
        this.onErrorCallback(
          `Error processing ${type} message: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }

  // Set up network change listeners
  private setupNetworkListeners() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.handleNetworkChange(true)
      })

      window.addEventListener("offline", () => {
        this.handleNetworkChange(false)
      })
    }
  }

  // Handle network changes
  private handleNetworkChange(online: boolean) {
    if (DEBUG_MODE) console.log(`Network status changed: ${online ? "online" : "offline"}`)

    this.onNetworkChangeCallback(online)

    if (!online) {
      // Network is offline, mark connection as unstable
      this.onConnectionStatusCallback("network-offline")

      // If we're in a call, notify the UI but don't disconnect yet
      if (this.isConnected()) {
        this.onConnectionStatusCallback("connection-unstable")
      }
    } else {
      // Network is back online
      this.onConnectionStatusCallback("network-online")

      // If we were in a call, check connection
      if (this.isConnected()) {
        this.checkConnectionAfterNetworkChange()
      }
    }
  }

  // Check connection after network change
  private async checkConnectionAfterNetworkChange() {
    if (!this.peerConnection) return

    // Check ICE connection state
    const connectionState = this.peerConnection.iceConnectionState

    if (connectionState === "disconnected" || connectionState === "failed" || connectionState === "closed") {
      // Connection is broken, try to reconnect
      this.onConnectionStatusCallback("reconnecting-after-network-change")

      // Try to restart ICE
      try {
        if (this.isInitiator && this.peerConnection.signalingState === "stable") {
          // Create and send a new offer with ICE restart
          const offer = await this.peerConnection.createOffer({ iceRestart: true })
          await this.peerConnection.setLocalDescription(offer)

          if (this.currentPeerId) {
            this.signalingService.sendDirectMessage(this.currentPeerId, "offer", {
              offer: this.peerConnection.localDescription,
            })
          }
        }
      } catch (error) {
        console.error("Error restarting ICE after network change:", error)
        // If ICE restart fails, disconnect and let the auto-reconnect handle it
        this.handlePeerDisconnected("network-change-failed")
      }
    }
  }

  // Set up heartbeat mechanism
  private setupHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Set up a new heartbeat every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      const clientId = this.signalingService.getClientId()
      if (clientId) {
        // Update the user's last seen time
        clientDatabaseService.updateUser(clientId, {
          lastSeen: new Date().toISOString(),
        })

        // If connected to a peer, send a heartbeat
        if (this.currentPeerId && this.isConnected()) {
          this.sendHeartbeat()
        }
      }
    }, 10000) // Every 10 seconds
  }

  // Send heartbeat to peer
  private sendHeartbeat() {
    if (!this.currentPeerId) return

    // Clear previous timeout if exists
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }

    // Send heartbeat via signaling
    this.signalingService.sendDirectMessage(this.currentPeerId, "heartbeat", {
      timestamp: Date.now(),
    })

    // Also try to send via data channel if available
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      try {
        this.dataChannel.send(
          JSON.stringify({
            type: "heartbeat",
            timestamp: Date.now(),
          }),
        )
      } catch (e) {
        console.error("Error sending heartbeat via data channel:", e)
      }
    }

    // Set timeout for response
    this.heartbeatTimeout = setTimeout(() => {
      this.handleMissedHeartbeat()
    }, 5000) // 5 second timeout
  }

  // Handle heartbeat response
  private handleHeartbeatResponse(data: any) {
    // Clear timeout since we got a response
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }

    this.lastHeartbeatResponse = Date.now()
    this.heartbeatMissedCount = 0

    // Calculate round trip time if timestamp was included
    if (data.timestamp) {
      const rtt = Date.now() - data.timestamp
      this.connectionQualityMetrics.roundTripTime = rtt
      this.connectionQualityMetrics.latency = rtt / 2 // Approximate latency as half of RTT

      if (DEBUG_MODE) console.log(`Heartbeat RTT: ${rtt}ms`)
    }
  }

  // Handle missed heartbeat
  private handleMissedHeartbeat() {
    this.heartbeatMissedCount++

    if (DEBUG_MODE) console.log(`Missed heartbeat: ${this.heartbeatMissedCount}/${this.maxHeartbeatMissed}`)

    if (this.heartbeatMissedCount >= this.maxHeartbeatMissed) {
      // Too many missed heartbeats, consider connection lost
      if (DEBUG_MODE) console.log("Too many missed heartbeats, disconnecting")
      this.handlePeerDisconnected("heartbeat-timeout")
    } else {
      // Try again
      this.sendHeartbeat()
    }
  }

  // Initialize media with advanced constraints
  async initializeMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream
      }

      // Use provided constraints or default
      const effectiveConstraints = constraints || this.videoConstraints

      if (DEBUG_MODE) console.log("Requesting media with constraints:", effectiveConstraints)

      const stream = await navigator.mediaDevices.getUserMedia(effectiveConstraints)

      // Apply audio constraints to audio tracks
      stream.getAudioTracks().forEach((track) => {
        try {
          track
            .applyConstraints(this.audioConstraints)
            .catch((e) => console.error("Error applying audio constraints:", e))
        } catch (e) {
          console.error("Error applying audio constraints:", e)
        }
      })

      this.localStream = stream

      // Log media info
      if (DEBUG_MODE) {
        const videoTrack = stream.getVideoTracks()[0]
        const audioTrack = stream.getAudioTracks()[0]

        if (videoTrack) {
          console.log("Video track:", videoTrack.label, "enabled:", videoTrack.enabled)
          console.log("Video settings:", videoTrack.getSettings())
        }

        if (audioTrack) {
          console.log("Audio track:", audioTrack.label, "enabled:", audioTrack.enabled)
          console.log("Audio settings:", audioTrack.getSettings())
        }
      }

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      this.onErrorCallback(
        "Could not access camera or microphone: " + (error instanceof Error ? error.message : String(error)),
      )
      throw error
    }
  }

  // Register user preferences with enhanced matching
  register(preferences: any) {
    this.preferences = preferences
    if (DEBUG_MODE) console.log("Registered preferences:", preferences)

    // Normalize preferences for better matching
    this.normalizePreferences()
  }

  // Normalize preferences for better matching
  private normalizePreferences() {
    // Ensure all expected fields exist
    if (!this.preferences.interests) {
      this.preferences.interests = []
    }

    // Convert interests to lowercase for case-insensitive matching
    if (Array.isArray(this.preferences.interests)) {
      this.preferences.interests = this.preferences.interests.map((interest: string) => interest.toLowerCase().trim())
    }

    // Ensure gender preferences are normalized
    if (this.preferences.userGender) {
      this.preferences.userGender = this.preferences.userGender.toLowerCase()
    }

    if (this.preferences.preferredGender) {
      this.preferences.preferredGender = this.preferences.preferredGender.toLowerCase()
    }
  }

  // Calculate match score between two users
  private calculateMatchScore(preferences1: any, preferences2: any): number {
    let score = 0
    let totalWeight = 0

    // Country matching
    if (preferences1.country && preferences2.country) {
      const weight = this.matchingWeights.country
      totalWeight += weight
      if (
        preferences1.country === preferences2.country ||
        preferences1.country === "any" ||
        preferences2.country === "any"
      ) {
        score += weight
      }
    }

    // Gender matching (user gender matches preferred gender)
    if (preferences1.userGender && preferences2.preferredGender) {
      const weight = this.matchingWeights.preferredGender
      totalWeight += weight

      if (preferences2.preferredGender === "both" || preferences1.userGender === preferences2.preferredGender) {
        score += weight
      }
    }

    // Gender matching (preferred gender matches user gender)
    if (preferences1.preferredGender && preferences2.userGender) {
      const weight = this.matchingWeights.userGender
      totalWeight += weight

      if (preferences1.preferredGender === "both" || preferences2.userGender === preferences1.preferredGender) {
        score += weight
      }
    }

    // Interest matching
    if (
      preferences1.interests &&
      preferences2.interests &&
      Array.isArray(preferences1.interests) &&
      Array.isArray(preferences2.interests)
    ) {
      const weight = this.matchingWeights.interests
      totalWeight += weight

      // Find common interests
      const commonInterests = preferences1.interests.filter((interest: string) =>
        preferences2.interests.includes(interest),
      )

      // Calculate score based on percentage of common interests
      const maxInterests = Math.max(preferences1.interests.length, preferences2.interests.length)
      if (maxInterests > 0) {
        const interestScore = (commonInterests.length / maxInterests) * weight
        score += interestScore
      } else {
        // No interests specified, give partial score
        score += weight * 0.5
      }
    }

    // Normalize score to 0-100 range
    return totalWeight > 0 ? (score / totalWeight) * 100 : 50
  }

  // Find a match with improved matching algorithm
  async findMatch() {
    if (this.isConnecting || this.waitingForMatch || this.isReconnecting) {
      if (DEBUG_MODE) console.log("Already looking for a match or reconnecting")
      return
    }

    // Get the client ID from signaling service
    const clientId = this.signalingService.getClientId()

    // Check if user is banned or quarantined
    const status = await clientDatabaseService.isUserBannedOrQuarantined(clientId)

    if (status.isBanned) {
      this.onErrorCallback("You have been banned from the service.")
      return
    }

    if (status.isQuarantined) {
      const endTime = new Date(status.endTime || "").toLocaleString()
      this.onErrorCallback(`You are in quarantine until ${endTime}. You can pay to remove this restriction.`)
      return
    }

    this.isConnecting = true
    this.waitingForMatch = true
    this.isReconnecting = false
    this.connectionAttemptCount = 0
    this.hasSentOffer = false
    this.isExpectingAnswer = false
    this.userInitiatedStop = false

    if (DEBUG_MODE) console.log("Finding match with preferences:", this.preferences)

    // Set a timeout for connection
    this.connectionTimeout = setTimeout(() => {
      if (this.isConnecting && this.waitingForMatch) {
        this.isConnecting = false
        this.waitingForMatch = false
        this.isReconnecting = false
        this.hasSentOffer = false
        this.isExpectingAnswer = false
        this.onErrorCallback("Connection timeout. Could not find a match.")

        // Clear recently skipped peers after a timeout to allow more matching possibilities
        this.clearSkippedPeers()
      }
    }, 30000) // 30 second timeout

    // Broadcast availability to find a match
    this.signalingService.sendMessage("find-match", {
      preferences: this.preferences,
    })
  }

  // Clear all skipped peers
  clearSkippedPeers() {
    if (DEBUG_MODE) console.log("Clearing all skipped peers")
    this.recentlySkippedPeers.clear()
  }

  // Handle find match message from another user
  private handleFindMatch(senderId: string, peerPreferences: any) {
    // Only respond if we're looking for a match
    if (!this.waitingForMatch) return

    // Skip recently skipped peers
    if (this.recentlySkippedPeers.has(senderId)) {
      if (DEBUG_MODE) console.log(`Ignoring find-match from recently skipped peer ${senderId}`)
      return
    }

    if (DEBUG_MODE) console.log(`Received find-match from ${senderId}`)

    // Calculate match score
    const matchScore = this.calculateMatchScore(this.preferences, peerPreferences)
    if (DEBUG_MODE) console.log(`Match score with ${senderId}: ${matchScore}`)

    // Send a match request to the peer
    this.signalingService.sendDirectMessage(senderId, "match-request", {
      preferences: this.preferences,
      matchScore,
    })
  }

  // Handle match request from another user
  private handleMatchRequest(peerId: string, peerPreferences: any) {
    // Only respond if we're looking for a match
    if (!this.waitingForMatch) return

    // Skip recently skipped peers
    if (this.recentlySkippedPeers.has(peerId)) {
      if (DEBUG_MODE) console.log(`Ignoring match-request from recently skipped peer ${peerId}`)
      this.signalingService.sendDirectMessage(peerId, "match-response", {
        accepted: false,
        reason: "recently-skipped",
        preferences: this.preferences,
      })
      return
    }

    if (DEBUG_MODE) console.log(`Received match-request from ${peerId}`)

    // Calculate match score
    const matchScore = this.calculateMatchScore(this.preferences, peerPreferences)
    if (DEBUG_MODE) console.log(`Match score with ${peerId}: ${matchScore}`)

    // Accept if score is above threshold or randomly based on score
    const threshold = 50 // Minimum score to automatically accept
    const accepted = matchScore >= threshold || Math.random() * 100 < matchScore

    // Send response
    this.signalingService.sendDirectMessage(peerId, "match-response", {
      accepted,
      matchScore,
      preferences: this.preferences,
    })

    // If accepted, establish connection
    if (accepted) {
      this.signalingService.sendDirectMessage(peerId, "match-found", {
        isInitiator: false,
        peerPreferences: this.preferences,
      })

      this.handleMatchFound(peerId, false, peerPreferences)
    }
  }

  // Handle match response from another user
  private handleMatchResponse(peerId: string, accepted: boolean, peerPreferences: any) {
    if (!this.waitingForMatch) return

    if (DEBUG_MODE) console.log(`Received match-response from ${peerId}, accepted: ${accepted}`)

    if (accepted) {
      this.signalingService.sendDirectMessage(peerId, "match-found", {
        isInitiator: true,
        peerPreferences: this.preferences,
      })

      this.handleMatchFound(peerId, true, peerPreferences)
    } else {
      // If rejected, continue looking for other matches
      if (DEBUG_MODE) console.log(`Match rejected by ${peerId}, continuing search`)
    }
  }

  // Cancel finding a match
  cancelFindMatch() {
    if (DEBUG_MODE) console.log("Cancelling match finding")

    this.isConnecting = false
    this.waitingForMatch = false
    this.isReconnecting = false
    this.hasSentOffer = false
    this.isExpectingAnswer = false
    this.userInitiatedStop = true

    // Clear timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    // Send cancel request
    this.signalingService.sendMessage("cancel-find-match", {})
  }

  // Handle match found
  private async handleMatchFound(peerId: string, isInitiator: boolean, peerPreferences: any) {
    if (DEBUG_MODE) console.log(`Match found with peer ${peerId}, initiator: ${isInitiator}`)

    // Clear timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    this.isInitiator = isInitiator
    this.currentPeerId = peerId
    this.currentPeerPreferences = peerPreferences
    this.isConnecting = true
    this.waitingForMatch = false
    this.connectionAttemptCount = 0
    this.hasSentOffer = false
    this.isExpectingAnswer = false

    // Generate a call ID
    this.currentCallId = uuidv4()

    // Notify about match found immediately
    this.onMatchFoundCallback(peerId, peerPreferences)

    try {
      // Create peer connection
      await this.createPeerConnection()

      // If we are the initiator, create and send offer
      if (isInitiator) {
        // Add a small delay to ensure the connection is properly set up
        setTimeout(async () => {
          await this.createAndSendOffer()
        }, 500)
      }
    } catch (error) {
      console.error("Error in handleMatchFound:", error)
      this.onErrorCallback(
        "Failed to establish connection: " + (error instanceof Error ? error.message : String(error)),
      )

      // Reset connection state
      this.handlePeerDisconnected("connection-setup-failed")
    }
  }

  // Create WebRTC peer connection with enhanced configuration
  private async createPeerConnection() {
    try {
      // Close existing connection if any
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }

      // Create new connection with enhanced ICE servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        sdpSemantics: "unified-plan",
      })

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentPeerId) {
          if (DEBUG_MODE) console.log("ICE candidate:", event.candidate)
          this.signalingService.sendDirectMessage(this.currentPeerId, "ice-candidate", {
            candidate: event.candidate,
          })
        }
      }

      this.peerConnection.oniceconnectionstatechange = () => {
        if (DEBUG_MODE) console.log("ICE connection state:", this.peerConnection?.iceConnectionState)

        if (this.peerConnection?.iceConnectionState) {
          this.onConnectionStatusCallback(`ICE: ${this.peerConnection.iceConnectionState}`)
        }

        if (
          this.peerConnection?.iceConnectionState === "connected" ||
          this.peerConnection?.iceConnectionState === "completed"
        ) {
          // Connection established
          if (DEBUG_MODE) console.log("ICE connection established")
          this.isConnecting = false
          this.connectionAttemptCount = 0
          this.reconnectAttempts = 0
          this.currentReconnectBackoffTime = this.reconnectBackoffTime

          // Start collecting stats
          this.startCollectingStats()
        } else if (
          this.peerConnection?.iceConnectionState === "disconnected" ||
          this.peerConnection?.iceConnectionState === "failed" ||
          this.peerConnection?.iceConnectionState === "closed"
        ) {
          this.handlePeerDisconnected("connection-lost")
        }
      }

      this.peerConnection.onconnectionstatechange = () => {
        if (DEBUG_MODE) console.log("Connection state:", this.peerConnection?.connectionState)

        if (this.peerConnection?.connectionState) {
          this.onConnectionStatusCallback(`Connection: ${this.peerConnection.connectionState}`)
        }

        if (this.peerConnection?.connectionState === "failed") {
          this.handlePeerDisconnected("connection-failed")
        }
      }

      this.peerConnection.ontrack = (event) => {
        if (DEBUG_MODE) console.log("Remote track received:", event.track.kind)

        if (event.streams && event.streams[0]) {
          // Immediately notify about the remote stream
          this.onRemoteStreamCallback(event.streams[0])

          // Set up a periodic check to ensure the stream is still active
          const checkStreamInterval = setInterval(() => {
            if (event.streams[0].active) {
              if (DEBUG_MODE) console.log("Remote stream is active")
            } else {
              if (DEBUG_MODE) console.log("Remote stream is not active")
              clearInterval(checkStreamInterval)
            }
          }, 2000)
        }
      }

      // Log signaling state changes
      this.peerConnection.onsignalingstatechange = () => {
        if (DEBUG_MODE) console.log("Signaling state changed:", this.peerConnection?.signalingState)

        // If we're back to stable state, we can reset our offer/answer flags
        if (this.peerConnection?.signalingState === "stable") {
          this.hasSentOffer = false
          this.isExpectingAnswer = false
        }
      }

      // Add local tracks to the connection
      if (!this.localStream) {
        await this.initializeMedia()
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (this.peerConnection && this.localStream) {
            const sender = this.peerConnection.addTrack(track, this.localStream)

            // Store transceivers for later use with simulcast
            if (track.kind === "video") {
              const transceiver = this.peerConnection.getTransceivers().find((t) => t.sender === sender)

              if (transceiver) {
                this.transceivers.push(transceiver)

                // Set up simulcast if supported
                if (this.adaptiveStreamingEnabled && "setParameters" in sender) {
                  try {
                    const params = sender.getParameters()
                    if (!params.encodings) {
                      params.encodings = this.encodingParameters
                      sender.setParameters(params).catch((e) => console.error("Failed to set encoding parameters:", e))
                    }
                  } catch (e) {
                    console.error("Error setting up simulcast:", e)
                  }
                }
              }
            }
          }
        })
      }

      // Create data channel if initiator
      if (this.isInitiator) {
        this.dataChannel = this.peerConnection.createDataChannel("chat", {
          ordered: true,
          maxRetransmits: 3,
        })
        this.setupDataChannel()
      } else {
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel
          this.setupDataChannel()
        }
      }

      // Set codec preferences if supported
      if ("getTransceivers" in this.peerConnection) {
        try {
          this.peerConnection.getTransceivers().forEach((transceiver) => {
            if (transceiver.sender.track?.kind === "video" && "setCodecPreferences" in transceiver) {
              const capabilities = RTCRtpSender.getCapabilities("video")
              if (capabilities) {
                // Filter codecs based on our preferences
                const preferredCodecs = this.videoCodecPreferences
                  .map((codec) =>
                    capabilities.codecs.find((c) => c.mimeType.toLowerCase() === codec.mimeType.toLowerCase()),
                  )
                  .filter(Boolean) as RTCRtpCodecCapability[]

                if (preferredCodecs.length > 0) {
                  transceiver.setCodecPreferences([
                    ...preferredCodecs,
                    ...capabilities.codecs.filter(
                      (c) => !preferredCodecs.some((p) => p.mimeType.toLowerCase() === c.mimeType.toLowerCase()),
                    ),
                  ])
                }
              }
            }
          })
        } catch (e) {
          console.error("Error setting codec preferences:", e)
        }
      }
    } catch (error) {
      console.error("Error creating peer connection:", error)
      this.onErrorCallback("Failed to create connection: " + (error instanceof Error ? error.message : String(error)))
      throw error
    }
  }

  // Set up data channel with enhanced error handling
  private setupDataChannel() {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      if (DEBUG_MODE) console.log("Data channel opened")

      // Immediately send a ping to confirm the connection
      try {
        this.dataChannel.send(JSON.stringify({ type: "ping", timestamp: Date.now() }))
      } catch (e) {
        console.error("Error sending initial ping:", e)
      }

      this.onConnectedCallback()
    }

    this.dataChannel.onclose = () => {
      if (DEBUG_MODE) console.log("Data channel closed")
    }

    this.dataChannel.onerror = (error) => {
      console.error("Data channel error:", error)
      this.onErrorCallback("Data channel error: " + error.message)
    }

    this.dataChannel.onmessage = (event) => {
      if (DEBUG_MODE) console.log("Message received:", event.data)

      try {
        // Check if it's a JSON message
        const data = JSON.parse(event.data)
        if (data.type === "ping") {
          // Respond to ping with pong
          this.dataChannel?.send(JSON.stringify({ type: "pong", timestamp: Date.now() }))
          return
        } else if (data.type === "pong") {
          // Pong received, connection is working
          return
        } else if (data.type === "heartbeat") {
          // Respond to heartbeat
          this.dataChannel?.send(
            JSON.stringify({
              type: "heartbeat-response",
              timestamp: data.timestamp,
              receivedAt: Date.now(),
            }),
          )
          return
        } else if (data.type === "heartbeat-response") {
          // Calculate RTT
          const rtt = Date.now() - data.timestamp
          this.connectionQualityMetrics.roundTripTime = rtt
          this.connectionQualityMetrics.latency = rtt / 2
          return
        } else if (data.type === "bandwidth-estimation") {
          // Update bandwidth estimation
          this.handleBandwidthEstimation(data)
          return
        }
      } catch (e) {
        // Not JSON, treat as regular message
      }

      this.onMessageCallback(event.data)
    }
  }

  // Create and send offer with enhanced SDP handling
  private async createAndSendOffer() {
    try {
      if (!this.peerConnection || !this.currentPeerId) return

      // Don't send another offer if we've already sent one and are waiting for an answer
      if (this.hasSentOffer) {
        if (DEBUG_MODE) console.log("Already sent an offer, waiting for answer")
        return
      }

      // Check if we're in the right state to send an offer
      if (this.peerConnection.signalingState !== "stable") {
        if (DEBUG_MODE) console.log(`Cannot create offer in state: ${this.peerConnection.signalingState}`)
        return
      }

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: this.reconnectAttempts > 0, // Use ICE restart for reconnection attempts
      })

      // Enhance SDP for better performance
      const enhancedSdp = this.enhanceSdp(offer.sdp || "")

      // Create sanitized offer with enhanced SDP
      const sanitizedOffer = {
        type: offer.type,
        sdp: enhancedSdp,
      }

      await this.peerConnection.setLocalDescription(sanitizedOffer)

      // Mark that we've sent an offer and are expecting an answer
      this.hasSentOffer = true
      this.isExpectingAnswer = true

      if (DEBUG_MODE) console.log("Created and sending offer:", sanitizedOffer)

      this.signalingService.sendDirectMessage(this.currentPeerId, "offer", {
        offer: sanitizedOffer,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      this.onErrorCallback("Failed to create offer: " + (error instanceof Error ? error.message : String(error)))
      this.hasSentOffer = false
      this.isExpectingAnswer = false
      throw error
    }
  }

  // Handle incoming offer with enhanced error recovery
  private async handleOffer(offer: RTCSessionDescriptionInit, peerId: string) {
    try {
      if (!this.peerConnection) {
        await this.createPeerConnection()
      }

      this.currentPeerId = peerId

      if (DEBUG_MODE) console.log("Received offer:", offer)

      // Check if we're in the right state to process an offer
      if (this.peerConnection.signalingState !== "stable") {
        if (DEBUG_MODE)
          console.log(
            `Cannot process offer in state: ${this.peerConnection.signalingState}, attempting to reset connection`,
          )

        // Try to reset the connection
        await this.createPeerConnection()
      }

      // Enhance SDP for better performance
      const enhancedSdp = this.enhanceSdp(offer.sdp || "")

      // Create sanitized offer with enhanced SDP
      const sanitizedOffer = {
        type: offer.type,
        sdp: enhancedSdp,
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sanitizedOffer))
      const answer = await this.peerConnection.createAnswer()

      // Enhance SDP for better performance
      const enhancedAnswerSdp = this.enhanceSdp(answer.sdp || "")

      // Create sanitized answer with enhanced SDP
      const sanitizedAnswer = {
        type: answer.type,
        sdp: enhancedAnswerSdp,
      }

      await this.peerConnection.setLocalDescription(sanitizedAnswer)

      if (DEBUG_MODE) console.log("Created and sending answer:", sanitizedAnswer)

      this.signalingService.sendDirectMessage(peerId, "answer", {
        answer: sanitizedAnswer,
      })
    } catch (error) {
      console.error("Error handling offer:", error)
      this.onErrorCallback(
        "Failed to process connection offer: " + (error instanceof Error ? error.message : String(error)),
      )
      // Don't throw here, just report the error
    }
  }

  // Handle incoming answer with enhanced error recovery
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (!this.peerConnection) {
        console.error("No peer connection available")
        this.onErrorCallback("No peer connection available")
        return
      }

      if (DEBUG_MODE) console.log("Received answer:", answer)

      // Only process the answer if we're expecting one
      if (!this.isExpectingAnswer) {
        if (DEBUG_MODE) console.log("Received unexpected answer, ignoring")
        return
      }

      // Increment connection attempt counter
      this.connectionAttemptCount++

      // If we've tried too many times, clear skipped peers to allow more matching possibilities
      if (this.connectionAttemptCount >= this.maxConnectionAttempts) {
        if (DEBUG_MODE)
          console.log(`Max connection attempts (${this.maxConnectionAttempts}) reached, clearing skipped peers`)
        this.clearSkippedPeers()
        this.connectionAttemptCount = 0
      }

      // Enhance SDP for better performance
      const enhancedSdp = this.enhanceSdp(answer.sdp || "")

      // Create sanitized answer with enhanced SDP
      const sanitizedAnswer = {
        type: answer.type,
        sdp: enhancedSdp,
      }

      // Check if we can set the remote description
      if (this.peerConnection.signalingState === "have-local-offer") {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sanitizedAnswer))
        if (DEBUG_MODE) console.log("Remote description set successfully")

        // Reset our flags now that we've processed the answer
        this.hasSentOffer = false
        this.isExpectingAnswer = false
      } else {
        console.warn("Cannot set remote description in current state:", this.peerConnection.signalingState)
        this.onErrorCallback(`Cannot set remote description in current state: ${this.peerConnection.signalingState}`)

        // If we're in stable state, we might have already processed this answer or missed the offer
        // Let's try to create a new offer if we're the initiator
        if (this.peerConnection.signalingState === "stable" && this.isInitiator) {
          if (DEBUG_MODE) console.log("In stable state but received answer, trying to create a new offer")
          this.hasSentOffer = false
          this.isExpectingAnswer = false
          await this.createAndSendOffer()
        }
      }
    } catch (error) {
      console.error("Error handling answer:", error)
      this.onErrorCallback(
        "Failed to process connection answer: " + (error instanceof Error ? error.message : String(error)),
      )
      this.hasSentOffer = false
      this.isExpectingAnswer = false
    }
  }

  // Enhance SDP for better performance and compatibility
  private enhanceSdp(sdp: string): string {
    const lines = sdp.split("\r\n")
    const modifiedLines: string[] = []

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Remove bandwidth restrictions for video
      if (line.startsWith("m=video")) {
        modifiedLines.push(line)

        // Add high bitrate for video
        modifiedLines.push("b=AS:2000")
        continue
      }

      // Remove bandwidth restrictions for audio
      if (line.startsWith("m=audio")) {
        modifiedLines.push(line)

        // Add reasonable bitrate for audio
        modifiedLines.push("b=AS:128")
        continue
      }

      // Skip problematic lines
      if (line.includes("extmap-allow-mixed")) {
        continue
      }

      // Modify video codec parameters for better quality
      if (line.includes("a=rtpmap") && line.includes("VP8")) {
        modifiedLines.push(line)

        // Add parameters for better quality
        const codecId = line.split(" ")[0].split(":")[1]
        modifiedLines.push(
          `a=fmtp:${codecId} x-google-min-bitrate=1000;x-google-max-bitrate=4000;x-google-start-bitrate=2000`,
        )
        continue
      }

      // Add existing line
      modifiedLines.push(line)
    }

    return modifiedLines.join("\r\n")
  }

  // Handle incoming ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (!this.peerConnection) return

      if (DEBUG_MODE) console.log("Received ICE candidate:", candidate)

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  // Handle peer disconnection with enhanced reconnection logic
  private handlePeerDisconnected(reason?: string) {
    if (DEBUG_MODE) console.log(`Peer disconnected, reason: ${reason || "unknown"}`)

    // Store the current peer ID before clearing it
    const disconnectedPeerId = this.currentPeerId

    // Stop collecting stats
    this.stopCollectingStats()

    // Clear connection state
    this.currentPeerId = null
    this.isConnecting = false
    this.waitingForMatch = false
    this.isReconnecting = false
    this.hasSentOffer = false
    this.isExpectingAnswer = false

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Pass the reason to the callback
    this.onDisconnectedCallback(reason)
  }

  // Start collecting connection statistics
  private startCollectingStats() {
    if (!this.peerConnection) return

    // Clear any existing interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }

    // Set up new interval
    this.statsInterval = setInterval(() => {
      this.collectConnectionStats()
    }, this.statsIntervalTime)
  }

  // Stop collecting connection statistics
  private stopCollectingStats() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
  }

  // Collect connection statistics
  private async collectConnectionStats() {
    if (!this.peerConnection) return

    try {
      const stats = await this.peerConnection.getStats()

      let videoInbound: any = null
      let audioInbound: any = null
      let videoOutbound: any = null
      let audioOutbound: any = null
      let candidatePair: any = null

      stats.forEach((stat) => {
        if (stat.type === "inbound-rtp" && stat.kind === "video") {
          videoInbound = stat
        } else if (stat.type === "inbound-rtp" && stat.kind === "audio") {
          audioInbound = stat
        } else if (stat.type === "outbound-rtp" && stat.kind === "video") {
          videoOutbound = stat
        } else if (stat.type === "outbound-rtp" && stat.kind === "audio") {
          audioOutbound = stat
        } else if (stat.type === "candidate-pair" && stat.selected) {
          candidatePair = stat
        }
      })

      // Update connection quality metrics
      if (videoInbound) {
        this.connectionQualityMetrics.packetsLost = videoInbound.packetsLost || 0
        this.connectionQualityMetrics.packetsReceived = videoInbound.packetsReceived || 0
        this.connectionQualityMetrics.bytesReceived = videoInbound.bytesReceived || 0
        this.connectionQualityMetrics.framerate = videoInbound.framesPerSecond || 0

        if (videoInbound.frameWidth && videoInbound.frameHeight) {
          this.connectionQualityMetrics.resolution = {
            width: videoInbound.frameWidth,
            height: videoInbound.frameHeight,
          }
        }

        if (videoInbound.jitter) {
          this.connectionQualityMetrics.jitter = videoInbound.jitter * 1000 // Convert to ms
        }
      }

      if (videoOutbound) {
        this.connectionQualityMetrics.bytesSent = videoOutbound.bytesSent || 0
      }

      if (candidatePair) {
        this.connectionQualityMetrics.roundTripTime = candidatePair.currentRoundTripTime * 1000 || 0 // Convert to ms

        // Estimate bandwidth
        if (candidatePair.availableOutgoingBitrate) {
          this.connectionQualityMetrics.bandwidth = candidatePair.availableOutgoingBitrate / 1000 // Convert to kbps
        }
      }

      // Notify about connection quality
      this.onConnectionQualityCallback(this.connectionQualityMetrics)

      // Share stats with peer if connected
      if (this.dataChannel && this.dataChannel.readyState === "open") {
        try {
          this.dataChannel.send(
            JSON.stringify({
              type: "connection-stats",
              metrics: this.connectionQualityMetrics,
              timestamp: Date.now(),
            }),
          )
        } catch (e) {
          console.error("Error sending connection stats:", e)
        }
      }

      // Adapt to network conditions if enabled
      if (this.adaptiveStreamingEnabled) {
        this.adaptToNetworkConditions()
      }
    } catch (error) {
      console.error("Error collecting stats:", error)
    }
  }

  // Handle bandwidth estimation from peer
  private handleBandwidthEstimation(data: any) {
    if (!this.bandwidthEstimator) return

    // Update bandwidth estimator with peer's data
    this.bandwidthEstimator.addSample(data.bandwidth, data.timestamp)

    if (DEBUG_MODE) console.log("Received bandwidth estimation:", data.bandwidth, "kbps")
  }

  // Handle connection stats from peer
  private handleConnectionStats(data: any) {
    // Can be used to show peer's connection quality to the user
    if (DEBUG_MODE) console.log("Received connection stats from peer:", data.metrics)
  }

  // Handle media constraints change from peer
  private handleMediaConstraintsChange(data: any) {
    if (DEBUG_MODE) console.log("Peer changed media constraints:", data)

    // Adapt our sending quality based on peer's constraints if needed
    if (data.reducedQuality && this.peerConnection) {
      this.reduceVideoQuality()
    }
  }

  // Handle codec preferences change from peer
  private handleCodecPreferencesChange(data: any) {
    if (DEBUG_MODE) console.log("Peer changed codec preferences:", data)

    // Could renegotiate with new codec preferences if needed
  }

  // Adapt to network conditions
  private adaptToNetworkConditions() {
    if (!this.peerConnection || !this.localStream) return

    const bandwidth = this.connectionQualityMetrics.bandwidth
    const rtt = this.connectionQualityMetrics.roundTripTime
    const packetLoss =
      (this.connectionQualityMetrics.packetsLost / (this.connectionQualityMetrics.packetsReceived + 0.001)) * 100

    if (DEBUG_MODE) console.log(`Network conditions: ${bandwidth}kbps, ${rtt}ms RTT, ${packetLoss.toFixed(2)}% loss`)

    // Determine if we need to reduce quality
    const poorConnection = bandwidth < 500 || rtt > 300 || packetLoss > 5

    if (poorConnection) {
      this.reduceVideoQuality()

      // Notify peer about reduced quality
      if (this.dataChannel && this.dataChannel.readyState === "open") {
        try {
          this.dataChannel.send(
            JSON.stringify({
              type: "media-constraints-change",
              reducedQuality: true,
              timestamp: Date.now(),
            }),
          )
        } catch (e) {
          console.error("Error sending media constraints change:", e)
        }
      }
    } else if (bandwidth > 1500 && rtt < 100 && packetLoss < 1) {
      // Good connection, can increase quality if previously reduced
      this.restoreVideoQuality()
    }
  }

  // Reduce video quality for poor connections
  private reduceVideoQuality() {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (!videoTrack) return

    try {
      const constraints: MediaTrackConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 },
      }

      videoTrack
        .applyConstraints(constraints)
        .then(() => {
          if (DEBUG_MODE) console.log("Reduced video quality for poor connection")
        })
        .catch((e) => {
          console.error("Error reducing video quality:", e)
        })
    } catch (e) {
      console.error("Error reducing video quality:", e)
    }
  }

  // Restore video quality for good connections
  private restoreVideoQuality() {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (!videoTrack) return

    try {
      const constraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      }

      videoTrack
        .applyConstraints(constraints)
        .then(() => {
          if (DEBUG_MODE) console.log("Restored video quality for good connection")
        })
        .catch((e) => {
          console.error("Error restoring video quality:", e)
        })
    } catch (e) {
      console.error("Error restoring video quality:", e)
    }
  }

  // Send a message
  sendMessage(message: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not open")
      return
    }

    this.dataChannel.send(message)
  }

  // Disconnect with reason
  async disconnect(reason = "user-stop") {
    if (DEBUG_MODE) console.log(`Disconnecting from peer, reason: ${reason}`)

    // Set user initiated flag if appropriate
    if (reason === "user-stop" || reason === "user-skip") {
      this.userInitiatedStop = true
    }

    // End call tracking
    if (this.currentCallId) {
      // Update the database to end the call
      await clientDatabaseService.endActiveCall(this.currentCallId, reason)
      this.currentCallId = null
    }

    // Notify peer
    if (this.currentPeerId) {
      this.signalingService.sendDirectMessage(this.currentPeerId, "disconnect", {
        reason: reason,
      })
    }

    this.handlePeerDisconnected(reason)
  }

  // Skip to next peer
  async skipPeer() {
    if (this.currentPeerId) {
      if (DEBUG_MODE) console.log(`Adding ${this.currentPeerId} to recently skipped peers`)

      // Add to recently skipped peers
      this.recentlySkippedPeers.add(this.currentPeerId)

      // Remove from skipped list after timeout
      setTimeout(() => {
        if (this.recentlySkippedPeers.has(this.currentPeerId as string)) {
          if (DEBUG_MODE) console.log(`Removing ${this.currentPeerId} from recently skipped peers`)
          this.recentlySkippedPeers.delete(this.currentPeerId as string)
        }
      }, this.skippedPeerTimeout)

      // Disconnect from current peer with skip reason
      await this.disconnect("user-skip")
    } else {
      // No current peer, just disconnect to be safe
      await this.disconnect("user-skip")
    }
  }

  // Clean up resources
  async cleanup() {
    if (DEBUG_MODE) console.log("Cleaning up WebRTC service")

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear heartbeat timeout
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }

    // Clear stats interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    await this.disconnect("cleanup")

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Clear any recordings
    this.recordedChunks = []
  }

  // Register a user in the database
  registerUser(ip: string, country: string | null) {
    const clientId = this.signalingService.getClientId()
    console.log(`Registering user ${clientId} with IP ${ip} and country ${country}`)

    // Check if user already exists
    let user = clientDatabaseService.getUser(clientId)

    if (!user) {
      // Create new user
      user = {
        id: clientId,
        ip,
        country,
        connectionTime: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        connected: true,
        reportCount: 0,
        violations: 0,
        quarantineStatus: null,
        bannedStatus: null,
      }
      clientDatabaseService.addUser(user)
      console.log(`Created new user: ${clientId}`)
    } else {
      // Update existing user
      clientDatabaseService.updateUser(clientId, {
        ip,
        country,
        lastSeen: new Date().toISOString(),
        connected: true,
      })
      console.log(`Updated existing user: ${clientId}`)
    }

    // Mark user as connected
    clientDatabaseService.markUserConnected(clientId)
    console.log(`Marked user as connected: ${clientId}`)

    // Update shared state
    sharedStateService.updateUserState(user)
  }

  // Check if connected
  isConnected(): boolean {
    return (
      this.peerConnection !== null &&
      this.dataChannel !== null &&
      this.dataChannel.readyState === "open" &&
      (this.peerConnection.iceConnectionState === "connected" || this.peerConnection.iceConnectionState === "completed")
    )
  }

  // Switch camera
  async switchCamera() {
    if (!this.localStream) return

    try {
      // Get current video track
      const currentVideoTrack = this.localStream.getVideoTracks()[0]
      if (!currentVideoTrack) return

      // Stop current track
      currentVideoTrack.stop()

      // Get current facing mode
      const currentSettings = currentVideoTrack.getSettings()
      const currentFacingMode = currentSettings.facingMode

      // Request opposite facing mode
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user"

      // Create new constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: newFacingMode,
          width: currentSettings.width,
          height: currentSettings.height,
          frameRate: currentSettings.frameRate,
        },
        audio: false, // Don't request audio again
      }

      // Get new video stream
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newVideoTrack = newStream.getVideoTracks()[0]

      // Replace track in local stream
      const audioTracks = this.localStream.getAudioTracks()
      this.localStream.removeTrack(currentVideoTrack)
      this.localStream.addTrack(newVideoTrack)

      // Replace track in peer connection if connected
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders()
        const videoSender = senders.find((sender) => sender.track && sender.track.kind === "video")

        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack)
        }
      }

      if (DEBUG_MODE) console.log(`Switched camera to ${newFacingMode} mode`)

      return newFacingMode
    } catch (error) {
      console.error("Error switching camera:", error)
      this.onErrorCallback("Failed to switch camera: " + (error instanceof Error ? error.message : String(error)))
      throw error
    }
  }

  // Set callback for connection established
  onConnected(callback: () => void) {
    const originalCallback = callback
    this.onConnectedCallback = async () => {
      // Mark the user as connected in the database
      const clientId = this.signalingService.getClientId()
      console.log(`User connected: ${clientId}`)
      await clientDatabaseService.markUserConnected(clientId)

      // Track the active call
      if (this.currentPeerId && this.currentCallId) {
        console.log(`Call established: ${this.currentCallId} between ${clientId} and ${this.currentPeerId}`)
        await clientDatabaseService.trackActiveCall(this.currentCallId, clientId, this.currentPeerId)
      }

      // Call the original callback
      originalCallback()
    }
  }

  // Set callback for disconnection
  onDisconnected(callback: (reason?: string) => void) {
    const originalCallback = callback
    this.onDisconnectedCallback = async (reason?: string) => {
      // Mark the user as disconnected in the database
      const clientId = this.signalingService.getClientId()
      await clientDatabaseService.markUserDisconnected(clientId)

      // Call the original callback
      originalCallback(reason)
    }
  }

  // Set callback for remote stream
  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback
  }

  // Set callback for message received
  onMessage(callback: (message: string) => void) {
    this.onMessageCallback = callback
  }

  // Set callback for connection status updates
  onConnectionStatus(callback: (status: string) => void) {
    this.onConnectionStatusCallback = callback
  }

  // Set callback for errors
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  // Set callback for match found
  onMatchFound(callback: (peerId: string, peerPreferences: any) => void) {
    this.onMatchFoundCallback = callback
  }

  // Set callback for connection quality updates
  onConnectionQuality(callback: (metrics: any) => void) {
    this.onConnectionQualityCallback = callback
  }

  // Set callback for network changes
  onNetworkChange(callback: (online: boolean) => void) {
    this.onNetworkChangeCallback = callback
  }
}

// Bandwidth estimator class for adaptive streaming
class BandwidthEstimator {
  private samples: Array<{ bandwidth: number; timestamp: number }> = []
  private maxSamples = 20
  private currentEstimate = 1000 // Initial estimate in kbps

  constructor() {}

  // Add a bandwidth sample
  addSample(bandwidth: number, timestamp: number) {
    this.samples.push({ bandwidth, timestamp })

    // Keep only the most recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }

    // Recalculate estimate
    this.calculateEstimate()
  }

  // Calculate bandwidth estimate
  private calculateEstimate() {
    if (this.samples.length === 0) return

    // Sort samples by timestamp
    this.samples.sort((a, b) => a.timestamp - b.timestamp)

    // Calculate weighted average, giving more weight to recent samples
    let totalWeight = 0
    let weightedSum = 0

    for (let i = 0; i < this.samples.length; i++) {
      // Weight increases linearly with recency
      const weight = i + 1
      weightedSum += this.samples[i].bandwidth * weight
      totalWeight += weight
    }

    this.currentEstimate = weightedSum / totalWeight
  }

  // Get current bandwidth estimate
  getEstimate(): number {
    return this.currentEstimate
  }

  // Clear samples
  clear() {
    this.samples = []
  }
}

