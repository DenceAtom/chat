"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export default function QuarantinePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [quarantineInfo, setQuarantineInfo] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get user ID from localStorage or other client-side storage
    const clientId = localStorage.getItem("clientId")
    if (clientId) {
      setUserId(clientId)

      // Check quarantine status
      checkQuarantineStatus(clientId)
    } else {
      // No user ID, redirect to home
      router.push("/")
    }
  }, [router])

  const checkQuarantineStatus = async (clientId: string) => {
    try {
      const response = await fetch(`/api/users/quarantine?userId=${clientId}`)
      const data = await response.json()

      if (!data.isQuarantined) {
        // Not quarantined, redirect to home
        router.push("/")
        return
      }

      setQuarantineInfo(data.quarantineInfo)
    } catch (error) {
      console.error("Error checking quarantine status:", error)
      toast({
        title: "Error",
        description: "Failed to check quarantine status. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!quarantineInfo) return

    const updateTimeRemaining = () => {
      const endTime = new Date(quarantineInfo.endTime).getTime()
      const now = Date.now()

      if (now >= endTime) {
        // Quarantine has ended
        setTimeRemaining("Expired")

        // Update user status
        if (userId) {
          // Redirect to home
          router.push("/")
        }
        return
      }

      const diff = endTime - now
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      )
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [quarantineInfo, userId, router])

  const handlePayToRemove = async () => {
    if (!userId) return

    setIsProcessing(true)

    try {
      // In a real app, you would redirect to a payment page or show a payment form
      // For this demo, we'll simulate a payment
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amount: 5.99,
          reason: "unquarantine",
        }),
      })

      if (response.ok) {
        toast({
          title: "Payment Successful",
          description: "Your quarantine has been removed. You can now return to the chat.",
        })

        // Payment successful, redirect to home
        router.push("/")
      } else {
        toast({
          title: "Payment Failed",
          description: "Please try again or contact support.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!quarantineInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-yellow-50">
          <CardTitle className="text-yellow-800">Account Quarantined</CardTitle>
          <CardDescription>Your account has been temporarily restricted</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Time Remaining</p>
            <p className="text-3xl font-bold">{timeRemaining}</p>
          </div>

          <div className="border-t pt-4">
            <p className="font-medium">Reason for Quarantine:</p>
            <p>{quarantineInfo.reason}</p>
          </div>

          <div>
            <p className="font-medium">Quarantine Level:</p>
            <p>
              Level {quarantineInfo.level} -{" "}
              {quarantineInfo.level === 1 ? "5 minutes" : quarantineInfo.level === 2 ? "30 minutes" : "3 hours"}
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm">
              Your account has been placed in quarantine due to a violation of our community guidelines. You can wait
              for the quarantine period to end, or pay to remove the restriction immediately.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-2">
          <Button className="w-full" onClick={handlePayToRemove} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Pay $5.99 to Remove Quarantine"}
          </Button>
          <p className="text-xs text-center text-gray-500">
            Repeated violations may result in longer quarantine periods or permanent bans.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

