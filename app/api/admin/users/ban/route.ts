import { type NextRequest, NextResponse } from "next/server"
import { banUser, verifyAdminToken } from "@/lib/services/adminService"

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

    const { userId, reason } = await request.json()

    if (!userId || !reason) {
      return NextResponse.json({ error: "User ID and reason are required" }, { status: 400 })
    }

    const result = await banUser(userId, reason)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error banning user:", error)
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 })
  }
}

