"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { CameraIcon, Send, X, MessageCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

import { FaceFilterSelector, type FilterType } from "./face-filter-selector"

interface MobileLayoutProps {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  isConnected: boolean
  isConnecting: boolean
  onSkip: () => void
  onStop: () => void
  onSwitchCamera: () => void
  onSendMessage: (e: React.FormEvent) => void
  message: string
  setMessage: (message: string) => void
  messages: { text: string; sender: "you" | "stranger"; timestamp: Date }[]
  formatTime: (date: Date) => string
  onOpenSettings: () => void
  activeFaceFilter: FilterType
  onFaceFilterChange: (filter: FilterType) => void
  faceFilterCanvasRef: React.RefObject<HTMLCanvasElement>
}

export default function MobileLayout({
  localVideoRef,
  remoteVideoRef,
  isConnected,
  isConnecting,
  onSkip,
  onStop,
  onSwitchCamera,
  onSendMessage,
  message,
  setMessage,
  messages,
  formatTime,
  onOpenSettings,
  activeFaceFilter,
  onFaceFilterChange,
  faceFilterCanvasRef,
}: MobileLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showChat, setShowChat] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lastReadMessageIndex, setLastReadMessageIndex] = useState(0)
  const [showMessagePreview, setShowMessagePreview] = useState(false)

  // Handle swipe gestures
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStartX(e.touches[0].clientX)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const diffX = touchEndX - touchStartX

      // Minimum swipe distance (px)
      const minSwipeDistance = 100

      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          // Swipe right - stop
          toast({
            title: "Chat Stopped",
            description: "Swiped right to stop chat",
          })
          onStop()
        } else {
          // Swipe left - skip
          toast({
            title: "Skipping",
            description: "Swiped left to find new person",
          })
          onSkip()
        }
      }
    }

    container.addEventListener("touchstart", handleTouchStart)
    container.addEventListener("touchend", handleTouchEnd)

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onSkip, onStop, touchStartX])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showChat])

  // Show message preview when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showChat) {
      // Check if there are new messages from the stranger
      const newStrangerMessages = messages.slice(lastReadMessageIndex).filter((msg) => msg.sender === "stranger")

      if (newStrangerMessages.length > 0) {
        setShowMessagePreview(true)

        // Auto-hide preview after 5 seconds
        const timer = setTimeout(() => {
          setShowMessagePreview(false)
        }, 5000)

        return () => clearTimeout(timer)
      }
    }
  }, [messages, lastReadMessageIndex, showChat])

  // Update last read message index when chat is opened
  useEffect(() => {
    if (showChat) {
      setLastReadMessageIndex(messages.length)
      setShowMessagePreview(false)
    }
  }, [showChat, messages.length])

  // Get unread message count
  const unreadCount = messages.slice(lastReadMessageIndex).filter((msg) => msg.sender === "stranger").length

  // Get the last message from stranger for preview
  const lastStrangerMessage =
    messages.length > 0 ? [...messages].reverse().find((msg) => msg.sender === "stranger") : null

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-120px)] bg-black overflow-hidden">
      {/* Remote video (top half) */}
      <div className="absolute top-0 left-0 right-0 h-[60%] bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain ${!isConnected ? "hidden" : ""}`}
        />

        {/* Connecting spinner */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="absolute mt-24 text-white font-medium">Finding someone...</p>
          </div>
        )}

        {/* Not connected state */}
        {!isConnected && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-center px-4">
              Swipe left to find someone new
              <br />
              Swipe right to stop
            </p>
          </div>
        )}
      </div>

      {/* Local video (bottom half) */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gray-800">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
        <canvas
          ref={faceFilterCanvasRef}
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
        />
        <FaceFilterSelector activeFilter={activeFaceFilter} onFilterChange={onFaceFilterChange} />

        {/* Camera switch button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 rounded-full bg-black bg-opacity-70"
          onClick={onSwitchCamera}
        >
          <CameraIcon className="h-4 w-4 text-white" />
        </Button>

        {/* Settings button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 left-2 rounded-full bg-black bg-opacity-70"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4 text-white" />
        </Button>

        {/* Message preview on local video */}
        {showMessagePreview && lastStrangerMessage && (
          <div
            className="absolute bottom-16 left-2 right-2 bg-black bg-opacity-70 p-2 rounded-lg"
            onClick={() => setShowChat(true)}
          >
            <p className="text-xs text-white font-medium">Stranger:</p>
            <p className="text-sm text-white truncate">{lastStrangerMessage.text}</p>
          </div>
        )}
      </div>

      {/* Chat toggle button with notification badge */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute bottom-2 left-2 rounded-full bg-black bg-opacity-70"
        onClick={() => setShowChat(!showChat)}
      >
        <MessageCircle className="h-4 w-4 text-white mr-1" />
        <span className="text-white">{showChat ? "Hide Chat" : "Chat"}</span>
        {unreadCount > 0 && !showChat && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Chat overlay - only covers bottom half */}
      {showChat && (
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-black bg-opacity-90 flex flex-col">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <h3 className="text-white font-medium">Chat</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <p className="text-gray-400 text-center mt-8">
                {isConnected ? "Say hello to start a conversation!" : "Messages will appear here once connected"}
              </p>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-2 rounded-lg ${
                  msg.sender === "you" ? "bg-primary text-primary-foreground ml-auto" : "bg-gray-700 text-white"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs opacity-70">{msg.sender === "you" ? "You" : "Stranger"}</p>
                  <p className="text-xs opacity-70">{formatTime(msg.timestamp)}</p>
                </div>
                <p className="mt-1">{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSendMessage} className="p-2 border-t border-gray-700 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!isConnected}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button type="submit" size="icon" variant="secondary" disabled={!isConnected}>
              <Send className="h-4 w-4 text-white" />
            </Button>
          </form>
        </div>
      )}

      {/* Swipe instructions - only show when not connected */}
      {!isConnected && !isConnecting && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black bg-opacity-70 text-white text-xs px-3 py-1 rounded-full">
            Swipe left: Skip • Swipe right: Stop
          </div>
        </div>
      )}
    </div>
  )
}

