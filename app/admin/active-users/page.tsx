"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Ban, AlertTriangle, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import sharedStateService from "@/lib/shared-state"

export default function ActiveUsers() {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showMonitorDialog, setShowMonitorDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeCalls, setActiveCalls] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Set up shared state listeners
  useEffect(() => {
    if (!isClient) return

    // Register for active users updates
    sharedStateService.onActiveUsersUpdate((updatedUsers) => {
      console.log("Received active users update:", updatedUsers)
      setUsers(updatedUsers)
      setIsLoading(false)
    })

    // Register for active calls updates
    sharedStateService.onActiveCallsUpdate((updatedCalls) => {
      console.log("Received active calls update:", updatedCalls)
      setActiveCalls(updatedCalls)
    })

    // Initial fetch
    fetchUsers()
    fetchActiveCalls()

    // Set up polling for active users
    const interval = setInterval(() => {
      fetchUsers()
      fetchActiveCalls()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [isClient])

  // Fetch users from the API or shared state
  const fetchUsers = async () => {
    if (!isClient) return

    setIsLoading(true)
    try {
      console.log("Fetching active users")

      // First try to get users from shared state
      const sharedUsers = sharedStateService.getActiveUsers()
      if (sharedUsers.length > 0) {
        console.log("Got users from shared state:", sharedUsers)
        setUsers(sharedUsers)
        setIsLoading(false)
        return
      }

      // If no users in shared state, request current state from all clients
      sharedStateService.requestCurrentState()
      console.log("Requested current state from all clients")

      // Try to fetch from API as fallback
      try {
        const response = await fetch("/api/admin/users?filter=active")
        if (response.ok) {
          const data = await response.json()
          console.log("Fetched active users from API:", data.users)
          setUsers(data.users)
        }
      } catch (error) {
        console.error("Error fetching from API:", error)
      }

      // If still no users, try localStorage as last resort
      if (users.length === 0) {
        try {
          // Get active connection IDs
          const activeConnectionIds = JSON.parse(localStorage.getItem("activeConnections") || "[]")

          // Get all users
          const usersJson = localStorage.getItem("users")
          const allUsers = usersJson ? JSON.parse(usersJson) : {}

          // Create users from localStorage
          const usersFromLocalStorage = []

          // First add users that are marked as connected
          for (const userId in allUsers) {
            if (allUsers[userId].connected) {
              usersFromLocalStorage.push(allUsers[userId])
            }
          }

          // Then add users from activeConnections that aren't already added
          for (const userId of activeConnectionIds) {
            if (allUsers[userId] && !usersFromLocalStorage.some((u) => u.id === userId)) {
              usersFromLocalStorage.push(allUsers[userId])
            } else if (!allUsers[userId]) {
              // Create a placeholder user if not found
              usersFromLocalStorage.push({
                id: userId,
                ip: "127.0.0.1", // Placeholder
                country: "Unknown",
                connectionTime: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                connected: true,
                reportCount: 0,
                violations: 0,
                quarantineStatus: null,
                bannedStatus: null,
              })
            }
          }

          console.log("Created users from localStorage:", usersFromLocalStorage)
          if (usersFromLocalStorage.length > 0) {
            setUsers(usersFromLocalStorage)
          }
        } catch (error) {
          console.error("Error getting users from localStorage:", error)
        }
      }

      // If no users found, show a toast with instructions
      if (users.length === 0) {
        toast({
          title: "No active users found",
          description: "Make sure users are connected in the video chat. Try refreshing the page.",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch active calls
  const fetchActiveCalls = async () => {
    if (!isClient) return

    try {
      // First try to get calls from shared state
      const sharedCalls = sharedStateService.getActiveCalls()
      if (sharedCalls.length > 0) {
        console.log("Got calls from shared state:", sharedCalls)
        setActiveCalls(sharedCalls)
        return
      }

      // Try to fetch from API as fallback
      const response = await fetch("/api/admin/active-calls")
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched active calls from API:", data.calls)
        setActiveCalls(data.calls)
      }
    } catch (error) {
      console.error("Error fetching active calls:", error)
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user: any) =>
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.ip.includes(searchTerm) ||
      (user.country && user.country.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Add a function to get a user's webcam stream
  const getUserWebcamStream = async (userId: string) => {
    if (!isClient) return

    try {
      // In a real implementation, you would fetch the actual stream
      // For this demo, we'll simulate it with a placeholder

      // Show a toast to explain the limitation
      toast({
        title: "Demo Limitation",
        description: "In a production environment, this would show the actual user's webcam stream.",
      })

      // Set up a placeholder video
      if (videoRef.current) {
        // Try to use the user's own webcam as a placeholder
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          videoRef.current.srcObject = stream
          videoRef.current.play()
        } catch (err) {
          // If can't access webcam, use a placeholder
          videoRef.current.src =
            "https://media.istockphoto.com/id/1365223878/video/beautiful-woman-having-video-call-on-laptop.mp4?s=mp4-640x640-is&k=20&c=uFLJxDZpT6VlMRNZcEBYFwpEGWZzFbKlFfq6gYr4Scs="
          videoRef.current.play()
        }
      }
    } catch (error) {
      console.error("Error getting user webcam stream:", error)
      toast({
        title: "Error",
        description: "Failed to get user's webcam stream",
        variant: "destructive",
      })
    }
  }

  // Update the handleMonitorUser function to call getUserWebcamStream
  const handleMonitorUser = async (user: any) => {
    setSelectedUser(user)
    setShowMonitorDialog(true)

    // Get the user's webcam stream
    await getUserWebcamStream(user.id)
  }

  // Handle banning a user
  const handleBanUser = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ban",
          userId,
          reason: "Violation of terms",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been banned.`,
        })
        fetchUsers() // Refresh the user list
      } else {
        toast({
          title: "Error",
          description: "Failed to ban user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error banning user:", error)
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      })
    }
  }

  // Handle quarantining a user
  const handleQuarantineUser = async (userId: string, level = 1) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "quarantine",
          userId,
          reason: "Violation of terms",
          level,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been quarantined.`,
        })
        fetchUsers() // Refresh the user list
      } else {
        toast({
          title: "Error",
          description: "Failed to quarantine user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error quarantining user:", error)
      toast({
        title: "Error",
        description: "Failed to quarantine user",
        variant: "destructive",
      })
    }
  }

  // Add a force refresh function that clears localStorage and reloads data
  const forceRefresh = () => {
    if (!isClient) return

    try {
      // Request current state from all clients
      sharedStateService.requestCurrentState()

      // Reload the data
      fetchUsers()
      fetchActiveCalls()

      toast({
        title: "Force Refresh",
        description: "Requested current state from all clients.",
      })
    } catch (error) {
      console.error("Error during force refresh:", error)
    }
  }

  // If not on client yet, show loading
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Active Users</h1>

      <div className="mb-6 flex justify-between items-center">
        <Input
          placeholder="Search by ID, IP, or country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-2">
          <Button onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button variant="outline" onClick={forceRefresh}>
            Force Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connection Time</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.ip}</TableCell>
                    <TableCell>{user.country || "Unknown"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.connected ? "Connected" : "Disconnected"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(user.connectionTime)}</TableCell>
                    <TableCell>
                      {user.reportCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {user.reportCount}
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMonitorUser(user)}
                          disabled={!user.connected}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Monitor
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuarantineUser(user.id)}>
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Quarantine
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleBanUser(user.id)}>
                          <Ban className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Calls Section */}
      <h2 className="text-2xl font-bold mb-4">Active Calls</h2>
      <Card className="mb-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>User 1</TableHead>
                <TableHead>User 2</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCalls.length > 0 ? (
                activeCalls.map((call: any) => (
                  <TableRow key={call.id}>
                    <TableCell>{call.id}</TableCell>
                    <TableCell>{call.user1Id}</TableCell>
                    <TableCell>{call.user2Id}</TableCell>
                    <TableCell>{formatDate(call.startTime)}</TableCell>
                    <TableCell>{call.duration || "Active"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // In a real implementation, you would monitor the call
                            toast({
                              title: "Info",
                              description: "Call monitoring not implemented in demo",
                            })
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Monitor
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            // In a real implementation, you would end the call
                            toast({
                              title: "Info",
                              description: "Call termination not implemented in demo",
                            })
                          }}
                        >
                          End Call
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No active calls
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monitor User Dialog */}
      <Dialog open={showMonitorDialog} onOpenChange={setShowMonitorDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Monitoring User: {selectedUser?.id}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">User's Webcam</h3>
              <div className="bg-gray-900 aspect-video rounded-md flex items-center justify-center overflow-hidden">
                {selectedUser?.connected ? (
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline controls />
                ) : (
                  <p className="text-white text-sm">User is disconnected</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Note: In a production environment, this would show the actual user's webcam stream.
              </p>
              <div className="mt-4">
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <p>
                    <strong>ID:</strong> {selectedUser?.id}
                  </p>
                  <p>
                    <strong>IP:</strong> {selectedUser?.ip}
                  </p>
                  <p>
                    <strong>Country:</strong> {selectedUser?.country || "Unknown"}
                  </p>
                  <p>
                    <strong>Connected since:</strong> {selectedUser && formatDate(selectedUser.connectionTime)}
                  </p>
                  <p>
                    <strong>Last seen:</strong> {selectedUser && formatDate(selectedUser.lastSeen)}
                  </p>
                  <p>
                    <strong>Reports:</strong> {selectedUser?.reportCount || 0}
                  </p>
                  <p>
                    <strong>Violations:</strong> {selectedUser?.violations || 0}
                  </p>
                  {selectedUser?.quarantineStatus?.isQuarantined && (
                    <p className="text-yellow-600">
                      <strong>Quarantined:</strong> Yes (Level {selectedUser.quarantineStatus.level})
                    </p>
                  )}
                  {selectedUser?.bannedStatus?.isBanned && (
                    <p className="text-red-600">
                      <strong>Banned:</strong> Yes
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Current Conversation</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md h-[300px] overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md max-w-[80%]">
                    <p className="text-sm font-medium">User</p>
                    <p>Hello there!</p>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-md max-w-[80%] ml-auto">
                    <p className="text-sm font-medium">Stranger</p>
                    <p>Hi, how are you?</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md max-w-[80%]">
                    <p className="text-sm font-medium">User</p>
                    <p>I'm good, thanks for asking!</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Actions</h4>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleBanUser(selectedUser?.id)
                      setShowMonitorDialog(false)
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Ban User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleQuarantineUser(selectedUser?.id)
                      setShowMonitorDialog(false)
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Quarantine
                  </Button>
                  <Button variant="outline" onClick={() => setShowMonitorDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

