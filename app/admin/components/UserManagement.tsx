"use client"

import { useState } from "react"
import { MoreHorizontal, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Mock data for demonstration
const mockUsers = [
  {
    id: "1",
    username: "user123",
    email: "user123@example.com",
    status: "active",
    reports: 0,
    lastActive: "2023-06-15T10:30:00Z",
    joinDate: "2023-01-10T08:15:00Z",
  },
  {
    id: "2",
    username: "chatuser456",
    email: "chatuser456@example.com",
    status: "active",
    reports: 2,
    lastActive: "2023-06-18T14:45:00Z",
    joinDate: "2023-02-22T11:30:00Z",
  },
  {
    id: "3",
    username: "videochat789",
    email: "videochat789@example.com",
    status: "suspended",
    reports: 5,
    lastActive: "2023-06-10T09:15:00Z",
    joinDate: "2023-03-05T16:20:00Z",
  },
  {
    id: "4",
    username: "newuser2023",
    email: "newuser2023@example.com",
    status: "active",
    reports: 0,
    lastActive: "2023-06-19T08:30:00Z",
    joinDate: "2023-06-01T10:00:00Z",
  },
  {
    id: "5",
    username: "chatfriend",
    email: "chatfriend@example.com",
    status: "inactive",
    reports: 1,
    lastActive: "2023-05-30T11:20:00Z",
    joinDate: "2023-04-15T09:45:00Z",
  },
]

export default function UserManagement() {
  const [users, setUsers] = useState(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<(typeof mockUsers)[0] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<"ban" | "activate" | "delete">("ban")

  // Filter users based on search query and status filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleAction = (action: "ban" | "activate" | "delete", user: (typeof mockUsers)[0]) => {
    setSelectedUser(user)
    setDialogAction(action)
    setDialogOpen(true)
  }

  const confirmAction = () => {
    if (!selectedUser) return

    // In a real application, you would call your API here
    if (dialogAction === "ban") {
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, status: "suspended" } : u)))
    } else if (dialogAction === "activate") {
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, status: "active" } : u)))
    } else if (dialogAction === "delete") {
      setUsers(users.filter((u) => u.id !== selectedUser.id))
    }

    setDialogOpen(false)
    setSelectedUser(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage and monitor user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export Users
          </Button>
          <Button size="sm">Add User</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "default" : user.status === "inactive" ? "outline" : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.reports > 0 ? <Badge variant="destructive">{user.reports}</Badge> : "0"}</TableCell>
                  <TableCell>{formatDate(user.lastActive)}</TableCell>
                  <TableCell>{formatDate(user.joinDate)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => window.alert(`View ${user.username}`)}>
                          View details
                        </DropdownMenuItem>
                        {user.status !== "suspended" && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => handleAction("ban", user)}
                          >
                            Ban user
                          </DropdownMenuItem>
                        )}
                        {user.status !== "active" && (
                          <DropdownMenuItem onSelect={() => handleAction("activate", user)}>
                            Activate user
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => handleAction("delete", user)}
                        >
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "ban" ? "Ban User" : dialogAction === "activate" ? "Activate User" : "Delete User"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "ban"
                ? "This will suspend the user account. They will not be able to access the platform until reactivated."
                : dialogAction === "activate"
                  ? "This will reactivate the user account. They will regain access to the platform."
                  : "This will permanently delete the user account. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p>
                <strong>Username:</strong> {selectedUser.username}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant={dialogAction === "activate" ? "default" : "destructive"} onClick={confirmAction}>
              {dialogAction === "ban" ? "Ban User" : dialogAction === "activate" ? "Activate User" : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

