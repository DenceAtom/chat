import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"

export async function POST(req: Request) {
  try {
    const { callId, user1Id, user2Id } = await req.json()

    if (!callId || !user1Id || !user2Id) {
      return NextResponse.json({ error: "Call ID and user IDs are required" }, { status: 400 })
    }

    const { collections } = await connectToDatabase()

    const call = {
      id: callId,
      user1Id,
      user2Id,
      startTime: new Date().toISOString(),
      status: "active",
    }

    await collections.calls.insertOne(call)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking call:", error)
    return NextResponse.json({ error: "Failed to track call" }, { status: 500 })
  }
}

