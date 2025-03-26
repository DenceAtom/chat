import * as Ably from "ably"
import { DEBUG_MODE } from "./config"

export class SignalingService {
  private ably: Ably.Realtime | null = null
  private channel: Ably.Types.RealtimeChannel | null = null
  private privateChannel: Ably.Types.RealtimeChannel | null = null
  private messageCallback: (type: string, data: any) => void = () => {}
  private isConnected = false
  private clientId = ""

  constructor() {
    // Generate a unique client ID
    this.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
  }

  // Connect to Ably
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isConnected && this.ably) {
          resolve()
          return
        }

        if (DEBUG_MODE) console.log(`Connecting to Ably with client ID: ${this.clientId}`)

        // Initialize Ably with the API key from environment variables
        const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY

        if (!apiKey) {
          console.error("Ably API key is missing")
          reject(new Error("Ably API key is missing"))
          return
        }

        this.ably = new Ably.Realtime({
          key: apiKey,
          clientId: this.clientId,
          echoMessages: false,
        })

        this.ably.connection.on("connected", () => {
          if (DEBUG_MODE) console.log("Connected to Ably")
          this.isConnected = true

          // Subscribe to the main signaling channel
          this.channel = this.ably.channels.get("signaling")

          // Subscribe to messages on the main channel
          this.channel.subscribe((message) => {
            if (DEBUG_MODE) console.log("Received message on main channel:", message)

            try {
              const { type, data } = message.data

              // Ignore messages from self
              if (data.senderId === this.clientId) {
                if (DEBUG_MODE) console.log("Ignoring message from self")
                return
              }

              this.messageCallback(type, data)
            } catch (error) {
              console.error("Error processing message:", error, message)
            }
          })

          // Subscribe to private messages directed to this client
          this.privateChannel = this.ably.channels.get(`private:${this.clientId}`)
          this.privateChannel.subscribe((message) => {
            if (DEBUG_MODE) console.log("Received private message:", message)

            try {
              const { type, data } = message.data

              // Ignore messages from self (shouldn't happen on private channel)
              if (data.senderId === this.clientId) {
                if (DEBUG_MODE) console.log("Ignoring private message from self")
                return
              }

              this.messageCallback(type, data)
            } catch (error) {
              console.error("Error processing private message:", error, message)
            }
          })

          resolve()
        })

        this.ably.connection.on("failed", (err) => {
          console.error("Connection failed:", err)
          this.isConnected = false
          reject(err)
        })
      } catch (error) {
        console.error("Error connecting to Ably:", error)
        reject(error)
      }
    })
  }

  // Send message to Ably channel
  sendMessage(type: string, data: any = {}) {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot send message: not connected to Ably")
      return
    }

    if (DEBUG_MODE) console.log(`Sending ${type} message:`, data)

    // Add sender ID to data
    const messageData = {
      type,
      data: {
        ...data,
        senderId: this.clientId,
      },
    }

    this.channel.publish("message", messageData)
  }

  // Send a direct message to a specific peer
  sendDirectMessage(peerId: string, type: string, data: any = {}) {
    if (!this.ably || !this.isConnected) {
      console.error("Cannot send direct message: not connected to Ably")
      return
    }

    if (DEBUG_MODE) console.log(`Sending direct ${type} message to ${peerId}:`, data)

    // Get or create a private channel for this peer
    const privateChannel = this.ably.channels.get(`private:${peerId}`)

    // Add sender ID to data
    const messageData = {
      type,
      data: {
        ...data,
        senderId: this.clientId,
      },
    }

    privateChannel.publish("message", messageData)
  }

  // Register callback for incoming messages
  onMessage(callback: (type: string, data: any) => void) {
    this.messageCallback = callback
  }

  // Get client ID
  getClientId(): string {
    return this.clientId
  }

  // Disconnect from Ably
  disconnect() {
    if (this.ably) {
      if (this.channel) {
        this.channel.unsubscribe()
      }
      if (this.privateChannel) {
        this.privateChannel.unsubscribe()
      }
      this.ably.close()
      this.ably = null
      this.channel = null
      this.privateChannel = null
      this.isConnected = false
    }
  }
}

