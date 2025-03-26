import { type NextRequest, NextResponse } from "next/server"
import { getOnlineUsers, verifyAdminToken } from "@/lib/services/adminService"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get("status")

    let users

    if (status === "online") {
      users = await getOnlineUsers()
    } else {
      // Get all users with pagination
      const { db } = await connectToDatabase()
      users = await db.collection("users").find({}).limit(100).toArray()
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

