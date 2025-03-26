"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Ban, Unlock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

export default function QuarantinedUsers() {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Fetch users from the API
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users?filter=quarantined")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch quarantined users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch quarantined users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

  // Calculate time remaining in quarantine
  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime()
    const now = Date.now()

    if (now >= end) {
      return "Expired"
    }

    const diff = end - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  // View user details
  const handleViewUser = (user: any) => {
    setSelectedUser(user)
    setShowUserDialog(true)
  }

  // Handle releasing a user from quarantine
  const handleReleaseUser = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unquarantine",
          userId,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been released from quarantine.`,
        })
        fetchUsers() // Refresh the user list
      } else {
        toast({
          title: "Error",
          description: "Failed to release user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error releasing user:", error)
      toast({
        title: "Error",
        description: "Failed to release user",
        variant: "destructive",
      })
    }
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
          reason: "Multiple violations",
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Quarantined Users</h1>

      <div className="mb-6 flex justify-between items-center">
        <Input
          placeholder="Search by ID, IP, or country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Quarantine Level</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time Remaining</TableHead>
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
                          user.quarantineStatus.level === 1
                            ? "bg-yellow-100 text-yellow-800"
                            : user.quarantineStatus.level === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        Level {user.quarantineStatus.level}
                      </span>
                    </TableCell>
                    <TableCell>{user.quarantineStatus.reason}</TableCell>
                    <TableCell>{getTimeRemaining(user.quarantineStatus.endTime)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReleaseUser(user.id)}>
                          <Unlock className="h-4 w-4 mr-1" />
                          Release
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
                    No quarantined users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.id}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">User Information</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <p>
                    <strong>ID:</strong> {selectedUser.id}
                  </p>
                  <p>
                    <strong>IP:</strong> {selectedUser.ip}
                  </p>
                  <p>
                    <strong>Country:</strong> {selectedUser.country || "Unknown"}
                  </p>
                  <p>
                    <strong>First Seen:</strong> {formatDate(selectedUser.connectionTime)}
                  </p>
                  <p>
                    <strong>Last Seen:</strong> {formatDate(selectedUser.lastSeen)}
                  </p>
                  <p>
                    <strong>Reports:</strong> {selectedUser.reportCount}
                  </p>
                  <p>
                    <strong>Violations:</strong> {selectedUser.violations}
                  </p>
                </div>

                <h3 className="font-medium mt-4 mb-2">Quarantine Information</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-md">
                  <p>
                    <strong>Level:</strong> {selectedUser.quarantineStatus.level}
                  </p>
                  <p>
                    <strong>Reason:</strong> {selectedUser.quarantineStatus.reason}
                  </p>
                  <p>
                    <strong>Started:</strong> {formatDate(selectedUser.quarantineStatus.startTime)}
                  </p>
                  <p>
                    <strong>Ends:</strong> {formatDate(selectedUser.quarantineStatus.endTime)}
                  </p>
                  <p>
                    <strong>Time Remaining:</strong> {getTimeRemaining(selectedUser.quarantineStatus.endTime)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Actions</h3>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full" onClick={() => handleReleaseUser(selectedUser.id)}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Release from Quarantine
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      handleBanUser(selectedUser.id)
                      setShowUserDialog(false)
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Ban User Permanently
                  </Button>

                  <Button variant="outline" className="w-full" onClick={() => setShowUserDialog(false)}>
                    Close
                  </Button>
                </div>

                <h3 className="font-medium mt-6 mb-2">Payment History</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md h-[200px] overflow-y-auto">
                  <p className="text-center text-gray-500">No payment history available</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

