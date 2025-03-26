import * as Ably from "ably"

// This class manages shared state across all clients using Ably
class SharedStateService {
  private ably: Ably.Realtime | null = null
  private channel: Ably.Types.RealtimeChannel | null = null
  private isConnected = false
  private clientId = ""
  private activeUsers: Map<string, any> = new Map()
  private activeCalls: Map<string, any> = new Map()
  private onActiveUsersUpdateCallbacks: Array<(users: any[]) => void> = []
  private onActiveCallsUpdateCallbacks: Array<(calls: any[]) => void> = []

  constructor() {
    // Generate a unique client ID
    this.clientId = `admin-${Math.random().toString(36).substring(2, 9)}`
    this.connect()
  }

  // Connect to Ably
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isConnected && this.ably) {
          resolve()
          return
        }

        console.log(`Connecting to Ably shared state with client ID: ${this.clientId}`)

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
          console.log("Connected to Ably shared state")
          this.isConnected = true

          // Subscribe to the shared state channel
          this.channel = this.ably.channels.get("shared-state")

          // Subscribe to messages on the shared state channel
          this.channel.subscribe((message) => {
            console.log("Received shared state message:", message.name)

            try {
              if (message.name === "user-update") {
                const userData = message.data
                this.activeUsers.set(userData.id, userData)
                this.notifyActiveUsersUpdate()
              } else if (message.name === "user-disconnect") {
                const userId = message.data.id
                this.activeUsers.delete(userId)
                this.notifyActiveUsersUpdate()
              } else if (message.name === "call-update") {
                const callData = message.data
                this.activeCalls.set(callData.id, callData)
                this.notifyActiveCallsUpdate()
              } else if (message.name === "call-end") {
                const callId = message.data.id
                this.activeCalls.delete(callId)
                this.notifyActiveCallsUpdate()
              } else if (message.name === "admin-request-state") {
                // If we're not an admin, send our state to help initialize new admins
                if (!this.clientId.startsWith("admin-")) {
                  this.publishUserState()
                }
              }
            } catch (error) {
              console.error("Error processing shared state message:", error)
            }
          })

          // If we're an admin, request current state from all clients
          if (this.clientId.startsWith("admin-")) {
            this.requestCurrentState()
          }

          resolve()
        })

        this.ably.connection.on("failed", (err) => {
          console.error("Shared state connection failed:", err)
          this.isConnected = false
          reject(err)
        })
      } catch (error) {
        console.error("Error connecting to Ably shared state:", error)
        reject(error)
      }
    })
  }

  // Request current state from all clients (used by admin when connecting)
  requestCurrentState() {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot request state: not connected to Ably")
      return
    }

    console.log("Admin requesting current state from all clients")
    this.channel.publish("admin-request-state", { requesterId: this.clientId })
  }

  // Update user state
  updateUserState(userData: any) {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot update user state: not connected to Ably")
      return
    }

    console.log(`Updating user state for ${userData.id}`)
    this.channel.publish("user-update", userData)

    // Also update local cache
    this.activeUsers.set(userData.id, userData)
    this.notifyActiveUsersUpdate()
  }

  // Publish current user state (response to admin request)
  publishUserState() {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot publish user state: not connected to Ably")
      return
    }

    // Get user data from localStorage
    try {
      const clientId = localStorage.getItem("clientId")
      if (clientId) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        const userData = users[clientId]
        if (userData) {
          console.log(`Publishing user state for ${clientId}`)
          this.channel.publish("user-update", userData)
        }
      }
    } catch (error) {
      console.error("Error publishing user state:", error)
    }
  }

  // Disconnect user
  disconnectUser(userId: string) {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot disconnect user: not connected to Ably")
      return
    }

    console.log(`Publishing user disconnect for ${userId}`)
    this.channel.publish("user-disconnect", { id: userId })

    // Also update local cache
    this.activeUsers.delete(userId)
    this.notifyActiveUsersUpdate()
  }

  // Update call state
  updateCallState(callData: any) {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot update call state: not connected to Ably")
      return
    }

    console.log(`Updating call state for ${callData.id}`)
    this.channel.publish("call-update", callData)

    // Also update local cache
    this.activeCalls.set(callData.id, callData)
    this.notifyActiveCallsUpdate()
  }

  // End call
  endCall(callId: string) {
    if (!this.channel || !this.isConnected) {
      console.error("Cannot end call: not connected to Ably")
      return
    }

    console.log(`Publishing call end for ${callId}`)
    this.channel.publish("call-end", { id: callId })

    // Also update local cache
    this.activeCalls.delete(callId)
    this.notifyActiveCallsUpdate()
  }

  // Get all active users
  getActiveUsers(): any[] {
    return Array.from(this.activeUsers.values())
  }

  // Get all active calls
  getActiveCalls(): any[] {
    return Array.from(this.activeCalls.values())
  }

  // Register callback for active users updates
  onActiveUsersUpdate(callback: (users: any[]) => void) {
    this.onActiveUsersUpdateCallbacks.push(callback)
  }

  // Register callback for active calls updates
  onActiveCallsUpdate(callback: (calls: any[]) => void) {
    this.onActiveCallsUpdateCallbacks.push(callback)
  }

  // Notify all callbacks about active users update
  private notifyActiveUsersUpdate() {
    const users = this.getActiveUsers()
    for (const callback of this.onActiveUsersUpdateCallbacks) {
      callback(users)
    }
  }

  // Notify all callbacks about active calls update
  private notifyActiveCallsUpdate() {
    const calls = this.getActiveCalls()
    for (const callback of this.onActiveCallsUpdateCallbacks) {
      callback(calls)
    }
  }

  // Disconnect from Ably
  disconnect() {
    if (this.ably) {
      if (this.channel) {
        this.channel.unsubscribe()
      }
      this.ably.close()
      this.ably = null
      this.channel = null
      this.isConnected = false
    }
  }
}

// Create a singleton instance
const sharedStateService = new SharedStateService()
export default sharedStateService

