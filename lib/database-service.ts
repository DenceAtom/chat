import sharedStateService from "./shared-state"
import { connectToDatabase } from "./database/mongodb"

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

export interface Payment {
  id: string
  userId: string
  amount: number
  timestamp: string
  status: "completed" | "pending" | "failed"
  reason: "unquarantine" | "unban" | "other"
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

class DatabaseService {
  private isClient = typeof window !== "undefined"

  // For tracking active connections in memory
  private activeConnections: Set<string> = new Set()

  // Local cache for faster access
  private userCache: Map<string, User> = new Map()

  constructor() {
    console.log("Initializing database service")

    // Initialize localStorage if we're in the browser
    if (this.isClient) {
      this.initializeLocalStorage()
    }
  }

  private initializeLocalStorage() {
    if (!this.isClient) return

    // Initialize collections if they don't exist
    if (!localStorage.getItem("users")) {
      localStorage.setItem("users", JSON.stringify({}))
    }

    if (!localStorage.getItem("reports")) {
      localStorage.setItem("reports", JSON.stringify([]))
    }

    if (!localStorage.getItem("payments")) {
      localStorage.setItem("payments", JSON.stringify([]))
    }

    if (!localStorage.getItem("calls")) {
      localStorage.setItem("calls", JSON.stringify([]))
    }

    if (!localStorage.getItem("activeConnections")) {
      localStorage.setItem("activeConnections", JSON.stringify([]))
    }

    console.log("LocalStorage database initialized")
  }

  // User methods
  public async addUser(user: User): Promise<void> {
    try {
      // Add to cache
      this.userCache.set(user.id, user)

      // Add to MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: user.id }, { $set: user }, { upsert: true })

      // Add to localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[user.id] = user
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(user)

      console.log(`User added to database: ${user.id}`)
    } catch (error) {
      console.error(`Error adding user ${user.id}:`, error)
      throw error
    }
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      // Get current user data
      let userData: User | null = null

      // Check cache first
      if (this.userCache.has(userId)) {
        userData = { ...this.userCache.get(userId)! }
      } else {
        // Try to get from MongoDB
        const { collections } = await connectToDatabase()
        userData = await collections.users.findOne({ id: userId })

        // If not in MongoDB, check localStorage
        if (!userData && this.isClient) {
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          if (users[userId]) {
            userData = { ...users[userId] }
          }
        }
      }

      if (!userData) {
        console.warn(`Attempted to update non-existent user: ${userId}`)
        return
      }

      // Apply updates
      const updatedUser = { ...userData, ...updates }

      // Update cache
      this.userCache.set(userId, updatedUser)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: updatedUser }, { upsert: true })

      // Update localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = updatedUser
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(updatedUser)

