import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials } from "@/lib/services/adminService"
import { sign } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "admin-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const admin = await verifyAdminCredentials(email, password)

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create admin token
    const token = sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    )

    return NextResponse.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

