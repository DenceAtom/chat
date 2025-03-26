"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LiveMonitoring() {
  const [onlineUsers, setOnlineUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const videoRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we have a userId in the URL
    const userId = searchParams.get("userId")
    if (userId) {
      setSelectedUser(userId)
    }

    const fetchOnlineUsers = async () => {
      try {
        const token = localStorage.getItem("adminToken")
        if (!token) {
          router.push("/admin/login")
          return
        }

        const response = await fetch("/api/admin/users?status=online", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch online users")
        }

        const data = await response.json()
        setOnlineUsers(data.users)
      } catch (err) {
        setError(err.message || "Failed to load online users")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnlineUsers()

    // Set up polling for real-time updates
    const interval = setInterval(fetchOnlineUsers, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [router, searchParams])

  // Function to connect to a user's camera
  const connectToUserCamera = (userId) => {
    setSelectedUser(userId)

    // In a real implementation, you would:
    // 1. Set up a WebRTC connection to the user's camera
    // 2. Display the stream in the videoRef

    // For demo purposes, we'll just show a placeholder
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.poster = `/placeholder.svg?height=480&width=640&text=Connecting to user ${userId}...`
    }
  }

  // Function to ban a user
  const banUser = (userId) => {
    router.push(`/admin/users?action=ban&userId=${userId}`)
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="font-medium text-lg mb-4">Online Users</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <div
                  key={user._id}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedUser === user._id ? "bg-indigo-100" : "hover:bg-gray-100"
                  }`}
                  onClick={() => connectToUserCamera(user._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span>{user.username || "Anonymous"}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        banUser(user._id)
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No users online</p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="font-medium text-lg mb-4">
            {selectedUser ? `Monitoring User Camera` : `Select a user to monitor`}
          </h3>

          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              poster="/placeholder.svg?height=480&width=640&text=Select a user to monitor"
              className="w-full h-auto bg-gray-100 rounded"
            ></video>
            <p className="mt-2 text-sm text-gray-600">{selectedUser ? `User Camera` : `No user selected`}</p>
          </div>

          {selectedUser && (
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={() => banUser(selectedUser)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Ban User
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  if (videoRef.current) {
                    videoRef.current.srcObject = null
                    videoRef.current.poster = "/placeholder.svg?height=480&width=640&text=Select a user to monitor"
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

