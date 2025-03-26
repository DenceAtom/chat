"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

export default function AdminNavbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("adminToken")
    setIsLoggedIn(!!token)

    // Redirect to login if not logged in and not already on login page
    if (!token && pathname !== "/admin/login") {
      router.push("/admin/login")
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminData")
    setIsLoggedIn(false)
    router.push("/admin/login")
  }

  if (!isLoggedIn && pathname !== "/admin/login") {
    return null
  }

  if (pathname === "/admin/login") {
    return null
  }

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="text-xl font-bold">
              Admin Dashboard
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md ${pathname === "/admin" ? "bg-gray-900" : "hover:bg-gray-700"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className={`px-3 py-2 rounded-md ${pathname === "/admin/users" ? "bg-gray-900" : "hover:bg-gray-700"}`}
              >
                Users
              </Link>
              <Link
                href="/admin/monitoring"
                className={`px-3 py-2 rounded-md ${pathname === "/admin/monitoring" ? "bg-gray-900" : "hover:bg-gray-700"}`}
              >
                Live Monitoring
              </Link>
            </div>
          </div>
          <div>
            <button onClick={handleLogout} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

