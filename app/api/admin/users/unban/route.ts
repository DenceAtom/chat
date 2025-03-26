import { type NextRequest, NextResponse } from "next/server"
import { unbanUser, verifyAdminToken } from "@/lib/services/adminService"

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const adminData = verifyAdminToken(token)

    if (!adminData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const result = await unbanUser(userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error unbanning user:", error)
    return NextResponse.json({ error: "Failed to unban user" }, { status: 500 })
  }
}

