"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    quarantinedUsers: 0,
    pendingReports: 0,
    totalReports: 0,
    totalPayments: 0,
    revenueTotal: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentReports, setRecentReports] = useState([])

  useEffect(() => {
    fetchStats()
    fetchRecentReports()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch statistics",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentReports = async () => {
    try {
      const response = await fetch("/api/admin/reports?status=pending&limit=3")
      if (response.ok) {
        const data = await response.json()
        setRecentReports(data.reports)
      }
    } catch (error) {
      console.error("Error fetching recent reports:", error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`

    return date.toLocaleDateString()
  }

  const getReasonText = (reason) => {
    switch (reason) {
      case "inappropriate":
        return "Inappropriate content"
      case "harassment":
        return "Harassment or bullying"
      case "spam":
        return "Spam or advertising"
      case "other":
        return "Other"
      default:
        return reason
    }
  }

  const getPriorityClass = (reason) => {
    switch (reason) {
      case "inappropriate":
        return "bg-red-100 text-red-800"
      case "harassment":
        return "bg-yellow-100 text-yellow-800"
      case "spam":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button
          onClick={() => {
            fetchStats()
            fetchRecentReports()
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Out of {stats.totalUsers} total users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quarantined Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quarantinedUsers}</div>
            <p className="text-xs text-muted-foreground">Users in timeout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Out of {stats.totalReports} total reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenueTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {stats.totalPayments} payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Latest user reports requiring moderation</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReports.length > 0 ? (
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div key={report.id} className="border-b pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{getReasonText(report.reason)}</h4>
                        <p className="text-sm text-muted-foreground">User ID: {report.userId}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityClass(report.reason)}`}>
                        {report.reason === "inappropriate"
                          ? "High Priority"
                          : report.reason === "harassment"
                            ? "Medium Priority"
                            : "Low Priority"}
                      </span>
                    </div>
                    <p className="text-sm mt-2">Reported {formatDate(report.timestamp)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No pending reports</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Server Load</span>
                  <span className="text-sm font-medium">42%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "42%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm font-medium">68%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: "68%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Signaling Server</span>
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Operational</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">TURN Server</span>
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Operational</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard

