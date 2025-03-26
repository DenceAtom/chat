import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    // Check if MongoDB URI is available
    if (!process.env.MONGODB_URI) {
      console.warn("MONGODB_URI environment variable is not set")
      return NextResponse.json(
        {
          error: "Database connection not configured",
          activeChatCount: 0,
        },
        { status: 503 },
      )
    }

    const db = await connectToDatabase()
    const chatsCollection = db.collection("chats")

    // Find active chats (those with an active status)
    const activeChatCount = await chatsCollection.countDocuments({ status: "active" })

    return NextResponse.json({ activeChatCount })
  } catch (error) {
    console.error("Error fetching active chats:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch active chats",
        activeChatCount: 0,
      },
      { status: 500 },
    )
  }
}

