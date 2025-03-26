import { type NextRequest, NextResponse } from "next/server"
import { banUser } from "@/lib/services/adminService"
import { verifyAdminToken } from "@/lib/middleware/adminAuth"

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const adminData = await verifyAdminToken(request)
    if (!adminData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, reason, duration } = await request.json()

    if (!userId || !reason) {
      return NextResponse.json({ error: "User ID and reason are required" }, { status: 400 })
    }

    const result = await banUser(userId, adminData.id, reason, duration)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error banning user:", error)
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 })
  }
}

