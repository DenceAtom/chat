import { type NextRequest, NextResponse } from "next/server"
import { unbanUser } from "@/lib/services/adminService"
import { verifyAdminToken } from "@/lib/middleware/adminAuth"

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const adminData = await verifyAdminToken(request)
    if (!adminData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const result = await unbanUser(userId, adminData.id, reason || "Unban by admin")

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error unbanning user:", error)
    return NextResponse.json({ error: "Failed to unban user" }, { status: 500 })
  }
}

