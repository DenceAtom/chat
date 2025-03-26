import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"

export async function POST(req: Request) {
  try {
    const { callId, reason } = await req.json()

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 })
    }

    const { collections } = await connectToDatabase()

    const call = await collections.calls.findOne({ id: callId })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    const endTime = new Date().toISOString()
    const startTime = new Date(call.startTime).getTime()
    const duration = Math.floor((new Date().getTime() - startTime) / 1000)

    await collections.calls.updateOne(
      { id: callId },
      {
        $set: {
          endTime,
          duration,
          status: "ended",
          endReason: reason,
        },
      },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error ending call:", error)
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 })
  }
}

