import { type NextRequest, NextResponse } from "next/server"
import { getActiveChats } from "@/lib/services/adminService"
import { verifyAdminToken } from "@/lib/middleware/adminAuth"

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminData = await verifyAdminToken(request)
    if (!adminData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const activeChats = await getActiveChats()

    return NextResponse.json({ chats: activeChats })
  } catch (error) {
    console.error("Error fetching active chats:", error)
    return NextResponse.json({ error: "Failed to fetch active chats" }, { status: 500 })
  }
}

