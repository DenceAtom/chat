"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminNavbar from "./components/AdminNavbar"
import { verifyAdminToken } from "@/lib/adminService"

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("adminToken")
        if (!token) {
          setIsAuthenticated(false)
          return
        }

        const isValid = await verifyAdminToken(token)
        setIsAuthenticated(isValid)

        if (!isValid) {
          localStorage.removeItem("adminToken")
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated, only render the children (which should be the login page)
  if (!isAuthenticated && window.location.pathname !== "/admin/login") {
    router.push("/admin/login")
    return null
  }

  // If authenticated, render the admin layout with navbar
  return (
    <div className="flex h-screen flex-col bg-background">
      {isAuthenticated && <AdminNavbar />}
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  )
}

