import { NextResponse } from "next/server"
import * as Ably from "ably"

// GET handler - health check
export async function GET(req: Request) {
  try {
    // Create a REST client
    const client = new Ably.Rest(process.env.ABLY_API_KEY || "")

    // Check if we can get channel info
    await client.channels.get("signaling").status()

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Ably health check failed:", error)
    return NextResponse.json({ status: "error", message: "Ably connection failed" }, { status: 500 })
  }
}

// POST handler - for any additional functionality
export async function POST(req: Request) {
  return NextResponse.json({ success: true })
}

