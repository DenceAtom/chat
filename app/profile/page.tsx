"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserProfile from "@/components/user/user-profile"
import FavoritesList from "@/components/user/favorites-list"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import authService from "@/lib/auth-service"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const sessionId = localStorage.getItem("sessionId")
      if (sessionId) {
        await authService.logout(sessionId)
        localStorage.removeItem("sessionId")

        toast({
          title: "Logged out",
          description: "You have been logged out successfully",
        })

        // Redirect to home page
        router.push("/")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Chat
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
        <TabsContent value="favorites">
          <FavoritesList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

