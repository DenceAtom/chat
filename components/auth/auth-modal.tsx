"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import LoginForm from "./login-form"
import RegisterForm from "./register-form"
import authService from "@/lib/auth-service"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [view, setView] = useState<"login" | "register">("login")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const sessionId = localStorage.getItem("sessionId")
      if (sessionId) {
        const user = await authService.getCurrentUser(sessionId)
        if (user) {
          setIsAuthenticated(true)
        }
      }
    }

    checkAuth()
  }, [])

  const handleSuccess = () => {
    setIsAuthenticated(true)
    onClose()
  }

  // If already authenticated, close the modal
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose()
    }
  }, [isAuthenticated, isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {view === "login" ? (
          <LoginForm onSuccess={handleSuccess} onRegisterClick={() => setView("register")} />
        ) : (
          <RegisterForm onSuccess={() => setView("login")} onLoginClick={() => setView("login")} />
        )}
      </DialogContent>
    </Dialog>
  )
}

