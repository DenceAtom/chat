"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Logout() {
  const router = useRouter()

  useEffect(() => {
    // Clear the cookie
    document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    // Redirect to login page
    setTimeout(() => {
      router.push("/admin/login")
    }, 500)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Logging out...</p>
    </div>
  )
}

