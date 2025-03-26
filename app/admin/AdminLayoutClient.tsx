"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import AdminNavbar from "./components/admin-navbar"
import "../globals.css"

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // First, check if we're running on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only run this effect on the client side
    if (!isClient) return

    // Check if user is authenticated
    const checkAuth = () => {
      try {
        const adminAuth = document.cookie
          .split("; ")
          .find((row) => row.startsWith("admin_auth="))
          ?.split("=")[1]

        const isAuth = adminAuth === "authenticated"
        setIsAuthenticated(isAuth)

        // If not authenticated and not already on login page, redirect to login
        if (!isAuth && pathname !== "/admin/login") {
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsAuthenticated(false)
        router.push("/admin/login")
      }
    }

    checkAuth()
  }, [router, pathname, isClient])

  // Show nothing while checking authentication or if not on client yet
  if (!isClient || isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // If on login page or authenticated, show content
  if (pathname === "/admin/login" || isAuthenticated) {
    return (
      <html lang="en">
        <body className="bg-gray-100 min-h-screen">
          <AdminNavbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </body>
      </html>
    )
  }

  // This should not be reached due to the redirect, but just in case
  return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>
}

