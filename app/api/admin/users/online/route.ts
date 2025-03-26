import { type NextRequest, NextResponse } from "next/server"
import { getAllOnlineUsers } from "@/lib/services/adminService"
import { verifyAdminToken } from "@/lib/middleware/adminAuth"

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminData = await verifyAdminToken(request)
    if (!adminData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const onlineUsers = await getAllOnlineUsers()

    return NextResponse.json({ users: onlineUsers })
  } catch (error) {
    console.error("Error fetching online users:", error)
    return NextResponse.json({ error: "Failed to fetch online users" }, { status: 500 })
  }
}

