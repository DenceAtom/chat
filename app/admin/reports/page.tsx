"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Ban, Check, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

export default function Reports() {
  const [reports, setReports] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch reports on component mount and when tab changes
  useEffect(() => {
    fetchReports()
  }, [activeTab])

  // Fetch reports from the API
  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const status = activeTab !== "all" ? activeTab : ""
      const response = await fetch(`/api/admin/reports?status=${status}`)
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch reports",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter reports based on search term
  const filteredReports = reports.filter(
    (report) =>
      report.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get reason display text
  const getReasonText = (reason) => {
    switch (reason) {
      case "inappropriate":
        return "Inappropriate Content"
      case "harassment":
        return "Harassment or Bullying"
      case "spam":
        return "Spam or Advertising"
      case "other":
        return "Other"
      default:
        return reason
    }
  }

  // Handle viewing a report
  const handleViewReport = async (report) => {
    try {
      // In a real app, you might fetch additional details about the report
      setSelectedReport(report)
      setShowReportDialog(true)
    } catch (error) {
      console.error("Error viewing report:", error)
      toast({
        title: "Error",
        description: "Failed to load report details",
        variant: "destructive",
      })
    }
  }

  // Handle resolving a report
  const handleResolveReport = async (reportId, action) => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          status: action,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Report has been ${action}.`,
        })

        // Update the local state
        setReports(reports.map((report) => (report.id === reportId ? { ...report, status: action } : report)))

        if (selectedReport?.id === reportId) {
          setSelectedReport({ ...selectedReport, status: action })
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to ${action} report`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${action} report:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} report`,
        variant: "destructive",
      })
    }
  }

  // Handle banning a user
  const handleBanUser = async (userId) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ban",
          userId,
          reason: "Violation of terms based on report",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been banned.`,
        })
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
  const handleQuarantineUser = async (userId, level = 1) => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "quarantine",
          userId,
          reason: "Violation of terms based on report",
          level,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${userId} has been quarantined.`,
        })
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <Input
          placeholder="Search by user ID, reporter, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Reported User</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Loading reports...
                  </TableCell>
                </TableRow>
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.id}</TableCell>
                    <TableCell>{report.userId}</TableCell>
                    <TableCell>{report.reportedBy}</TableCell>
                    <TableCell>{getReasonText(report.reason)}</TableCell>
                    <TableCell>{formatDate(report.timestamp)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.status === "pending"
                            ? "default"
                            : report.status === "resolved"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewReport(report)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {report.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveReport(report.id, "resolved")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveReport(report.id, "dismissed")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Report Details: {selectedReport?.id}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Report Information</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <p>
                    <strong>Report ID:</strong> {selectedReport.id}
                  </p>
                  <p>
                    <strong>Reported User:</strong> {selectedReport.userId}
                  </p>
                  <p>
                    <strong>Reported By:</strong> {selectedReport.reportedBy}
                  </p>
                  <p>
                    <strong>Reason:</strong> {getReasonText(selectedReport.reason)}
                  </p>
                  <p>
                    <strong>Time:</strong> {formatDate(selectedReport.timestamp)}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </p>
                </div>

                <h3 className="font-medium mt-4 mb-2">Details</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <p>{selectedReport.details || "No additional details provided."}</p>
                </div>

                {selectedReport.screenshot && (
                  <>
                    <h3 className="font-medium mt-4 mb-2">Screenshot Evidence</h3>
                    <div className="bg-gray-900 aspect-video rounded-md flex items-center justify-center">
                      <img
                        src={selectedReport.screenshot || "/placeholder.svg"}
                        alt="Report evidence"
                        className="max-w-full max-h-full rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Actions</h3>
                <div className="space-y-4">
                  <Button variant="destructive" className="w-full" onClick={() => handleBanUser(selectedReport.userId)}>
                    <Ban className="h-4 w-4 mr-2" />
                    Ban Reported User
                  </Button>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleQuarantineUser(selectedReport.userId, 1)}
                    >
                      Quarantine 5m
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleQuarantineUser(selectedReport.userId, 2)}
                    >
                      Quarantine 30m
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleQuarantineUser(selectedReport.userId, 3)}
                    >
                      Quarantine 3h
                    </Button>
                  </div>

                  {selectedReport.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleResolveReport(selectedReport.id, "resolved")}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Resolved
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleResolveReport(selectedReport.id, "dismissed")}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Dismiss Report
                      </Button>
                    </>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => setShowReportDialog(false)}>
                    Close
                  </Button>
                </div>

                <h3 className="font-medium mt-6 mb-2">Reported User's Webcam</h3>
                <div className="bg-gray-900 aspect-video rounded-md flex items-center justify-center">
                  <p className="text-white text-sm">Live webcam feed would appear here if user is connected</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

