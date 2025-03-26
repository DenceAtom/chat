"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConnectionStatus() {
  const [socketStatus, setSocketStatus] = useState<"checking" | "connected" | "failed">("checking")
  const [mediaStatus, setMediaStatus] = useState<"checking" | "granted" | "denied">("checking")
  const [networkStatus, setNetworkStatus] = useState<"checking" | "online" | "offline">("checking")
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check Socket.IO connection
    const checkSocket = async () => {
      try {
        const response = await fetch("/api/socket", {
          method: "GET",
        })

        if (response.ok) {
          setSocketStatus("connected")
        } else {
          setSocketStatus("failed")
        }
      } catch (error) {
        console.error("Error checking socket:", error)
        setSocketStatus("failed")
      }
    }

    // Check media permissions
    const checkMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setMediaStatus("granted")
      } catch (error) {
        console.error("Error accessing media:", error)
        setMediaStatus("denied")
      }
    }

    // Check network status
    const checkNetwork = () => {
      setNetworkStatus(navigator.onLine ? "online" : "offline")

      const handleOnline = () => setNetworkStatus("online")
      const handleOffline = () => setNetworkStatus("offline")

      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }

    checkSocket()
    checkMedia()
    const cleanup = checkNetwork()

    return cleanup
  }, [])

  const allGood = socketStatus === "connected" && mediaStatus === "granted" && networkStatus === "online"

  const retryChecks = () => {
    setSocketStatus("checking")
    setMediaStatus("checking")
    setNetworkStatus("checking")
    window.location.reload()
  }

  const getStatusIcon = (status: string) => {
    if (status === "checking") return <RefreshCw className="h-5 w-5 animate-spin text-yellow-500" />
    if (status === "connected" || status === "granted" || status === "online")
      return <CheckCircle className="h-5 w-5 text-green-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  if (!showDetails && allGood) return null

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle>Connection Status</CardTitle>
        </div>
        <CardDescription>
          {allGood
            ? "All systems operational. You're ready to chat!"
            : "There are some issues with your connection. Check the details below."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(socketStatus)}
              <span>Chat Service</span>
            </div>
            <span className="text-sm">
              {socketStatus === "checking"
                ? "Checking..."
                : socketStatus === "connected"
                  ? "Connected"
                  : "Failed to connect"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(mediaStatus)}
              <span>Camera & Microphone</span>
            </div>
            <span className="text-sm">
              {mediaStatus === "checking"
                ? "Checking..."
                : mediaStatus === "granted"
                  ? "Access granted"
                  : "Access denied"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(networkStatus)}
              <span>Internet Connection</span>
            </div>
            <span className="text-sm">
              {networkStatus === "checking" ? "Checking..." : networkStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {!allGood && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md text-sm">
            <p className="font-medium mb-2">Troubleshooting tips:</p>
            <ul className="list-disc pl-5 space-y-1">
              {socketStatus === "failed" && (
                <li>Chat service connection failed. Check your internet connection or try again later.</li>
              )}
              {mediaStatus === "denied" && (
                <li>Camera or microphone access denied. Please allow access in your browser settings.</li>
              )}
              {networkStatus === "offline" && <li>You are offline. Please check your internet connection.</li>}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={retryChecks} className="mr-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
        {allGood && (
          <Button variant="outline" onClick={() => setShowDetails(false)}>
            Hide Details
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

