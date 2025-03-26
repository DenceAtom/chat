"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  _id: string
  username: string
  email: string
  isOnline: boolean
  isBanned: boolean
  lastActive: string
  createdAt: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all") // all, online, banned
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState("")
  const [showBanModal, setShowBanModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("adminToken")
        if (!token) {
          router.push("/admin/login")
          return
        }

        const response = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }

        const data = await response.json()
        setUsers(data.users)
        applyFilters(data.users, searchTerm, filter)
      } catch (err: any) {
        setError(err.message || "Failed to load users")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [router, searchTerm, filter])

  const applyFilters = (userList: User[], search: string, filterType: string) => {
    let filtered = [...userList]

    // Apply search
    if (search) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase()),
      )
    }

    // Apply filter type
    if (filterType === "online") {
      filtered = filtered.filter((user) => user.isOnline)
    } else if (filterType === "banned") {
      filtered = filtered.filter((user) => user.isBanned)
    }

    setFilteredUsers(filtered)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    applyFilters(users, value, filter)
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFilter(value)
    applyFilters(users, searchTerm, value)
  }

  const handleBanUser = (user: User) => {
    setSelectedUser(user)
    setBanReason("")
    setShowBanModal(true)
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch("/api/admin/users/unban", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to unban user")
      }

      // Update local state
      const updatedUsers = users.map((user) => (user._id === userId ? { ...user, isBanned: false } : user))
      setUsers(updatedUsers)
      applyFilters(updatedUsers, searchTerm, filter)
    } catch (err: any) {
      console.error(err)
      alert("Failed to unban user: " + err.message)
    }
  }

  const submitBan = async () => {
    if (!selectedUser || !banReason) return

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          reason: banReason,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to ban user")
      }

      // Update local state
      const updatedUsers = users.map((user) => (user._id === selectedUser._id ? { ...user, isBanned: true } : user))
      setUsers(updatedUsers)
      applyFilters(updatedUsers, searchTerm, filter)

      // Close modal
      setShowBanModal(false)
      setSelectedUser(null)
      setBanReason("")
    } catch (err: any) {
      console.error(err)
      alert("Failed to ban user: " + err.message)
    }
  }

  const viewUserCamera = (userId: string) => {
    router.push(`/admin/monitoring?userId=${userId}`)
  }

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
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="w-full md:w-1/4">
          <select
            value={filter}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Users</option>
            <option value="online">Online Users</option>
            <option value="banned">Banned Users</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Active
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username || "Anonymous"}</div>
                        <div className="text-sm text-gray-500">{user.email || "No email"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isBanned
                          ? "bg-red-100 text-red-800"
                          : user.isOnline
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.isBanned ? "Banned" : user.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive ? new Date(user.lastActive).toLocaleString() : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => viewUserCamera(user._id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View Camera
                    </button>
                    {user.isBanned ? (
                      <button onClick={() => handleUnbanUser(user._id)} className="text-green-600 hover:text-green-900">
                        Unban
                      </button>
                    ) : (
                      <button onClick={() => handleBanUser(user)} className="text-red-600 hover:text-red-900">
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Ban User: {selectedUser.username || "Anonymous"}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for ban</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowBanModal(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={submitBan}
                disabled={!banReason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

