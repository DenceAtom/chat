import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = cookies()
  cookieStore.delete("admin_auth")

  return NextResponse.json({ success: true })
}

