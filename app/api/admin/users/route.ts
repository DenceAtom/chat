import { NextResponse } from "next/server"
import databaseService from "@/lib/database-service"
import { cookies } from "next/headers"

// Check admin authentication
function isAuthenticated() {
  const cookieStore = cookies()
  return cookieStore.get("admin_auth")?.value === "authenticated"
}

export async function GET(req: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter")

  console.log(`API: Fetching users with filter: ${filter}`)

  let users = []
  try {
    switch (filter) {
      case "active":
        users = await databaseService.getActiveUsers()
        break
      case "banned":
        users = await databaseService.getBannedUsers()
        break
      case "quarantined":
        users = await databaseService.getQuarantinedUsers()
        break
      default:
        users = await databaseService.getAllUsers()
    }

    // Log the users for debugging
    console.log(`API: Fetched ${users.length} users with filter: ${filter}`)

    // For active users, log their IDs
    if (filter === "active") {
      console.log(
        "Active user IDs:",
        users.map((u) => u.id),
      )
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error(`Error fetching users with filter ${filter}:`, error)
    return NextResponse.json({ error: "Failed to fetch users", users: [] }, { status: 500 })
  }
}

