import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // Verify the token
    const decoded = verify(token, JWT_SECRET) as { id: string; role: string }

    // Check if the role is admin
    return decoded.role === "admin"
  } catch (error) {
    console.error("Token verification error:", error)
    return false
  }
}

export async function fetchAdminStats() {
  // In a real application, you would fetch this data from your database
  // This is just a placeholder
  return {
    totalUsers: 1250,
    activeUsers: 78,
    totalSessions: 5678,
    activeSessions: 42,
    averageSessionTime: 320, // in seconds
    reportedIncidents: 15,
    userGrowth: 12.5, // percentage
    sessionGrowth: 8.3, // percentage
  }
}

