import { NextResponse } from "next/server"
import databaseService from "@/lib/database-service"
import { cookies } from "next/headers"

// Check admin authentication
function isAuthenticated() {
  const cookieStore = cookies()
  return cookieStore.get("admin_auth")?.value === "authenticated"
}

export async function GET(req: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get active calls from the database
  const activeCalls = databaseService.getActiveCalls()

  // Calculate duration for each call
  const callsWithDuration = activeCalls.map((call) => {
    const startTime = new Date(call.startTime).getTime()
    const duration = Math.floor((new Date().getTime() - startTime) / 1000)

    return {
      ...call,
      duration,
    }
  })

  return NextResponse.json({ calls: callsWithDuration })
}

