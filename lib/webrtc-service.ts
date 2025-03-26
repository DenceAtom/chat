import type { SignalingService } from "./signaling-service"
import { ICE_SERVERS, DEBUG_MODE } from "./config"

// Import the client database service instead of the server one
import clientDatabaseService from "./client-database-service"
import { v4 as uuidv4 } from "uuid"

export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null
  public localStream: MediaStream | null = null
  private dataChannel: RTCDataChannel | null = null
  private signalingService: SignalingService
  private onConnectedCallback: () => void = () => {}
  private onDisconnectedCallback: (reason?: string) => void = () => {}
  private onRemoteStreamCallback: (stream: MediaStream) => void = () => {}
  private onMessageCallback: (message: string) => void = () => {}
  private onConnectionStatusCallback: (status: string) => void = () => {}
  private onErrorCallback: (error: string) => void = () => {}
  private onMatchFoundCallback: (peerId: string, peerPreferences: any) => void = () => {}
  private preferences: any = {}
  private isInitiator = false
  private isConnecting = false
  private currentPeerId: string | null = null
  private connectionTimeout: NodeJS.Timeout | null = null
  private waitingForMatch = false
  private recentlySkippedPeers: Set<string> = new Set()
  private skippedPeerTimeout = 1000 // 1 second cooldown before reconnecting to skipped peer
  private maxConnectionAttempts = 5 // Maximum number of consecutive connection attempts before resetting
  private connectionAttemptCount = 0 // Counter for connection attempts
  // Add a connection state flag to prevent multiple connection attempts
  private isReconnecting = false
  // Add a flag to track if we've sent an offer
  private hasSentOffer = false
  // Add a flag to track if we're expecting an answer
  private isExpectingAnswer = false
  // Add these properties to the WebRTCService class
  private currentCallId: string | null = null
  // Add a heartbeat interval to keep track of active users
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(signalingService: SignalingService) {
    this.signalingService = signalingService
    this.setupSignalingListeners()
    this.setupHeartbeat()
  }

  private setupSignalingListeners() {
    // Listen for signaling messages
    this.signalingService.onMessage((type, data) => {
      if (DEBUG_MODE) console.log(`Received signaling message: ${type}`, data)

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
            this.signalingService.sendDirectMessage(data.senderId, "heartbeat-response", {})
          }
          break
      }
    })
  }

  // Set up a heartbeat to keep track of active users
  private setupHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Set up a new heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const clientId = this.signalingService.getClientId()
      if (clientId) {
        // Update the user's last seen time
        clientDatabaseService.updateUser(clientId, {
          lastSeen: new Date().toISOString(),
        })

        // If connected to a peer, send a heartbeat
        if (this.currentPeerId) {
          this.signalingService.sendDirectMessage(this.currentPeerId, "heartbeat", {})
        }
      }
    }, 30000) // Every 30 seconds
  }

  // Initialize media (camera and microphone)
  async initializeMedia(): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      this.localStream = stream
      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      this.onErrorCallback("Could not access camera or microphone")
      throw error
    }
  }

  // Register user preferences
  register(preferences: any) {
    this.preferences = preferences
    if (DEBUG_MODE) console.log("Registered preferences:", preferences)
  }

  // Update the findMatch method to prevent multiple concurrent connection attempts
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

    // Send a match request to the peer
    this.signalingService.sendDirectMessage(senderId, "match-request", {
      preferences: this.preferences,
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

    // Simple matching logic - accept all requests when waiting
    const accepted = true

    // Send response
    this.signalingService.sendDirectMessage(peerId, "match-response", {
      accepted,
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

  // Update the cancelFindMatch method to reset all connection states
  cancelFindMatch() {
    if (DEBUG_MODE) console.log("Cancelling match finding")

    this.isConnecting = false
    this.waitingForMatch = false
    this.isReconnecting = false
    this.hasSentOffer = false
    this.isExpectingAnswer = false

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
      this.handlePeerDisconnected()
    }
  }

  // Create WebRTC peer connection
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
        } else if (
          this.peerConnection?.iceConnectionState === "disconnected" ||
          this.peerConnection?.iceConnectionState === "failed" ||
          this.peerConnection?.iceConnectionState === "closed"
        ) {
          this.handlePeerDisconnected("connection-lost")
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
            this.peerConnection.addTrack(track, this.localStream)
          }
        })
      }

      // Create data channel if initiator
      if (this.isInitiator) {
        this.dataChannel = this.peerConnection.createDataChannel("chat")
        this.setupDataChannel()
      } else {
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel
          this.setupDataChannel()
        }
      }
    } catch (error) {
      console.error("Error creating peer connection:", error)
      this.onErrorCallback("Failed to create connection")
      throw error
    }
  }

  // Set up data channel
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

    this.dataChannel.onmessage = (event) => {
      if (DEBUG_MODE) console.log("Message received:", event.data)

      try {
        // Check if it's a JSON message
        const data = JSON.parse(event.data)
        if (data.type === "ping") {
          // Respond to ping with pong
          this.dataChannel.send(JSON.stringify({ type: "pong", timestamp: Date.now() }))
          return
        } else if (data.type === "pong") {
          // Pong received, connection is working
          return
        }
      } catch (e) {
        // Not JSON, treat as regular message
      }

      this.onMessageCallback(event.data)
    }
  }

  // Create and send offer
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
      })

      // Sanitize the SDP to ensure compatibility
      const sanitizedOffer = {
        type: offer.type,
        sdp: this.sanitizeSdp(offer.sdp || ""),
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
      this.onErrorCallback("Failed to create offer")
      this.hasSentOffer = false
      this.isExpectingAnswer = false
      throw error
    }
  }

  // Handle incoming offer
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

      // Sanitize the SDP to ensure compatibility
      const sanitizedOffer = {
        type: offer.type,
        sdp: this.sanitizeSdp(offer.sdp || ""),
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sanitizedOffer))
      const answer = await this.peerConnection.createAnswer()

      // Sanitize the answer SDP
      const sanitizedAnswer = {
        type: answer.type,
        sdp: this.sanitizeSdp(answer.sdp || ""),
      }

      await this.peerConnection.setLocalDescription(sanitizedAnswer)

      if (DEBUG_MODE) console.log("Created and sending answer:", sanitizedAnswer)

      this.signalingService.sendDirectMessage(peerId, "answer", {
        answer: sanitizedAnswer,
      })
    } catch (error) {
      console.error("Error handling offer:", error)
      this.onErrorCallback("Failed to process connection offer")
      // Don't throw here, just report the error
    }
  }

  // Update the handleAnswer method to better handle connection errors
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

      // Sanitize the SDP to ensure compatibility
      const sanitizedAnswer = {
        type: answer.type,
        sdp: this.sanitizeSdp(answer.sdp || ""),
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
      this.onErrorCallback("Failed to process connection answer")
      this.hasSentOffer = false
      this.isExpectingAnswer = false
    }
  }

  // Sanitize SDP to ensure compatibility across browsers
  private sanitizeSdp(sdp: string): string {
    // Remove lines that might cause compatibility issues
    let lines = sdp.split("\r\n")

    // Filter out problematic lines if needed
    // This is a simple example - you might need to adjust based on specific issues
    lines = lines.filter((line) => {
      // Filter out specific problematic attributes if needed
      return !line.includes("extmap-allow-mixed")
    })

    return lines.join("\r\n")
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

  // Update the handlePeerDisconnected method to include reason
  private handlePeerDisconnected(reason?: string) {
    if (DEBUG_MODE) console.log(`Peer disconnected, reason: ${reason || "unknown"}`)

    // Store the current peer ID before clearing it
    const disconnectedPeerId = this.currentPeerId

    this.currentPeerId = null
    this.isConnecting = false
    this.waitingForMatch = false
    this.isReconnecting = false
    this.hasSentOffer = false
    this.isExpectingAnswer = false

    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Pass the reason to the callback
    this.onDisconnectedCallback(reason)
  }

  // Send a message
  sendMessage(message: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not open")
      return
    }

    this.dataChannel.send(message)
  }

  // Update the disconnect method to include reason
  async disconnect(reason = "user-stop") {
    if (DEBUG_MODE) console.log(`Disconnecting from peer, reason: ${reason}`)

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

  // Update the skipPeer method to use a specific reason
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

    await this.disconnect("cleanup")

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }
  }

  // Add a method to register a user in the database
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
  }

  // Update the onConnected callback to track connections
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

  // Update the onDisconnected callback to track disconnections
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

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback
  }

  onMessage(callback: (message: string) => void) {
    this.onMessageCallback = callback
  }

  onConnectionStatus(callback: (status: string) => void) {
    this.onConnectionStatusCallback = callback
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  onMatchFound(callback: (peerId: string, peerPreferences: any) => void) {
    this.onMatchFoundCallback = callback
  }
}

