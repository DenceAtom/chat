"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Undo } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function BannedUsers() {
  const [bannedUsers, setBannedUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Fetch banned users on component mount
  useEffect(() => {
    fetchBannedUsers()
  }, [])

  // Fetch banned users from the API
  const fetchBannedUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users?filter=banned")
      if (response.ok) {
        const data = await response.json()
        setBannedUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch banned users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching banned users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch banned users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter users based on search term
  const filteredUsers = bannedUsers.filter(
    (user) =>
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.ip.includes(searchTerm) ||
      (user.country && user.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.bannedStatus.reason && user.bannedStatus.reason.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Handle unbanning a user
  const handleUnbanUser = async (userId) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unban",
          userId,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been unbanned.`,
        })

        // Update the local state
        setBannedUsers(bannedUsers.filter((user) => user.id !== userId))
      } else {
        toast({
          title: "Error",
          description: "Failed to unban user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error unbanning user:", error)
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Banned Users</h1>

      <div className="mb-6 flex justify-between items-center">
        <Input
          placeholder="Search by ID, IP, country, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={fetchBannedUsers} disabled={isLoading}>
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
                <TableHead>Banned At</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading banned users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.ip}</TableCell>
                    <TableCell>{user.country || "Unknown"}</TableCell>
                    <TableCell>{formatDate(user.bannedStatus.startTime)}</TableCell>
                    <TableCell>{user.bannedStatus.reason}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleUnbanUser(user.id)}>
                        <Undo className="h-4 w-4 mr-1" />
                        Unban
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No banned users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

