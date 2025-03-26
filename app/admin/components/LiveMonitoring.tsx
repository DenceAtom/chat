"use client"

import { useState } from "react"
import { Video, Users, Clock, Eye, Ban, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Mock data for demonstration
const mockSessions = [
  {
    id: "1",
    user1: "user123",
    user2: "chatuser456",
    duration: 320, // seconds
    status: "active",
    startTime: new Date(Date.now() - 320000).toISOString(),
  },
  {
    id: "2",
    user1: "videochat789",
    user2: "newuser2023",
    duration: 180, // seconds
    status: "active",
    startTime: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: "3",
    user1: "chatfriend",
    user2: "user123",
    duration: 540, // seconds
    status: "active",
    startTime: new Date(Date.now() - 540000).toISOString(),
  },
  {
    id: "4",
    user1: "newuser2023",
    user2: "chatuser456",
    duration: 60, // seconds
    status: "active",
    startTime: new Date(Date.now() - 60000).toISOString(),
  },
]

export default function LiveMonitoring() {
  const [sessions, setSessions] = useState(mockSessions)
  const [selectedSession, setSelectedSession] = useState<(typeof mockSessions)[0] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [monitoringSession, setMonitoringSession] = useState<string | null>(null)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(date)
  }

  const handleTerminateSession = (session: (typeof mockSessions)[0]) => {
    setSelectedSession(session)
    setDialogOpen(true)
  }

  const confirmTerminate = () => {
    if (!selectedSession) return

    // In a real application, you would call your API here
    setSessions(sessions.filter((s) => s.id !== selectedSession.id))

    if (monitoringSession === selectedSession.id) {
      setMonitoringSession(null)
    }

    setDialogOpen(false)
    setSelectedSession(null)
  }

  const toggleMonitoring = (sessionId: string) => {
    if (monitoringSession === sessionId) {
      setMonitoringSession(null)
    } else {
      setMonitoringSession(sessionId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Monitoring</h1>
          <p className="text-muted-foreground">Monitor active video chat sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">Live connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length * 2}</div>
            <p className="text-xs text-muted-foreground">Currently in sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(sessions.reduce((acc, session) => acc + session.duration, 0) / sessions.length)}
            </div>
            <p className="text-xs text-muted-foreground">Current sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitored Sessions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringSession ? 1 : 0}</div>
            <p className="text-xs text-muted-foreground">Currently monitoring</p>
          </CardContent>
        </Card>
      </div>

      {monitoringSession && (
        <Card>
          <CardHeader>
            <CardTitle>Session Monitoring</CardTitle>
            <CardDescription>Monitoring session #{monitoringSession}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Video stream would be displayed here</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMonitoringSession(null)}>
                Stop Monitoring
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const session = sessions.find((s) => s.id === monitoringSession)
                  if (session) {
                    handleTerminateSession(session)
                  }
                }}
              >
                Terminate Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session ID</TableHead>
              <TableHead>User 1</TableHead>
              <TableHead>User 2</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No active sessions.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">#{session.id}</TableCell>
                  <TableCell>{session.user1}</TableCell>
                  <TableCell>{session.user2}</TableCell>
                  <TableCell>{formatDuration(session.duration)}</TableCell>
                  <TableCell>{formatTime(session.startTime)}</TableCell>
                  <TableCell>
                    <Badge variant="default">{session.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleMonitoring(session.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Monitor</span>
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Message</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleTerminateSession(session)}
                      >
                        <Ban className="h-4 w-4" />
                        <span className="sr-only">Terminate</span>
                      </Button>
                    </div>
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
            <DialogTitle>Terminate Session</DialogTitle>
            <DialogDescription>
              This will immediately end the video chat session between these users. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="py-4">
              <p>
                <strong>Session ID:</strong> #{selectedSession.id}
              </p>
              <p>
                <strong>Users:</strong> {selectedSession.user1} and {selectedSession.user2}
              </p>
              <p>
                <strong>Duration:</strong> {formatDuration(selectedSession.duration)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmTerminate}>
              Terminate Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

