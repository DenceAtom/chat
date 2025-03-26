"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeChats: 0,
    bannedUsers: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("adminToken")
        if (!token) {
          router.push("/admin/login")
          return
        }

        // Fetch online users
        const onlineUsersRes = await fetch("/api/admin/users?status=online", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!onlineUsersRes.ok) {
          throw new Error("Failed to fetch online users")
        }

        const onlineUsersData = await onlineUsersRes.json()

        // Fetch all users
        const allUsersRes = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!allUsersRes.ok) {
          throw new Error("Failed to fetch all users")
        }

        const allUsersData = await allUsersRes.json()

        // Count banned users
        const bannedUsers = allUsersData.users.filter((user: any) => user.isBanned).length

        setStats({
          totalUsers: allUsersData.users.length,
          onlineUsers: onlineUsersData.users.length,
          activeChats: 0, // This would come from a separate API call
          bannedUsers,
        })
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Online Users" value={stats.onlineUsers} />
        <StatCard title="Active Chats" value={stats.activeChats} />
        <StatCard title="Banned Users" value={stats.bannedUsers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link href="/admin/users">
              <button className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">
                Manage Users
              </button>
            </Link>
            <Link href="/admin/monitoring">
              <button className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">
                Monitor Live Chats
              </button>
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <StatusItem label="Database" status="Operational" />
            <StatusItem label="Signaling Server" status="Operational" />
            <StatusItem label="WebRTC Services" status="Operational" />
            <StatusItem label="Face Detection API" status="Operational" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  const isOperational = status === "Operational"

  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span
        className={`px-2 py-1 rounded-full text-xs ${isOperational ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
      >
        {status}
      </span>
    </div>
  )
}