      console.log(`User updated in database: ${userId}`)
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error)
      throw error
    }
  }

  public async getUser(userId: string): Promise<User | null> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId) || null
    }

    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const user = await collections.users.findOne({ id: userId })

      // If found in MongoDB, update cache and return
      if (user) {
        this.userCache.set(userId, user)
        return user
      }

      // If not in MongoDB, check localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        const localUser = users[userId] || null

        // Update cache if found
        if (localUser) {
          this.userCache.set(userId, localUser)
        }

        return localUser
      }

      return null
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error)

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return users[userId] || null
      }

      return null
    }
  }

  public async getAllUsers(): Promise<User[]> {
    try {
      // Get users from shared state
      const sharedUsers = sharedStateService.getActiveUsers()
      if (sharedUsers.length > 0) {
        return sharedUsers
      }

      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const users = await collections.users.find({}).toArray()

      // If found in MongoDB, return
      if (users.length > 0) {
        return users
      }

      // Fallback to localStorage
      if (this.isClient) {
        const localUsers = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(localUsers)
      }

      return []
    } catch (error) {
      console.error("Error getting all users:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users)
      }

      return []
    }
  }

  public async getActiveUsers(): Promise<User[]> {
    try {
      // Get active users from shared state
      const sharedUsers = sharedStateService.getActiveUsers()
      if (sharedUsers.length > 0) {
        return sharedUsers.filter((user: User) => user.connected)
      }

      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const users = await collections.users.find({ connected: true }).toArray()

      // If found in MongoDB, return
      if (users.length > 0) {
        return users
      }

      // Fallback to localStorage
      if (this.isClient) {
        // Get active connection IDs
        const activeConnectionIds = JSON.parse(localStorage.getItem("activeConnections") || "[]")

        // Get all users
        const users = JSON.parse(localStorage.getItem("users") || "{}")

        // Filter for active users
        const activeUsers = Object.values(users).filter((user: User) => {
          return user.connected || activeConnectionIds.includes(user.id)
        })

        console.log(`Found ${activeUsers.length} active users`)
        return activeUsers
      }

      return []
    } catch (error) {
      console.error("Error getting active users:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const activeConnectionIds = JSON.parse(localStorage.getItem("activeConnections") || "[]")
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users).filter((user: User) => user.connected || activeConnectionIds.includes(user.id))
      }

      return []
    }
  }

  public async getBannedUsers(): Promise<User[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const users = await collections.users.find({ "bannedStatus.isBanned": true }).toArray()

      // If found in MongoDB, return
      if (users.length > 0) {
        return users
      }

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users).filter((user: User) => user.bannedStatus?.isBanned)
      }

      return []
    } catch (error) {
      console.error("Error getting banned users:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users).filter((user: User) => user.bannedStatus?.isBanned)
      }

      return []
    }
  }

  public async getQuarantinedUsers(): Promise<User[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const users = await collections.users.find({ "quarantineStatus.isQuarantined": true }).toArray()

      // If found in MongoDB, return
      if (users.length > 0) {
        return users
      }

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users).filter((user: User) => user.quarantineStatus?.isQuarantined)
      }

      return []
    } catch (error) {
      console.error("Error getting quarantined users:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        return Object.values(users).filter((user: User) => user.quarantineStatus?.isQuarantined)
      }

      return []
    }
  }

  public async markUserConnected(userId: string): Promise<void> {
    this.activeConnections.add(userId)

    try {
      // Get current user data
      let userData: User | null = await this.getUser(userId)

      if (!userData) {
        // Create a new user if not found
        userData = {
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
      } else {
        // Update existing user
        userData = {
          ...userData,
          connected: true,
          lastSeen: new Date().toISOString(),
        }
      }

      // Update cache
      this.userCache.set(userId, userData)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: userData }, { upsert: true })

      // Update localStorage as fallback
      if (this.isClient) {
        // Update user
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = userData
        localStorage.setItem("users", JSON.stringify(users))

        // Update active connections
        const activeConnections = JSON.parse(localStorage.getItem("activeConnections") || "[]")
        if (!activeConnections.includes(userId)) {
          activeConnections.push(userId)
          localStorage.setItem("activeConnections", JSON.stringify(activeConnections))
        }
      }

      // Update shared state
      sharedStateService.updateUserState(userData)

      console.log(`Marked user ${userId} as connected`)
    } catch (error) {
      console.error(`Error marking user ${userId} as connected:`, error)
      throw error
    }
  }

  public async markUserDisconnected(userId: string): Promise<void> {
    this.activeConnections.delete(userId)

    try {
      // Get current user data
      const userData = await this.getUser(userId)

      if (userData) {
        // Update user data
        const updatedUser = {
          ...userData,
          connected: false,
          lastSeen: new Date().toISOString(),
        }

        // Update cache
        this.userCache.set(userId, updatedUser)

        // Update in MongoDB
        const { collections } = await connectToDatabase()
        await collections.users.updateOne({ id: userId }, { $set: updatedUser })

        // Update localStorage as fallback
        if (this.isClient) {
          // Update user
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          users[userId] = updatedUser
          localStorage.setItem("users", JSON.stringify(users))

          // Update active connections
          let activeConnections = JSON.parse(localStorage.getItem("activeConnections") || "[]")
          activeConnections = activeConnections.filter((id: string) => id !== userId)
          localStorage.setItem("activeConnections", JSON.stringify(activeConnections))
        }

        // Update shared state
        sharedStateService.disconnectUser(userId)
      }

      console.log(`Marked user ${userId} as disconnected`)
    } catch (error) {
      console.error(`Error marking user ${userId} as disconnected:`, error)
      throw error
    }
  }

  // Ban and quarantine methods
  public async banUser(userId: string, reason: string): Promise<void> {
    try {
      // Get current user data
      const userData = await this.getUser(userId)

      if (!userData) {
        console.warn(`Attempted to ban non-existent user: ${userId}`)
        return
      }

      // Update user data
      const bannedStatus = {
        isBanned: true,
        reason,
        startTime: new Date().toISOString(),
      }

      const updatedUser = {
        ...userData,
        bannedStatus,
        connected: false,
        violations: (userData.violations || 0) + 1,
      }

      // Update cache
      this.userCache.set(userId, updatedUser)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: updatedUser })

      // Update localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = updatedUser
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(updatedUser)

      console.log(`User ${userId} banned for reason: ${reason}`)
    } catch (error) {
      console.error(`Error banning user ${userId}:`, error)
      throw error
    }
  }

  public async unbanUser(userId: string): Promise<void> {
    try {
      // Get current user data
      const userData = await this.getUser(userId)

      if (!userData) {
        console.warn(`Attempted to unban non-existent user: ${userId}`)
        return
      }

      // Update user data
      const updatedUser = {
        ...userData,
        bannedStatus: null,
      }

      // Update cache
      this.userCache.set(userId, updatedUser)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: updatedUser })

      // Update localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = updatedUser
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(updatedUser)

      console.log(`User ${userId} unbanned`)
    } catch (error) {
      console.error(`Error unbanning user ${userId}:`, error)
      throw error
    }
  }

  public async quarantineUser(userId: string, reason: string, level = 1): Promise<void> {
    try {
      // Get current user data
      const userData = await this.getUser(userId)

      if (!userData) {
        console.warn(`Attempted to quarantine non-existent user: ${userId}`)
        return
      }

      // Calculate quarantine duration based on level
      let durationMs = 5 * 60 * 1000 // Level 1: 5 minutes
      if (level === 2) durationMs = 30 * 60 * 1000 // Level 2: 30 minutes
      if (level === 3) durationMs = 3 * 60 * 60 * 1000 // Level 3: 3 hours

      const startTime = new Date().toISOString()
      const endTime = new Date(Date.now() + durationMs).toISOString()

      // Update user data
      const quarantineStatus = {
        isQuarantined: true,
        reason,
        startTime,
        endTime,
        level,
      }

      const updatedUser = {
        ...userData,
        quarantineStatus,
        connected: false,
        violations: (userData.violations || 0) + 1,
      }

      // Update cache
      this.userCache.set(userId, updatedUser)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: updatedUser })

      // Update localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = updatedUser
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(updatedUser)

      console.log(`User ${userId} quarantined for ${durationMs / 60000} minutes, reason: ${reason}`)
    } catch (error) {
      console.error(`Error quarantining user ${userId}:`, error)
      throw error
    }
  }

  public async unquarantineUser(userId: string): Promise<void> {
    try {
      // Get current user data
      const userData = await this.getUser(userId)

      if (!userData) {
        console.warn(`Attempted to unquarantine non-existent user: ${userId}`)
        return
      }

      // Update user data
      const updatedUser = {
        ...userData,
        quarantineStatus: null,
      }

      // Update cache
      this.userCache.set(userId, updatedUser)

      // Update in MongoDB
      const { collections } = await connectToDatabase()
      await collections.users.updateOne({ id: userId }, { $set: updatedUser })

      // Update localStorage as fallback
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        users[userId] = updatedUser
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update shared state
      sharedStateService.updateUserState(updatedUser)

      console.log(`User ${userId} removed from quarantine`)
    } catch (error) {
      console.error(`Error unquarantining user ${userId}:`, error)
      throw error
    }
  }

  public async isUserBannedOrQuarantined(
    userId: string,
  ): Promise<{ isBanned: boolean; isQuarantined: boolean; endTime?: string }> {
    const user = await this.getUser(userId)

    if (!user) {
      return { isBanned: false, isQuarantined: false }
    }

    // Check if quarantine has expired
    if (user.quarantineStatus?.isQuarantined) {
      const endTime = new Date(user.quarantineStatus.endTime).getTime()
      const now = Date.now()

      if (now >= endTime) {
        // Quarantine has expired, remove it
        await this.unquarantineUser(userId)
        return { isBanned: false, isQuarantined: false }
      }

      return {
        isBanned: false,
        isQuarantined: true,
        endTime: user.quarantineStatus.endTime,
      }
    }

    return {
      isBanned: user.bannedStatus?.isBanned || false,
      isQuarantined: false,
    }
  }

  // Report methods
  public async addReport(report: Report): Promise<void> {
    try {
      // Add report to MongoDB
      const { collections } = await connectToDatabase()
      await collections.reports.insertOne(report)

      // Increment report count for the user
      await collections.users.updateOne({ id: report.userId }, { $inc: { reportCount: 1 } })

      // Update localStorage as fallback
      if (this.isClient) {
        // Add report to localStorage
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        reports.push(report)
        localStorage.setItem("reports", JSON.stringify(reports))

        // Increment report count for the user
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        if (users[report.userId]) {
          users[report.userId].reportCount = (users[report.userId].reportCount || 0) + 1
          localStorage.setItem("users", JSON.stringify(users))

          // Update cache
          const cachedUser = this.userCache.get(report.userId)
          if (cachedUser) {
            cachedUser.reportCount += 1
            this.userCache.set(report.userId, cachedUser)
          }

          // Update shared state
          sharedStateService.updateUserState(users[report.userId])
        }
      }

      console.log(`Report ${report.id} added against user ${report.userId}`)
    } catch (error) {
      console.error(`Error adding report ${report.id}:`, error)
      throw error
    }
  }

  public async updateReport(reportId: string, updates: Partial<Report>): Promise<void> {
    try {
      // Update report in MongoDB
      const { collections } = await connectToDatabase()
      await collections.reports.updateOne({ id: reportId }, { $set: updates })

      // Update localStorage as fallback
      if (this.isClient) {
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        const reportIndex = reports.findIndex((r: Report) => r.id === reportId)

        if (reportIndex !== -1) {
          reports[reportIndex] = { ...reports[reportIndex], ...updates }
          localStorage.setItem("reports", JSON.stringify(reports))
        }
      }

      console.log(`Report ${reportId} updated`)
    } catch (error) {
      console.error(`Error updating report ${reportId}:`, error)
      throw error
    }
  }

  public async getReport(reportId: string): Promise<Report | null> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const report = await collections.reports.findOne({ id: reportId })

      // If found in MongoDB, return
      if (report) {
        return report
      }

      // Fallback to localStorage
      if (this.isClient) {
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        return reports.find((r: Report) => r.id === reportId) || null
      }

      return null
    } catch (error) {
      console.error(`Error getting report ${reportId}:`, error)

      // Fallback to localStorage
      if (this.isClient) {
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        return reports.find((r: Report) => r.id === reportId) || null
      }

      return null
    }
  }

  public async getAllReports(): Promise<Report[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const reports = await collections.reports.find({}).toArray()

      // If found in MongoDB, return
      if (reports.length > 0) {
        return reports
      }

      // Fallback to localStorage
      if (this.isClient) {
        return JSON.parse(localStorage.getItem("reports") || "[]")
      }

      return []
    } catch (error) {
      console.error("Error getting all reports:", error)

      // Fallback to localStorage
      if (this.isClient) {
        return JSON.parse(localStorage.getItem("reports") || "[]")
      }

      return []
    }
  }

  public async getPendingReports(): Promise<Report[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const reports = await collections.reports.find({ status: "pending" }).toArray()

      // If found in MongoDB, return
      if (reports.length > 0) {
        return reports
      }

      // Fallback to localStorage
      if (this.isClient) {
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        return reports.filter((r: Report) => r.status === "pending")
      }

      return []
    } catch (error) {
      console.error("Error getting pending reports:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        return reports.filter((r: Report) => r.status === "pending")
      }

      return []
    }
  }

  // Payment methods
  public async addPayment(payment: Payment): Promise<void> {
    try {
      // Add payment to MongoDB
      const { collections } = await connectToDatabase()
      await collections.payments.insertOne(payment)

      // Add to localStorage as fallback
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        payments.push(payment)
        localStorage.setItem("payments", JSON.stringify(payments))
      }

      console.log(`Payment ${payment.id} added for user ${payment.userId}`)
    } catch (error) {
      console.error(`Error adding payment ${payment.id}:`, error)
      throw error
    }
  }

  public async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
    try {
      // Update payment in MongoDB
      const { collections } = await connectToDatabase()
      await collections.payments.updateOne({ id: paymentId }, { $set: updates })

      // Update localStorage as fallback
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        const paymentIndex = payments.findIndex((p: Payment) => p.id === paymentId)

        if (paymentIndex !== -1) {
          payments[paymentIndex] = { ...payments[paymentIndex], ...updates }
          localStorage.setItem("payments", JSON.stringify(payments))
        }
      }

      console.log(`Payment ${paymentId} updated`)
    } catch (error) {
      console.error(`Error updating payment ${paymentId}:`, error)
      throw error
    }
  }

  public async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const payment = await collections.payments.findOne({ id: paymentId })

      // If found in MongoDB, return
      if (payment) {
        return payment
      }

      // Fallback to localStorage
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        return payments.find((p: Payment) => p.id === paymentId) || null
      }

      return null
    } catch (error) {
      console.error(`Error getting payment ${paymentId}:`, error)

      // Fallback to localStorage
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        return payments.find((p: Payment) => p.id === paymentId) || null
      }

      return null
    }
  }

  public async getAllPayments(): Promise<Payment[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const payments = await collections.payments.find({}).toArray()

      // If found in MongoDB, return
      if (payments.length > 0) {
        return payments
      }

      // Fallback to localStorage
      if (this.isClient) {
        return JSON.parse(localStorage.getItem("payments") || "[]")
      }

      return []
    } catch (error) {
      console.error("Error getting all payments:", error)

      // Fallback to localStorage
      if (this.isClient) {
        return JSON.parse(localStorage.getItem("payments") || "[]")
      }

      return []
    }
  }

  public async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const payments = await collections.payments.find({ userId }).toArray()

      // If found in MongoDB, return
      if (payments.length > 0) {
        return payments
      }

      // Fallback to localStorage
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        return payments.filter((p: Payment) => p.userId === userId)
      }

      return []
    } catch (error) {
      console.error(`Error getting payments for user ${userId}:`, error)

      // Fallback to localStorage
      if (this.isClient) {
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")
        return payments.filter((p: Payment) => p.userId === userId)
      }

      return []
    }
  }

  // Call tracking methods
  public async trackActiveCall(callId: string, user1Id: string, user2Id: string): Promise<void> {
    try {
      const call: Call = {
        id: callId,
        user1Id,
        user2Id,
        startTime: new Date().toISOString(),
        status: "active",
      }

      // Add call to MongoDB
      const { collections } = await connectToDatabase()
      await collections.calls.insertOne(call)

      // Add to localStorage as fallback
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        calls.push(call)
        localStorage.setItem("calls", JSON.stringify(calls))
      }

      // Update shared state
      sharedStateService.updateCallState(call)

      console.log(`Call ${callId} started between ${user1Id} and ${user2Id}`)
    } catch (error) {
      console.error(`Error tracking call ${callId}:`, error)
      throw error
    }
  }

  public async endActiveCall(callId: string, reason: string): Promise<void> {
    try {
      const endTime = new Date().toISOString()

      // Get call from MongoDB
      const { collections } = await connectToDatabase()
      const call = await collections.calls.findOne({ id: callId })

      if (call) {
        const startTime = new Date(call.startTime).getTime()
        const duration = Math.floor((new Date().getTime() - startTime) / 1000)

        // Update call in MongoDB
        await collections.calls.updateOne(
          { id: callId },
          {
            $set: {
              endTime,
              duration,
              status: "ended",
              endReason: reason,
            },
          },
        )
      }

      // Update localStorage as fallback
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        const callIndex = calls.findIndex((c: Call) => c.id === callId)

        if (callIndex !== -1) {
          const call = calls[callIndex]
          const startTime = new Date(call.startTime).getTime()
          const duration = Math.floor((new Date().getTime() - startTime) / 1000)

          calls[callIndex] = {
            ...call,
            endTime,
            duration,
            status: "ended",
            endReason: reason,
          }

          localStorage.setItem("calls", JSON.stringify(calls))
        }
      }

      // Update shared state
      sharedStateService.endCall(callId)

      console.log(`Call ${callId} ended. Reason: ${reason}`)
    } catch (error) {
      console.error(`Error ending call ${callId}:`, error)
      throw error
    }
  }

  public async getActiveCalls(): Promise<Call[]> {
    try {
      // Get active calls from shared state
      const sharedCalls = sharedStateService.getActiveCalls()
      if (sharedCalls.length > 0) {
        return sharedCalls
      }

      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const calls = await collections.calls.find({ status: "active" }).toArray()

      // If found in MongoDB, return
      if (calls.length > 0) {
        return calls
      }

      // Fallback to localStorage
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        return calls.filter((c: Call) => c.status === "active")
      }

      return []
    } catch (error) {
      console.error("Error getting active calls:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        return calls.filter((c: Call) => c.status === "active")
      }

      return []
    }
  }

  public async getUserActiveCalls(userId: string): Promise<Call[]> {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()
      const calls = await collections.calls
        .find({
          $or: [{ user1Id: userId }, { user2Id: userId }],
          status: "active",
        })
        .toArray()

      // If found in MongoDB, return
      if (calls.length > 0) {
        return calls
      }

      // Fallback to localStorage
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        return calls.filter((c: Call) => (c.user1Id === userId || c.user2Id === userId) && c.status === "active")
      }

      return []
    } catch (error) {
      console.error(`Error getting active calls for user ${userId}:`, error)

      // Fallback to localStorage
      if (this.isClient) {
        const calls = JSON.parse(localStorage.getItem("calls") || "[]")
        return calls.filter((c: Call) => (c.user1Id === userId || c.user2Id === userId) && c.status === "active")
      }

      return []
    }
  }

  // Stats methods
  public async getStats() {
    try {
      // Try to get from MongoDB
      const { collections } = await connectToDatabase()

      const totalUsers = await collections.users.countDocuments()
      const activeUsers = await collections.users.countDocuments({ connected: true })
      const bannedUsers = await collections.users.countDocuments({ "bannedStatus.isBanned": true })
      const quarantinedUsers = await collections.users.countDocuments({ "quarantineStatus.isQuarantined": true })
      const pendingReports = await collections.reports.countDocuments({ status: "pending" })
      const totalReports = await collections.reports.countDocuments()
      const totalPayments = await collections.payments.countDocuments()

      // Get completed payments and calculate revenue
      const completedPayments = await collections.payments.find({ status: "completed" }).toArray()
      const revenueTotal = completedPayments.reduce((sum, p) => sum + p.amount, 0)

      return {
        totalUsers,
        activeUsers,
        bannedUsers,
        quarantinedUsers,
        pendingReports,
        totalReports,
        totalPayments,
        revenueTotal,
      }
    } catch (error) {
      console.error("Error getting stats from MongoDB:", error)

      // Fallback to localStorage
      if (this.isClient) {
        const users = JSON.parse(localStorage.getItem("users") || "{}")
        const reports = JSON.parse(localStorage.getItem("reports") || "[]")
        const payments = JSON.parse(localStorage.getItem("payments") || "[]")

        // Get active users from shared state
        const activeUsers = sharedStateService.getActiveUsers().length

        const totalUsers = Object.keys(users).length
        const bannedUsers = Object.values(users).filter((u: User) => u.bannedStatus?.isBanned).length
        const quarantinedUsers = Object.values(users).filter((u: User) => u.quarantineStatus?.isQuarantined).length
        const pendingReports = reports.filter((r: Report) => r.status === "pending").length
        const totalReports = reports.length
        const totalPayments = payments.length
        const completedPayments = payments.filter((p: Payment) => p.status === "completed")
        const revenueTotal = completedPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0)

        return {
          totalUsers,
          activeUsers,
          bannedUsers,
          quarantinedUsers,
          pendingReports,
          totalReports,
          totalPayments,
          revenueTotal,
        }
      }

      return {
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        quarantinedUsers: 0,
        pendingReports: 0,
        totalReports: 0,
        totalPayments: 0,
        revenueTotal: 0,
      }
    }
  }
}

// Create a singleton instance
const databaseService = new DatabaseService()
export default databaseService

