import { NextResponse } from "next/server"

// In a real application, you would use a database and proper authentication
// This is a simplified example with hardcoded credentials
const ADMIN_USERNAME = "admin"
const ADMIN_PASSWORD = "admin123" // Use a strong password in production

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}

