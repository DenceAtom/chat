import { v4 as uuidv4 } from "uuid"

// User interface
export interface User {
  id: string
  username: string
  email: string
  password: string // In a real app, this would be hashed
  createdAt: string
  favorites: string[] // Array of user IDs
  blockedUsers: string[] // Array of user IDs
  isOnline: boolean
  lastSeen: string
  profilePicture?: string
  bio?: string
}

// Authentication service
class AuthService {
  private users: Map<string, User> = new Map()
  private sessions: Map<string, string> = new Map() // sessionId -> userId
  private isInitialized = false

  constructor() {
    // Initialize from localStorage if available
    this.initialize()
  }

  private initialize() {
    if (typeof window === "undefined" || this.isInitialized) return

    try {
      const usersJson = localStorage.getItem("auth_users")
      if (usersJson) {
        const usersArray = JSON.parse(usersJson) as User[]
        usersArray.forEach((user) => {
          this.users.set(user.id, user)
        })
      }

      const sessionsJson = localStorage.getItem("auth_sessions")
      if (sessionsJson) {
        const sessionsObj = JSON.parse(sessionsJson) as Record<string, string>
        Object.entries(sessionsObj).forEach(([sessionId, userId]) => {
          this.sessions.set(sessionId, userId)
        })
      }

      this.isInitialized = true
      console.log("Auth service initialized with", this.users.size, "users")
    } catch (error) {
      console.error("Error initializing auth service:", error)
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return

    try {
      const usersArray = Array.from(this.users.values())
      localStorage.setItem("auth_users", JSON.stringify(usersArray))

      const sessionsObj = Object.fromEntries(this.sessions.entries())
      localStorage.setItem("auth_sessions", JSON.stringify(sessionsObj))
    } catch (error) {
      console.error("Error saving auth data:", error)
    }
  }

  // Register a new user
  async register(username: string, email: string, password: string): Promise<User> {
    // Check if email already exists
    const existingUser = Array.from(this.users.values()).find((u) => u.email === email)
    if (existingUser) {
      throw new Error("Email already registered")
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      password, // In a real app, this would be hashed
      createdAt: new Date().toISOString(),
      favorites: [],
      blockedUsers: [],
      isOnline: true,
      lastSeen: new Date().toISOString(),
    }

    // Save user
    this.users.set(newUser.id, newUser)
    this.saveToStorage()

    return newUser
  }

  // Login user
  async login(email: string, password: string): Promise<{ user: User; sessionId: string }> {
    // Find user by email
    const user = Array.from(this.users.values()).find((u) => u.email === email)
    if (!user) {
      throw new Error("Invalid email or password")
    }

    // Check password
    if (user.password !== password) {
      throw new Error("Invalid email or password")
    }

    // Create session
    const sessionId = uuidv4()
    this.sessions.set(sessionId, user.id)

    // Update user status
    user.isOnline = true
    user.lastSeen = new Date().toISOString()
    this.users.set(user.id, user)

    this.saveToStorage()

    return { user, sessionId }
  }

  // Logout user
  async logout(sessionId: string): Promise<void> {
    const userId = this.sessions.get(sessionId)
    if (userId) {
      // Update user status
      const user = this.users.get(userId)
      if (user) {
        user.isOnline = false
        user.lastSeen = new Date().toISOString()
        this.users.set(userId, user)
      }

      // Remove session
      this.sessions.delete(sessionId)
      this.saveToStorage()
    }
  }

  // Get current user from session
  async getCurrentUser(sessionId: string): Promise<User | null> {
    const userId = this.sessions.get(sessionId)
    if (!userId) return null

    return this.users.get(userId) || null
  }

  // Add user to favorites
  async addToFavorites(userId: string, favoriteId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) throw new Error("User not found")

    if (!user.favorites.includes(favoriteId)) {
      user.favorites.push(favoriteId)
      this.users.set(userId, user)
      this.saveToStorage()
    }
  }

  // Remove user from favorites
  async removeFromFavorites(userId: string, favoriteId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) throw new Error("User not found")

    user.favorites = user.favorites.filter((id) => id !== favoriteId)
    this.users.set(userId, user)
    this.saveToStorage()
  }

  // Block a user
  async blockUser(userId: string, blockedId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) throw new Error("User not found")

    if (!user.blockedUsers.includes(blockedId)) {
      user.blockedUsers.push(blockedId)

      // Also remove from favorites if present
      user.favorites = user.favorites.filter((id) => id !== blockedId)

      this.users.set(userId, user)
      this.saveToStorage()
    }
  }

  // Unblock a user
  async unblockUser(userId: string, blockedId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) throw new Error("User not found")

    user.blockedUsers = user.blockedUsers.filter((id) => id !== blockedId)
    this.users.set(userId, user)
    this.saveToStorage()
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null
  }

  // Get favorite users
  async getFavoriteUsers(userId: string): Promise<User[]> {
    const user = this.users.get(userId)
    if (!user) return []

    return user.favorites.map((id) => this.users.get(id)).filter((u): u is User => u !== undefined)
  }
}

// Create singleton instance
const authService = new AuthService()
export default authService

