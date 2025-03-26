"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import authService, { type User } from "@/lib/auth-service"

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true)
      try {
        const sessionId = localStorage.getItem("sessionId")
        if (sessionId) {
          const currentUser = await authService.getCurrentUser(sessionId)
          setUser(currentUser)
          setUsername(currentUser?.username || "")
          setBio(currentUser?.bio || "")
        }
      } catch (error) {
        console.error("Error loading user:", error)
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSaveProfile = async () => {
    if (!user) return

    try {
      // In a real app, you would call an API to update the user profile
      // For now, we'll just update the local state
      const updatedUser = {
        ...user,
        username,
        bio,
      }
      setUser(updatedUser)
      setIsEditing(false)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading profile...</div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4">Please log in to view your profile</p>
        <Button>Login</Button>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.profilePicture} alt={user.username} />
            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.username}</CardTitle>
            <CardDescription>Member since {new Date(user.createdAt).toLocaleDateString()}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Email</h3>
              <p>{user.email}</p>
            </div>
            <div>
              <h3 className="font-medium">Bio</h3>
              <p>{user.bio || "No bio provided"}</p>
            </div>
            <div>
              <h3 className="font-medium">Favorites</h3>
              <p>{user.favorites.length} users</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </CardFooter>
    </Card>
  )
}

