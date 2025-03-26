"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AuthContextType {
  showAuthModal: () => void
  hideAuthModal: () => void
  isAuthModalOpen: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const showAuthModal = () => setIsAuthModalOpen(true)
  const hideAuthModal = () => setIsAuthModalOpen(false)

  return (
    <AuthContext.Provider value={{ showAuthModal, hideAuthModal, isAuthModalOpen }}>
      {children}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Sign In</h2>
            <p className="mb-4">Please sign in to continue using the application.</p>
            <div className="flex justify-end">
              <button onClick={hideAuthModal} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

