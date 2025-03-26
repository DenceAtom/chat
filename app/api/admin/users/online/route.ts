import { NextResponse } from "next/server"
import { getAllOnlineUsers } from "@/lib/services/adminService"
import { verifyAdminToken } from "@/lib/services/adminService"

export async function GET(request: Request) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const admin = verifyAdminToken(token)

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const onlineUsers = await getAllOnlineUsers()

    return NextResponse.json({ users: onlineUsers })
  } catch (error) {
    console.error("Error fetching online users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

