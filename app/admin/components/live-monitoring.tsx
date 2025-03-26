"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface ChatSession {
  _id: string
  participants: string[]
  startTime: string
  isActive: boolean
}

interface User {
  _id: string
  username: string
  isOnline: boolean
}

export default function LiveMonitoring() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we have a userId in the URL
    const userId = searchParams.get("userId")
    if (userId) {
      setSelectedUser(userId)
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("adminToken")
        if (!token) {
          router.push("/admin/login")
          return
        }

        // Fetch active chat sessions
        const sessionsRes = await fetch("/api/admin/chats/active", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!sessionsRes.ok) {
          throw new Error("Failed to fetch active sessions")
        }

        const sessionsData = await sessionsRes.json()

        // Fetch online users
        const usersRes = await fetch("/api/admin/users/online", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!usersRes.ok) {
          throw new Error("Failed to fetch online users")
        }

        const usersData = await usersRes.json()

        setSessions(sessionsData.chats)
        setOnlineUsers(usersData.users)
      } catch (err: any) {
        setError(err.message || "Failed to load monitoring data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [router, searchParams])

  // Function to connect to a user's camera
  const connectToUserCamera = async (userId: string) => {
    setSelectedUser(userId)
    setSelectedSession(null)

    // In a real implementation, you would:
    // 1. Set up a WebRTC connection to the user's camera
    // 2. Display the stream in the localVideoRef

    // For demo purposes, we'll just show a placeholder
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
      localVideoRef.current.poster = `/placeholder.svg?height=480&width=640&text=Connecting to user ${userId}...`
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
      remoteVideoRef.current.poster = "/placeholder.svg?height=480&width=640&text=No remote stream"
    }
  }

  // Function to monitor a chat session
  const monitorChatSession = async (sessionId: string) => {
    setSelectedSession(sessionId)
    setSelectedUser(null)

    // In a real implementation, you would:
    // 1. Set up WebRTC connections to both participants
    // 2. Display the streams in the localVideoRef and remoteVideoRef

    // For demo purposes, we'll just show placeholders
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
      localVideoRef.current.poster = `/placeholder.svg?height=480&width=640&text=Participant 1 in session ${sessionId}`
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
      remoteVideoRef.current.poster = `/placeholder.svg?height=480&width=640&text=Participant 2 in session ${sessionId}`
    }
  }

  // Function to ban a user
  const banUser = (userId: string) => {
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
                      <span>{user.username}</span>
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

        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="font-medium text-lg mb-4">Active Chat Sessions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div
                  key={session._id}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedSession === session._id ? "bg-indigo-100" : "hover:bg-gray-100"
                  }`}
                  onClick={() => monitorChatSession(session._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Session #{session._id.slice(-6)}</span>
                      <p className="text-xs text-gray-500">
                        Started: {new Date(session.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No active sessions</p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="font-medium text-lg mb-4">
            {selectedUser
              ? `Monitoring User Camera`
              : selectedSession
                ? `Monitoring Chat Session`
                : `Select a user or session to monitor`}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                poster="/placeholder.svg?height=480&width=640&text=Select a user or session"
                className="w-full h-auto bg-gray-100 rounded"
              ></video>
              <p className="mt-2 text-sm text-gray-600">
                {selectedUser ? `User Camera` : selectedSession ? `Participant 1` : `No stream selected`}
              </p>
            </div>

            {selectedSession && (
              <div>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  poster="/placeholder.svg?height=480&width=640&text=Remote stream"
                  className="w-full h-auto bg-gray-100 rounded"
                ></video>
                <p className="mt-2 text-sm text-gray-600">Participant 2</p>
              </div>
            )}
          </div>

          {(selectedUser || selectedSession) && (
            <div className="mt-4 flex justify-end space-x-4">
              {selectedUser && (
                <button
                  onClick={() => banUser(selectedUser)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Ban User
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setSelectedSession(null)
                  if (localVideoRef.current) {
                    localVideoRef.current.srcObject = null
                  }
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null
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

