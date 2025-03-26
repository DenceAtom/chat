import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { username, password, initKey } = await req.json()

    // Verify initialization key (should be set as an environment variable)
    const ADMIN_INIT_KEY = process.env.ADMIN_INIT_KEY
    if (!ADMIN_INIT_KEY || initKey !== ADMIN_INIT_KEY) {
      return NextResponse.json({ error: "Invalid initialization key" }, { status: 403 })
    }

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if any admin already exists
    const adminCount = await db.collection("admins").countDocuments()
    if (adminCount > 0) {
      return NextResponse.json({ error: "Admin initialization has already been completed" }, { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the admin user
    const result = await db.collection("admins").insertOne({
      username,
      password: hashedPassword,
      createdAt: new Date(),
      lastLogin: null,
    })

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      adminId: result.insertedId.toString(),
    })
  } catch (error) {
    console.error("Admin initialization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

