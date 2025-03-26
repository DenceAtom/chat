import { type NextRequest, NextResponse } from "next/server"
import { sign } from "jsonwebtoken"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const admin = await db.collection("admins").findOne({ username })

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create JWT token
    const token = sign(
      {
        id: admin._id.toString(),
        username: admin.username,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    )

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

