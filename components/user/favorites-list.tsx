"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import authService, { type User } from "@/lib/auth-service"
import { Video, X } from "lucide-react"

export default function FavoritesList() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [favorites, setFavorites] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true)
      try {
        const sessionId = localStorage.getItem("sessionId")
        if (sessionId) {
          const user = await authService.getCurrentUser(sessionId)
          setCurrentUser(user)

          if (user) {
            const favoriteUsers = await authService.getFavoriteUsers(user.id)
            setFavorites(favoriteUsers)
          }
        }
      } catch (error) {
        console.error("Error loading favorites:", error)
        toast({
          title: "Error",
          description: "Failed to load favorites",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadFavorites()
  }, [])

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!currentUser) return

    try {
      await authService.removeFromFavorites(currentUser.id, favoriteId)
      setFavorites(favorites.filter((user) => user.id !== favoriteId))

      toast({
        title: "Removed from favorites",
        description: "User has been removed from your favorites",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      })
    }
  }

  const handleStartChat = (favoriteId: string) => {
    // In a real app, this would initiate a direct chat with the favorite user
    toast({
      title: "Starting chat",
      description: "Connecting to user...",
    })
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading favorites...</div>
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4">Please log in to view your favorites</p>
        <Button>Login</Button>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Your Favorites</CardTitle>
        <CardDescription>People you've favorited during video chats</CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            You haven't added any favorites yet. When you meet someone interesting, click the star icon to add them to
            your favorites.
          </p>
        ) : (
          <div className="space-y-4">
            {favorites.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.profilePicture} alt={user.username} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user.username}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.isOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        <span>Last seen {new Date(user.lastSeen).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleStartChat(user.id)}>
                    <Video className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRemoveFavorite(user.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

