import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { collections } = await connectToDatabase()
    const user = await collections.users.findOne({ id: userId })

    if (!user || !user.quarantineStatus?.isQuarantined) {
      return NextResponse.json({
        isQuarantined: false,
      })
    }

    // Check if quarantine has expired
    const endTime = new Date(user.quarantineStatus.endTime).getTime()
    const now = Date.now()

    if (now >= endTime) {
      // Quarantine has expired, remove it
      await collections.users.updateOne({ id: userId }, { $set: { quarantineStatus: null } })
      return NextResponse.json({ isQuarantined: false })
    }

    return NextResponse.json({
      isQuarantined: true,
      quarantineInfo: user.quarantineStatus,
    })
  } catch (error) {
    console.error("Error checking quarantine status:", error)
    return NextResponse.json({ error: "Failed to check quarantine status" }, { status: 500 })
  }
}

