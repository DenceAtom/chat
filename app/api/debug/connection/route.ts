import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    // Get active connections from localStorage on the server side
    // This is just for debugging purposes
    const activeConnections = global.localStorage?.getItem("activeConnections") || "[]"

    return NextResponse.json({
      activeConnections: JSON.parse(activeConnections),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in debug connection API:", error)
    return NextResponse.json({ error: "Failed to get debug info" }, { status: 500 })
  }
}

