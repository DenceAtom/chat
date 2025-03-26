import { v4 as uuidv4 } from "uuid"

// Match interface
export interface Match {
  id: string
  user1Id: string
  user2Id: string
  timestamp: string
  duration: number // in seconds
  isFavorited: boolean
  messages: Message[]
}

// Message interface
export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
}

// Match service
class MatchService {
  private matches: Map<string, Match> = new Map()
  private userMatches: Map<string, string[]> = new Map() // userId -> matchIds
  private isInitialized = false

  constructor() {
    // Initialize from localStorage if available
    this.initialize()
  }

  private initialize() {
    if (typeof window === "undefined" || this.isInitialized) return

    try {
      const matchesJson = localStorage.getItem("matches")
      if (matchesJson) {
        const matchesArray = JSON.parse(matchesJson) as Match[]
        matchesArray.forEach((match) => {
          this.matches.set(match.id, match)

          // Update user matches
          this.addToUserMatches(match.user1Id, match.id)
          this.addToUserMatches(match.user2Id, match.id)
        })
      }

      this.isInitialized = true
      console.log("Match service initialized with", this.matches.size, "matches")
    } catch (error) {
      console.error("Error initializing match service:", error)
    }
  }

  private addToUserMatches(userId: string, matchId: string) {
    const userMatches = this.userMatches.get(userId) || []
    if (!userMatches.includes(matchId)) {
      userMatches.push(matchId)
      this.userMatches.set(userId, userMatches)
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return

    try {
      const matchesArray = Array.from(this.matches.values())
      localStorage.setItem("matches", JSON.stringify(matchesArray))
    } catch (error) {
      console.error("Error saving match data:", error)
    }
  }

  // Create a new match
  async createMatch(user1Id: string, user2Id: string): Promise<Match> {
    const match: Match = {
      id: uuidv4(),
      user1Id,
      user2Id,
      timestamp: new Date().toISOString(),
      duration: 0,
      isFavorited: false,
      messages: [],
    }

    this.matches.set(match.id, match)
    this.addToUserMatches(user1Id, match.id)
    this.addToUserMatches(user2Id, match.id)
    this.saveToStorage()

    return match
  }

  // End a match
  async endMatch(matchId: string, duration: number): Promise<Match> {
    const match = this.matches.get(matchId)
    if (!match) throw new Error("Match not found")

    match.duration = duration
    this.matches.set(matchId, match)
    this.saveToStorage()

    return match
  }

  // Add message to match
  async addMessage(matchId: string, senderId: string, content: string): Promise<Message> {
    const match = this.matches.get(matchId)
    if (!match) throw new Error("Match not found")

    const message: Message = {
      id: uuidv4(),
      senderId,
      content,
      timestamp: new Date().toISOString(),
    }

    match.messages.push(message)
    this.matches.set(matchId, match)
    this.saveToStorage()

    return message
  }

  // Mark match as favorite
  async favoriteMatch(matchId: string): Promise<Match> {
    const match = this.matches.get(matchId)
    if (!match) throw new Error("Match not found")

    match.isFavorited = true
    this.matches.set(matchId, match)
    this.saveToStorage()

    return match
  }

  // Get user's matches
  async getUserMatches(userId: string): Promise<Match[]> {
    const matchIds = this.userMatches.get(userId) || []
    return matchIds
      .map((id) => this.matches.get(id))
      .filter((m): m is Match => m !== undefined)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Get match by ID
  async getMatchById(matchId: string): Promise<Match | null> {
    return this.matches.get(matchId) || null
  }

  // Get favorited matches
  async getFavoritedMatches(userId: string): Promise<Match[]> {
    const userMatches = await this.getUserMatches(userId)
    return userMatches.filter((match) => match.isFavorited)
  }

  // Get match between two users if exists
  async getMatchBetweenUsers(user1Id: string, user2Id: string): Promise<Match | null> {
    const user1Matches = await this.getUserMatches(user1Id)
    return (
      user1Matches.find(
        (match) =>
          (match.user1Id === user1Id && match.user2Id === user2Id) ||
          (match.user1Id === user2Id && match.user2Id === user1Id),
      ) || null
    )
  }
}

// Create singleton instance
const matchService = new MatchService()
export default matchService

