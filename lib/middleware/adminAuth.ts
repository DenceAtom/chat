import type { NextRequest } from "next/server"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "admin-secret-key"

export async function verifyAdminToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split(" ")[1]
    const decoded = verify(token, JWT_SECRET) as any

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    console.error("Admin token verification error:", error)
    return null
  }
}

