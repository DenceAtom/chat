import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"

export async function POST(req: Request) {
  try {
    const { userId, status } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { collections } = await connectToDatabase()

    await collections.users.updateOne(
      { id: userId },
      {
        $set: {
          connected: status === "connected",
          lastSeen: new Date().toISOString(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating connection status:", error)
    return NextResponse.json({ error: "Failed to update connection status" }, { status: 500 })
  }
}

