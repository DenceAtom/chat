import { NextResponse } from "next/server"
import databaseService from "@/lib/database-service"
import { cookies } from "next/headers"

// Check admin authentication
function isAuthenticated() {
  const cookieStore = cookies()
  return cookieStore.get("admin_auth")?.value === "authenticated"
}

export async function POST(req: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, userId, reason, level } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    switch (action) {
      case "ban":
        databaseService.banUser(userId, reason || "Violation of terms")
        return NextResponse.json({ success: true, message: "User banned successfully" })

      case "unban":
        databaseService.unbanUser(userId)
        return NextResponse.json({ success: true, message: "User unbanned successfully" })

      case "quarantine":
        databaseService.quarantineUser(userId, reason || "Violation of terms", level || 1)
        return NextResponse.json({ success: true, message: "User quarantined successfully" })

      case "unquarantine":
        databaseService.unquarantineUser(userId)
        return NextResponse.json({ success: true, message: "User removed from quarantine successfully" })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing admin action:", error)
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 })
  }
}

