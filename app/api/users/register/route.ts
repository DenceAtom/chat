import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/database/mongodb"

export async function POST(req: Request) {
  try {
    const userData = await req.json()
    const { id, ip, country } = userData

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { collections } = await connectToDatabase()

    // Check if user exists
    const existingUser = await collections.users.findOne({ id })

    if (existingUser) {
      // Update existing user
      await collections.users.updateOne(
        { id },
        {
          $set: {
            ip,
            country,
            lastSeen: new Date().toISOString(),
            connected: true,
          },
        },
      )

      return NextResponse.json({ success: true, message: "User updated" })
    } else {
      // Create new user
      const newUser = {
        id,
        ip,
        country,
        connectionTime: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        connected: true,
        reportCount: 0,
        violations: 0,
        quarantineStatus: null,
        bannedStatus: null,
      }

      await collections.users.insertOne(newUser)
      return NextResponse.json({ success: true, message: "User registered" })
    }
  } catch (error) {
    console.error("Error registering user:", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}

