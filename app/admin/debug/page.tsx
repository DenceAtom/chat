"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { RefreshCw, Trash } from "lucide-react"

export default function DebugPage() {
  const [localStorage, setLocalStorage] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      loadLocalStorage()
    }
  }, [isClient])

  const loadLocalStorage = () => {
    if (!isClient) return

    setIsLoading(true)
    try {
      const items: Record<string, any> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) {
          try {
            const value = window.localStorage.getItem(key)
            if (value) {
              items[key] = JSON.parse(value)
            }
          } catch (e) {
            items[key] = window.localStorage.getItem(key)
          }
        }
      }
      setLocalStorage(items)
    } catch (error) {
      console.error("Error loading localStorage:", error)
      toast({
        title: "Error",
        description: "Failed to load localStorage",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearLocalStorage = () => {
    if (!isClient) return

    try {
      window.localStorage.clear()
      setLocalStorage({})
      toast({
        title: "Success",
        description: "localStorage cleared",
      })
    } catch (error) {
      console.error("Error clearing localStorage:", error)
      toast({
        title: "Error",
        description: "Failed to clear localStorage",
        variant: "destructive",
      })
    }
  }

  const resetActiveConnections = () => {
    if (!isClient) return

    try {
      window.localStorage.setItem("activeConnections", JSON.stringify([]))
      loadLocalStorage()
      toast({
        title: "Success",
        description: "Active connections reset",
      })
    } catch (error) {
      console.error("Error resetting active connections:", error)
      toast({
        title: "Error",
        description: "Failed to reset active connections",
        variant: "destructive",
      })
    }
  }

  // If not on client yet, show loading
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Debug</h1>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">localStorage Data</h2>
        <div className="flex gap-2">
          <Button onClick={loadLocalStorage} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button variant="destructive" onClick={clearLocalStorage}>
            <Trash className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button variant="outline" onClick={resetActiveConnections}>
            Reset Active Connections
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.keys(localStorage).map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[300px]">
                {JSON.stringify(localStorage[key], null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}

        {Object.keys(localStorage).length === 0 && (
          <p className="text-center text-muted-foreground">No localStorage data found</p>
        )}
      </div>
    </div>
  )
}

