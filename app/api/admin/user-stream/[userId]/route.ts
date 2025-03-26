import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Check admin authentication
function isAuthenticated() {
  const cookieStore = cookies()
  return cookieStore.get("admin_auth")?.value === "authenticated"
}

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = params.userId

  // In a real implementation, you would access the user's webcam stream
  // This is just a placeholder response
  return NextResponse.json({
    streamUrl: "/placeholder-video.mp4",
    userId,
  })
}

