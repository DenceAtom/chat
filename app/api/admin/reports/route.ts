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

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  let reports
  if (status === "pending") {
    reports = databaseService.getPendingReports()
  } else {
    reports = databaseService.getAllReports()
  }

  return NextResponse.json({ reports })
}

export async function PATCH(req: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { reportId, status } = await req.json()

    if (!reportId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    databaseService.updateReport(reportId, { status })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}

