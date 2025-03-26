import { NextResponse } from "next/server"
import databaseService from "@/lib/database-service"
import { cookies } from "next/headers"

// Check admin authentication
function isAuthenticated() {
  const cookieStore = cookies()
  return cookieStore.get("admin_auth")?.value === "authenticated"
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stats = databaseService.getStats()
  return NextResponse.json({ stats })
}

