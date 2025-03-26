import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: Request) {
  try {
    const { reason, details, screenshot, reportedUserId, reportedBy, timestamp } = await req.json()

    // Create a new report
    const report = {
      id: `report-${uuidv4()}`,
      userId: reportedUserId,
      reportedBy: reportedBy || "anonymous",
      reason,
      details,
      timestamp: timestamp || new Date().toISOString(),
      status: "pending" as const,
      screenshot,
    }

    // Store the report in the database
    const { collections } = await connectToDatabase()
    await collections.reports.insertOne(report)

    // Increment report count for the user
    await collections.users.updateOne({ id: reportedUserId }, { $inc: { reportCount: 1 } })

    // Check if the user has exceeded the report threshold
    const user = await collections.users.findOne({ id: reportedUserId })
    if (user && user.reportCount >= 3 && !user.quarantineStatus?.isQuarantined) {
      // Automatically quarantine the user
      const quarantineLevel = Math.min(user.violations + 1, 3)
      const durationMs =
        quarantineLevel === 1
          ? 5 * 60 * 1000
          : // 5 minutes
            quarantineLevel === 2
            ? 30 * 60 * 1000
            : // 30 minutes
              3 * 60 * 60 * 1000 // 3 hours

      const startTime = new Date().toISOString()
      const endTime = new Date(Date.now() + durationMs).toISOString()

      await collections.users.updateOne(
        { id: reportedUserId },
        {
          $set: {
            quarantineStatus: {
              isQuarantined: true,
              reason: "Multiple reports",
              startTime,
              endTime,
              level: quarantineLevel,
            },
            connected: false,
          },
          $inc: { violations: 1 },
        },
      )
    }

    return NextResponse.json({ success: true, message: "Report submitted successfully" })
  } catch (error) {
    console.error("Error processing report:", error)
    return NextResponse.json({ success: false, message: "Failed to process report" }, { status: 500 })
  }
}

