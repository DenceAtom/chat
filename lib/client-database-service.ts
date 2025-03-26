// This is a client-side service that uses API routes to interact with the database
// It doesn't import MongoDB directly, so it's safe to use in client components

export interface User {
  id: string
  ip: string
  country: string | null
  connectionTime: string
  lastSeen: string
  connected: boolean
  reportCount: number
  violations: number
  quarantineStatus: {
    isQuarantined: boolean
    reason: string
    startTime: string
    endTime: string
    level: number // 1 = 5min, 2 = 30min, 3 = 3hours
  } | null
  bannedStatus: {
    isBanned: boolean
    reason: string
    startTime: string
  } | null
}

export interface Report {
  id: string
  userId: string
  reportedBy: string
  reason: string
  details: string
  timestamp: string
  status: "pending" | "resolved" | "dismissed"
  screenshot: string | null
}

export interface Call {
  id: string
  user1Id: string
  user2Id: string
  startTime: string
  endTime?: string
  duration?: number
  status: "active" | "ended"
  endReason?: string
}

class ClientDatabaseService {
  // For tracking active connections in memory (supplement to database)
  private activeConnections: Set<string> = new Set()

  // Register or update a user
  async registerUser(id: string, ip: string, country: string | null): Promise<void> {
    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ip, country }),
      })

      if (!response.ok) {
        throw new Error(`Failed to register user: ${response.statusText}`)
      }

      console.log(`User ${id} registered/updated`)
    } catch (error) {
      console.error("Error registering user:", error)
    }
  }

  // Check if a user is banned or quarantined
  async isUserBannedOrQuarantined(
    userId: string,
  ): Promise<{ isBanned: boolean; isQuarantined: boolean; endTime?: string }> {
    try {
      const response = await fetch(`/api/users/status?userId=${userId}`)

      if (!response.ok) {
        throw new Error(`Failed to check user status: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error checking user status:", error)
      return { isBanned: false, isQuarantined: false }
    }
  }

  // Mark a user as connected
  async markUserConnected(userId: string): Promise<void> {
    this.activeConnections.add(userId)

    try {
      // First, update the local storage for immediate feedback
      const usersJson = localStorage.getItem("users") || "{}"
      const users = JSON.parse(usersJson)

      if (users[userId]) {
        users[userId].connected = true
        users[userId].lastSeen = new Date().toISOString()
      } else {
        users[userId] = {
          id: userId,
          ip: "127.0.0.1", // Placeholder
          country: null,
          connectionTime: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          connected: true,
          reportCount: 0,
          violations: 0,
          quarantineStatus: null,
          bannedStatus: null,
        }
      }

      localStorage.setItem("users", JSON.stringify(users))

      // Also update the activeConnections in localStorage for the admin panel
      const activeConnectionsJson = localStorage.getItem("activeConnections") || "[]"
      const activeConnections = JSON.parse(activeConnectionsJson)

      if (!activeConnections.includes(userId)) {
        activeConnections.push(userId)
        localStorage.setItem("activeConnections", JSON.stringify(activeConnections))
      }

      // Then, update the server
      await fetch("/api/users/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, status: "connected" }),
      })

      console.log(`User ${userId} marked as connected`)
    } catch (error) {
      console.error("Error marking user as connected:", error)
    }
  }

  // Mark a user as disconnected
  async markUserDisconnected(userId: string): Promise<void> {
    this.activeConnections.delete(userId)

    try {
      // First, update the local storage for immediate feedback
      const usersJson = localStorage.getItem("users") || "{}"
      const users = JSON.parse(usersJson)

      if (users[userId]) {
        users[userId].connected = false
        users[userId].lastSeen = new Date().toISOString()
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Also update the activeConnections in localStorage for the admin panel
      const activeConnectionsJson = localStorage.getItem("activeConnections") || "[]"
      let activeConnections = JSON.parse(activeConnectionsJson)

      activeConnections = activeConnections.filter((id: string) => id !== userId)
      localStorage.setItem("activeConnections", JSON.stringify(activeConnections))

      // Then, update the server
      await fetch("/api/users/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, status: "disconnected" }),
      })

      console.log(`User ${userId} marked as disconnected`)
    } catch (error) {
      console.error("Error marking user as disconnected:", error)
    }
  }

  // Track an active call
  async trackActiveCall(callId: string, user1Id: string, user2Id: string): Promise<void> {
    try {
      await fetch("/api/calls/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId, user1Id, user2Id }),
      })

      console.log(`Call ${callId} tracked between ${user1Id} and ${user2Id}`)
    } catch (error) {
      console.error("Error tracking call:", error)
    }
  }

  // End an active call
  async endActiveCall(callId: string, reason: string): Promise<void> {
    try {
      await fetch("/api/calls/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId, reason }),
      })

      console.log(`Call ${callId} ended. Reason: ${reason}`)
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  // Submit a report
  async addReport(report: Omit<Report, "id">): Promise<void> {
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(report),
      })

      console.log(`Report submitted against user ${report.userId}`)
    } catch (error) {
      console.error("Error submitting report:", error)
    }
  }

  // Get user quarantine status
  async getUserQuarantineStatus(userId: string): Promise<{ isQuarantined: boolean; quarantineInfo?: any }> {
    try {
      const response = await fetch(`/api/users/quarantine?userId=${userId}`)

      if (!response.ok) {
        throw new Error(`Failed to check quarantine status: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error checking quarantine status:", error)
      return { isQuarantined: false }
    }
  }

  // Process a payment
  async processPayment(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, amount, reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || "Payment failed" }
      }

      const data = await response.json()
      return { success: true, paymentId: data.paymentId }
    } catch (error) {
      console.error("Error processing payment:", error)
      return { success: false, error: "Failed to process payment" }
    }
  }

  // Add methods to support the existing database-service.ts functionality
  // These are simplified versions that use the client-side memory or localStorage

  getUser(userId: string): User | null {
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use localStorage as a simple cache
      const usersJson = localStorage.getItem("users")
      if (usersJson) {
        const users = JSON.parse(usersJson)
        return users[userId] || null
      }
      return null
    } catch (error) {
      console.error("Error getting user:", error)
      return null
    }
  }

  updateUser(userId: string, updates: Partial<User>): void {
    try {
      // In a real implementation, this would call an API
      // For now, we'll use localStorage as a simple cache
      const usersJson = localStorage.getItem("users") || "{}"
      const users = JSON.parse(usersJson)

      users[userId] = { ...users[userId], ...updates }
      localStorage.setItem("users", JSON.stringify(users))
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  addUser(user: User): void {
    try {
      // In a real implementation, this would call an API
      // For now, we'll use localStorage as a simple cache
      const usersJson = localStorage.getItem("users") || "{}"
      const users = JSON.parse(usersJson)

      users[user.id] = user
      localStorage.setItem("users", JSON.stringify(users))

      // Also register the user with the server
      this.registerUser(user.id, user.ip, user.country)
    } catch (error) {
      console.error("Error adding user:", error)
    }
  }
}

// Create a singleton instance
const clientDatabaseService = new ClientDatabaseService()
export default clientDatabaseService

