"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Flag,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Maximize,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import Logo from "@/components/logo"
import ReportDialog from "@/components/report-dialog"
import { useMobile } from "@/hooks/use-mobile"
import { detectUserCountry } from "@/lib/geo-location"
import { WebRTCService } from "@/lib/webrtc-service"
import { SignalingService } from "@/lib/signaling-service"
import VideoFilters from "@/components/video-filters"
import ConnectionStatus from "@/components/connection-status"
import MobileLayout from "@/components/mobile-layout"

// Import the client database service instead of the server one
import clientDatabaseService from "@/lib/client-database-service"
import { getClientIp } from "@/lib/get-client-ip"
import { useRouter } from "next/navigation"

// Add these imports at the top of the file
import FaceFilterSelector from "@/components/face-filter-selector"
import type { FilterType } from "@/components/face-filter-selector"
import faceFilterManager from "@/lib/face-filters"

// Add imports for the auth components at the top of the file
import AuthModal from "@/components/auth/auth-modal"
import authService from "@/lib/auth-service"

export default function VideoChat() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localCanvasRef = useRef<HTMLCanvasElement>(null)
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{ text: string; sender: "you" | "stranger"; timestamp: Date }[]>([])
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [userGender, setUserGender] = useState<string | null>("male") // Default to male
  const [preferredGender, setPreferredGender] = useState<string | null>("both") // Default to both
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [volume, setVolume] = useState(80)
  const [autoSkipTimer, setAutoSkipTimer] = useState(0)
  const [isAutoSkipEnabled, setIsAutoSkipEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState("")
  const [activeTab, setActiveTab] = useState("chat")
  const [remoteVideoHeight, setRemoteVideoHeight] = useState(300)
  const [localVideoHeight, setLocalVideoHeight] = useState(200)
  const [isResizingRemote, setIsResizingRemote] = useState(false)
  const [isResizingLocal, setIsResizingLocal] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("waiting")
  const [isAutoReconnectEnabled, setIsAutoReconnectEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [connectionDetails, setConnectionDetails] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentPeerId, setCurrentPeerId] = useState<string | null>(null)
  const [currentPeerPreferences, setCurrentPeerPreferences] = useState<any>(null)
  const [isCancelled, setIsCancelled] = useState(false) // State to track if search was cancelled
  const [hasRemoteStream, setHasRemoteStream] = useState(false) // State to track if we have a remote stream
  const [userInitiatedStop, setUserInitiatedStop] = useState(false) // New state to track if user initiated stop
  const [cameraType, setCameraType] = useState<"user" | "environment">("user")
  const [activeFaceFilter, setActiveFaceFilter] = useState<FilterType>("none")
  const faceFilterCanvasRef = useRef<HTMLCanvasElement>(null)

  // Add these state variables inside the VideoChat component
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isFavorited, setIsFavorited] = useState(false)

  // Inside the VideoChat component, add this code after the state declarations:

  const router = useRouter()

  const videosContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const webRTCServiceRef = useRef<WebRTCService | null>(null)
  const signalingServiceRef = useRef<SignalingService | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const filterCanvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useMobile()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if user is banned or quarantined
  useEffect(() => {
    const checkUserStatus = () => {
      if (!webRTCServiceRef.current) return

      const clientId = webRTCServiceRef.current.signalingService.getClientId()
      if (!clientId) return

      // Store client ID in localStorage for the quarantine page
      localStorage.setItem("clientId", clientId)

      const status = clientDatabaseService.isUserBannedOrQuarantined(clientId)

      if (status.isBanned) {
        setErrorMessage("Your account has been banned for violating our community guidelines.")
        return
      }

      if (status.isQuarantined) {
        // Redirect to quarantine page
        router.push("/quarantine")
        return
      }
    }

    // Check status when component mounts
    if (isInitialized) {
      checkUserStatus()
    }
  }, [isInitialized, router])

  // Initialize services
  useEffect(() => {
    try {
      console.log("Initializing services...")

      // Create signaling service
      if (!signalingServiceRef.current) {
        signalingServiceRef.current = new SignalingService()
        console.log("Signaling service created")
      }

      // Create WebRTC service with the signaling service
      if (!webRTCServiceRef.current && signalingServiceRef.current) {
        webRTCServiceRef.current = new WebRTCService(signalingServiceRef.current)
        console.log("WebRTC service created")

        // Set up callbacks
        setupWebRTCCallbacks()
      }

      setIsInitialized(true)
      console.log("Services initialized")

      // Connect to signaling server
      if (signalingServiceRef.current) {
        signalingServiceRef.current
          .connect()
          .then(() => {
            console.log("Connected to signaling server")
          })
          .catch((error) => {
            console.error("Failed to connect to signaling server:", error)
            setErrorMessage("Failed to connect to chat server. Please try again.")

            toast({
              title: "Connection Error",
              description: "Failed to connect to chat server. Please try again.",
              variant: "destructive",
            })
          })
      }
    } catch (error) {
      console.error("Error initializing services:", error)
      setErrorMessage("Failed to initialize chat services. Please refresh the page.")

      toast({
        title: "Initialization Error",
        description: "Failed to initialize chat services. Please refresh the page.",
        variant: "destructive",
      })
    }

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (webRTCServiceRef.current) {
        // Use an IIFE to handle the async cleanup
        ;(async () => {
          try {
            if (webRTCServiceRef.current) {
              await webRTCServiceRef.current.cleanup()
            }
          } catch (error) {
            console.error("Error during cleanup:", error)
          }
        })()
      }

      if (signalingServiceRef.current) {
        signalingServiceRef.current.disconnect()
      }

      // Clean up face filter manager
      faceFilterManager.dispose()
    }
  }, [])

  // Add this effect to initialize face filters
  useEffect(() => {
    if (isInitialized && localVideoRef.current && faceFilterCanvasRef.current) {
      // Initialize face filter manager
      faceFilterManager.initialize(localVideoRef.current, faceFilterCanvasRef.current)

      // Load models in background
      faceFilterManager.loadModels().catch((error) => {
        console.error("Error loading face models:", error)
      })
    }
  }, [isInitialized])

  // Update the onRemoteStream callback to ensure the video element gets the stream
  useEffect(() => {
    if (isInitialized) {
      setupWebRTCCallbacks()
    }
  }, [isInitialized])

  // Set up WebRTC callbacks
  const setupWebRTCCallbacks = () => {
    if (!webRTCServiceRef.current) return

    webRTCServiceRef.current.onConnected(() => {
      console.log("WebRTC connected")
      setIsConnected(true)
      setIsConnecting(false)
      setIsPreviewMode(false)
      setConnectionStatus("connected")
      setErrorMessage(null)
      setIsCancelled(false) // Reset cancelled state when connected
      setUserInitiatedStop(false) // Reset user stop flag when connected

      // Add system message
      setMessages([
        {
          text: "You are now connected with a stranger. Say hello!",
          sender: "stranger",
          timestamp: new Date(),
        },
      ])

      toast({
        title: "Connected",
        description: "You are now connected with a stranger",
      })
    })

    webRTCServiceRef.current.onDisconnected((reason) => {
      console.log(`WebRTC disconnected, reason: ${reason || "unknown"}`)
      setIsConnected(false)
      setMessages([])
      setIsPreviewMode(true)
      setConnectionStatus("disconnected")
      setCurrentPeerId(null)
      setCurrentPeerPreferences(null)
      setHasRemoteStream(false) // Reset remote stream state

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }

      toast({
        title: "Disconnected",
        description: "Connection ended",
      })

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Handle different disconnect reasons
      if (reason === "user-stop" || reason === "user-skip") {
        // If the current user initiated the disconnect (stop or skip), don't auto-reconnect
        console.log("User initiated disconnect, not auto-reconnecting")
        if (reason === "user-stop") {
          setIsCancelled(true) // Only set cancelled if user pressed stop
        }
      } else if (reason === "cleanup") {
        // App is being unmounted, don't reconnect
        console.log("App cleanup, not reconnecting")
      } else {
        // Other party disconnected or connection lost
        // Only auto-reconnect if the user has enabled that setting
        if (isAutoReconnectEnabled) {
          console.log("Other user disconnected, setting up auto-reconnect...")

          // Auto-reconnect after 1 second
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isAutoReconnectEnabled && !userInitiatedStop) {
              console.log("Auto-reconnecting...")
              // Reset error state before reconnecting
              setErrorMessage(null)
              // Use an IIFE to handle the async handleStart
              ;(async () => {
                try {
                  await handleStart()
                } catch (error) {
                  console.error("Error during auto-reconnect:", error)
                }
              })()
            }
          }, 1000) // 1 second delay for auto-reconnect
        } else {
          console.log("Auto-reconnect disabled, waiting for user to start manually")
        }
      }
    })

    webRTCServiceRef.current.onRemoteStream((stream) => {
      console.log("Remote stream received")
      if (remoteVideoRef.current) {
        // Ensure the stream is properly attached to the video element
        remoteVideoRef.current.srcObject = stream

        // Force the video to play
        remoteVideoRef.current.play().catch((err) => {
          console.error("Error playing remote video:", err)
        })

        setConnectionStatus("streaming")
        setHasRemoteStream(true) // Set remote stream state

        // Add a check to ensure the stream is active
        const checkStreamInterval = setInterval(() => {
          if (stream.active) {
            console.log("Remote stream is active")
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              console.log("Reattaching remote stream")
              remoteVideoRef.current.srcObject = stream
              remoteVideoRef.current.play().catch((err) => {
                console.error("Error playing remote video:", err)
              })
            }
          } else {
            console.log("Remote stream is not active")
            clearInterval(checkStreamInterval)
          }
        }, 2000)
      }
    })

    webRTCServiceRef.current.onMessage((message) => {
      setMessages((prev) => [
        ...prev,
        {
          text: message,
          sender: "stranger",
          timestamp: new Date(),
        },
      ])
    })

    webRTCServiceRef.current.onConnectionStatus((status) => {
      setConnectionDetails(status)
    })

    webRTCServiceRef.current.onError((error) => {
      console.error("WebRTC error:", error)
      setConnectionStatus("error")
      setErrorMessage(error)
      setIsConnecting(false)

      // Don't auto-reconnect on errors - this was causing the loop
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      })
    })

    webRTCServiceRef.current.onMatchFound((peerId, peerPreferences) => {
      console.log("Match found with peer:", peerId)
      setCurrentPeerId(peerId)
      setCurrentPeerPreferences(peerPreferences)
    })
  }

  // Detect user's country on component mount
  useEffect(() => {
    async function getCountry() {
      const country = await detectUserCountry()
      if (country) {
        setSelectedCountry(country.code)
      }
    }

    getCountry()
  }, [])

  // Initialize webcam preview on component mount
  useEffect(() => {
    if (isInitialized) {
      initializeWebcam()
    }
  }, [isInitialized])

  // Initialize webcam for preview
  const initializeWebcam = async () => {
    try {
      if (webRTCServiceRef.current) {
        const stream = await webRTCServiceRef.current.initializeMedia()
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          setIsPreviewMode(true)

          // Register user in the database
          // Get IP and country (in a real app, you would get this from the server)
          const ip = "127.0.0.1" // Placeholder
          const country = selectedCountry

          // Register user
          webRTCServiceRef.current.registerUser(ip, country)
        }
      }
    } catch (err) {
      console.error("Error accessing media devices:", err)
      setErrorMessage("Could not access your camera or microphone. Please check permissions.")

      toast({
        title: "Camera Access Error",
        description: "Could not access your camera or microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  // Inside the VideoChat component, add this effect to register the user
  useEffect(() => {
    const registerUser = async () => {
      try {
        // Get the client IP
        const ip = await getClientIp()

        // Register the user in the database
        if (webRTCServiceRef.current && selectedCountry) {
          webRTCServiceRef.current.registerUser(ip, selectedCountry)
        }
      } catch (error) {
        console.error("Error registering user:", error)
      }
    }

    if (webRTCServiceRef.current && selectedCountry) {
      registerUser()
    }
  }, [selectedCountry])

  // Add this effect to register the user as soon as the component mounts
  useEffect(() => {
    const registerUserInDatabase = async () => {
      if (!webRTCServiceRef.current || !signalingServiceRef.current) return

      try {
        // Generate a random IP for demo purposes
        const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

        console.log("Registering user in database with IP:", ip)
        webRTCServiceRef.current.registerUser(ip, selectedCountry)

        // Log the client ID for debugging
        const clientId = signalingServiceRef.current.getClientId()
        console.log("Client ID:", clientId)

        // Store in localStorage for easier access
        localStorage.setItem("clientId", clientId)

        // Also update the shared state service
        const userData = {
          id: clientId,
          ip,
          country: selectedCountry,
          connectionTime: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          connected: true,
          reportCount: 0,
          violations: 0,
          quarantineStatus: null,
          bannedStatus: null,
        }

        // Update the shared state with this user's information
        import("@/lib/shared-state")
          .then((module) => {
            const sharedStateService = module.default
            sharedStateService.updateUserState(userData)
            console.log("Updated shared state with user data")
          })
          .catch((error) => {
            console.error("Error importing shared state service:", error)
          })
      } catch (error) {
        console.error("Error registering user:", error)
      }
    }

    if (isInitialized) {
      registerUserInDatabase()
    }
  }, [isInitialized, selectedCountry])

  // Add this effect to check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem("sessionId")
      if (sessionId) {
        const user = await authService.getCurrentUser(sessionId)
        setCurrentUser(user)
      }
    }

    checkAuth()
  }, [])

  // Add this effect to check if the current peer is favorited
  useEffect(() => {
    const checkFavorited = async () => {
      if (currentUser && currentPeerId) {
        const favorites = currentUser.favorites || []
        setIsFavorited(favorites.includes(currentPeerId))
      }
    }

    checkFavorited()
  }, [currentUser, currentPeerId])

  // Add this function to handle face filter changes
  const handleFaceFilterChange = (filter: FilterType) => {
    setActiveFaceFilter(filter)
    faceFilterManager.setFilter(filter)
  }

  // Apply video filters
  useEffect(() => {
    if (!activeFilter || activeFilter === "none" || !localVideoRef.current || !localVideoRef.current.srcObject) return

    const video = localVideoRef.current
    const canvas = filterCanvasRef.current
    if (!canvas) return

    // Set canvas dimensions to match video
    const setCanvasDimensions = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        console.log(`Canvas dimensions set to ${canvas.width}x${canvas.height}`)
      } else {
        // Default dimensions if video dimensions aren't available yet
        canvas.width = 640
        canvas.height = 480
      }
    }

    // Initial setup
    setCanvasDimensions()

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.error("Could not get canvas context")
      return
    }

    let animationFrame: number

    // Draw video frame with filter applied
    const drawVideoFrame = () => {
      // Check if video is playing
      if (video.paused || video.ended) {
        animationFrame = requestAnimationFrame(drawVideoFrame)
        return
      }

      // Ensure canvas dimensions match video
      if (
        video.videoWidth &&
        video.videoHeight &&
        (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)
      ) {
        setCanvasDimensions()
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Apply the selected filter
      switch (activeFilter) {
        case "grayscale":
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
            data[i] = avg // red
            data[i + 1] = avg // green
            data[i + 2] = avg // blue
          }
          ctx.putImageData(imageData, 0, 0)
          break

        case "sepia":
          const sepiaData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const sepiaPixels = sepiaData.data
          for (let i = 0; i < sepiaPixels.length; i += 4) {
            const r = sepiaPixels[i]
            const g = sepiaPixels[i + 1]
            const b = sepiaPixels[i + 2]
            sepiaPixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
            sepiaPixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
            sepiaPixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
          }
          ctx.putImageData(sepiaData, 0, 0)
          break

        case "invert":
          const invertData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const invertPixels = invertData.data
          for (let i = 0; i < invertPixels.length; i += 4) {
            invertPixels[i] = 255 - invertPixels[i] // red
            invertPixels[i + 1] = 255 - invertPixels[i + 1] // green
            invertPixels[i + 2] = 255 - invertPixels[i + 2] // blue
          }
          ctx.putImageData(invertData, 0, 0)
          break

        case "blur":
          // Save the current canvas
          ctx.save()
          // Apply a blur filter
          ctx.filter = "blur(5px)"
          // Draw the video again with the filter
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          // Restore the canvas (removes the filter)
          ctx.restore()
          break
      }

      // Continue animation
      animationFrame = requestAnimationFrame(drawVideoFrame)
    }

    // Start the animation
    drawVideoFrame()

    // Clean up on unmount or when filter changes
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [activeFilter])

  // Handle mouse events for resizing remote video
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRemote && videosContainerRef.current) {
        const containerRect = videosContainerRef.current.getBoundingClientRect()
        const newHeight = Math.max(150, e.clientY - containerRect.top)
        setRemoteVideoHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsResizingRemote(false)
    }

    if (isResizingRemote) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingRemote])

  // Handle mouse events for resizing local video
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLocal && videosContainerRef.current) {
        const containerRect = videosContainerRef.current.getBoundingClientRect()
        const remoteBottom = containerRect.top + remoteVideoHeight
        const newHeight = Math.max(100, e.clientY - remoteBottom)
        setLocalVideoHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsResizingLocal(false)
    }

    if (isResizingLocal) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingLocal, remoteVideoHeight])

  // Handle touch events for mobile resizing
  useEffect(() => {
    const handleTouchMoveRemote = (e: TouchEvent) => {
      if (isResizingRemote && videosContainerRef.current && e.touches[0]) {
        const containerRect = videosContainerRef.current.getBoundingClientRect()
        const newHeight = Math.max(150, e.touches[0].clientY - containerRect.top)
        setRemoteVideoHeight(newHeight)
        e.preventDefault()
      }
    }

    const handleTouchMoveLocal = (e: TouchEvent) => {
      if (isResizingLocal && videosContainerRef.current && e.touches[0]) {
        const containerRect = videosContainerRef.current.getBoundingClientRect()
        const remoteBottom = containerRect.top + remoteVideoHeight
        const newHeight = Math.max(100, e.touches[0].clientY - remoteBottom)
        setLocalVideoHeight(newHeight)
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      setIsResizingRemote(false)
      setIsResizingLocal(false)
    }

    if (isResizingRemote) {
      document.addEventListener("touchmove", handleTouchMoveRemote, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    if (isResizingLocal) {
      document.addEventListener("touchmove", handleTouchMoveLocal, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMoveRemote)
      document.removeEventListener("touchmove", handleTouchMoveLocal)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isResizingRemote, isResizingLocal, remoteVideoHeight])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-skip timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isConnected && isAutoSkipEnabled && autoSkipTimer > 0) {
      let remainingTime = autoSkipTimer
      interval = setInterval(() => {
        remainingTime -= 1
        if (remainingTime <= 0) {
          handleSkip()
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isConnected, isAutoSkipEnabled, autoSkipTimer])

  // Connection timeout - if connecting for too long, reset
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    if (isConnecting && !isCancelled) {
      timeout = setTimeout(() => {
        if (isConnecting && !isCancelled) {
          setIsConnecting(false)
          setConnectionStatus("error")
          setErrorMessage("Connection timeout. Could not find a match.")

          // Clear any skipped peers to allow more matching possibilities
          if (webRTCServiceRef.current) {
            webRTCServiceRef.current.clearSkippedPeers()
          }

          toast({
            title: "Connection Timeout",
            description: "Could not find a match. Please try again.",
            variant: "destructive",
          })
        }
      }, 30000) // 30 second timeout
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isConnecting, isCancelled])

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Start finding a match
  const handleStart = async () => {
    console.log("Start button clicked")

    if (isConnected || isConnecting) {
      console.log("Already connected or connecting")
      return
    }

    // Reset states
    setErrorMessage(null)
    setIsCancelled(false)
    setUserInitiatedStop(false) // Reset the user initiated stop flag
    setConnectionAttempts(0)
    setHasRemoteStream(false)

    console.log("Starting chat...")
    setIsConnecting(true)
    setConnectionAttempts((prev) => prev + 1)
    setConnectionStatus("connecting")

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      // Initialize media if not already done
      if (!localVideoRef.current?.srcObject && webRTCServiceRef.current) {
        console.log("Initializing media...")
        webRTCServiceRef.current
          .initializeMedia()
          .then((stream) => {
            if (localVideoRef.current) {
              console.log("Setting local video stream")
              localVideoRef.current.srcObject = stream
              setIsPreviewMode(true)

              // Continue with finding match
              startMatching()
            }
          })
          .catch((error) => {
            console.error("Error accessing media devices:", error)
            setIsConnecting(false)
            setConnectionStatus("error")
            setErrorMessage("Could not access camera or microphone")
            setIsCancelled(true) // Prevent auto-reconnect on error

            toast({
              title: "Camera Access Error",
              description: "Could not access your camera or microphone. Please check permissions.",
              variant: "destructive",
            })
          })
      } else {
        // Already have media, continue with finding match
        startMatching()
      }
    } catch (error) {
      console.error("Error starting chat:", error)
      setIsConnecting(false)
      setConnectionStatus("error")
      setErrorMessage("Failed to start chat: " + (error instanceof Error ? error.message : String(error)))
      setIsCancelled(true) // Prevent auto-reconnect on error

      toast({
        title: "Connection Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      })
    }

    async function startMatching() {
      if (!webRTCServiceRef.current) {
        console.error("WebRTC service not initialized")
        setIsConnecting(false)
        setConnectionStatus("error")
        setErrorMessage("WebRTC service not initialized")
        setIsCancelled(true) // Prevent auto-reconnect on error
        return
      }

      // Clear any skipped peers when starting a new search
      webRTCServiceRef.current.clearSkippedPeers()

      // Register preferences
      console.log("Registering preferences...")
      webRTCServiceRef.current.register({
        country: selectedCountry,
        userGender,
        preferredGender,
        interests,
      })

      // Find match
      console.log("Finding match...")
      try {
        await webRTCServiceRef.current.findMatch()
      } catch (error) {
        console.error("Error finding match:", error)
        setIsConnecting(false)
        setConnectionStatus("error")
        setErrorMessage("Failed to find match: " + (error instanceof Error ? error.message : String(error)))
        setIsCancelled(true)
      }
    }
  }

  // Add this function to handle favoriting a user
  const handleToggleFavorite = async () => {
    if (!currentUser || !currentPeerId) return

    try {
      if (isFavorited) {
        await authService.removeFromFavorites(currentUser.id, currentPeerId)
        setIsFavorited(false)
        toast({
          title: "Removed from favorites",
          description: "User has been removed from your favorites",
        })
      } else {
        await authService.addToFavorites(currentUser.id, currentPeerId)
        setIsFavorited(true)
        toast({
          title: "Added to favorites",
          description: "User has been added to your favorites",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      })
    }
  }

  // Add this function to handle login/profile button click
  const handleAuthClick = () => {
    if (currentUser) {
      // Navigate to profile page
      window.location.href = "/profile"
    } else {
      // Show auth modal
      setShowAuthModal(true)
    }
  }

  // Stop the current chat or stop searching
  const handleStop = async () => {
    if (!webRTCServiceRef.current) return

    try {
      // Set user initiated stop flag
      setUserInitiatedStop(true)

      // Set cancelled state to prevent auto-reconnect
      setIsCancelled(true)

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Reset error state
      setErrorMessage(null)

      // Reset connection attempts
      setConnectionAttempts(0)

      if (isConnected) {
        await webRTCServiceRef.current.disconnect("user-stop")
      } else if (isConnecting) {
        // Stop searching for a match
        webRTCServiceRef.current.cancelFindMatch()
        setIsConnecting(false)
        setConnectionStatus("waiting")

        toast({
          title: "Search Cancelled",
          description: "Stopped looking for a match",
        })
      }
    } catch (error) {
      console.error("Error stopping chat:", error)
    }
  }

  // Skip to the next user
  const handleSkip = async () => {
    if (!webRTCServiceRef.current) return

    try {
      // Reset cancelled state
      setIsCancelled(false)

      // This is a user-initiated action, but not a stop
      // We're explicitly looking for a new match
      setUserInitiatedStop(false)

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Reset remote stream state
      setHasRemoteStream(false)

      // Use the skipPeer method to add the current peer to the recently skipped list
      if (isConnected) {
        await webRTCServiceRef.current.skipPeer()
      } else if (webRTCServiceRef.current.disconnect) {
        await webRTCServiceRef.current.disconnect("user-skip")
      }

      // Start finding a new match
      setIsConnecting(true)
      setConnectionAttempts((prev) => prev + 1)
      setConnectionStatus("connecting")
      setErrorMessage(null)

      // Register user preferences again
      webRTCServiceRef.current.register({
        country: selectedCountry,
        userGender,
        preferredGender,
        interests,
      })

      // Start finding a new match
      try {
        await webRTCServiceRef.current.findMatch()
      } catch (error) {
        console.error("Error finding match after skip:", error)
        setIsConnecting(false)
        setConnectionStatus("error")
        setErrorMessage("Failed to find next user: " + (error instanceof Error ? error.message : String(error)))
      }
    } catch (error) {
      console.error("Error skipping to next user:", error)
      setIsConnecting(false)
      setConnectionStatus("error")
      setErrorMessage("Failed to find next user: " + (error instanceof Error ? error.message : String(error)))

      toast({
        title: "Connection Error",
        description: "Failed to find next user. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Send a chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !isConnected || !webRTCServiceRef.current) return

    const newMessage = {
      text: message,
      sender: "you" as const,
      timestamp: new Date(),
    }

    // Add to local messages
    setMessages((prev) => [...prev, newMessage])

    // Send via WebRTC data channel
    try {
      webRTCServiceRef.current.sendMessage(message)
    } catch (error) {
      console.error("Error sending message:", error)
    }

    // Clear input
    setMessage("")
  }

  // Toggle microphone
  const toggleMic = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicEnabled
      })
      setIsMicEnabled(!isMicEnabled)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoEnabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isAudioEnabled
      setIsAudioEnabled(!isAudioEnabled)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = value[0] / 100
    }
  }

  // Add an interest
  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()])
      setNewInterest("")
    }
  }

  // Remove an interest
  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest))
  }

  // Handle report submission
  const handleReport = async (reason: string, details: string, screenshot: string | null) => {
    try {
      if (!webRTCServiceRef.current || !currentPeerId) {
        throw new Error("Cannot report: connection not established")
      }

      const reporterId = webRTCServiceRef.current.signalingService.getClientId()

      await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          details,
          screenshot,
          reportedUserId: currentPeerId,
          reportedBy: reporterId,
          timestamp: new Date().toISOString(),
        }),
      })

      // Automatically skip after reporting
      handleSkip()

      return Promise.resolve()
    } catch (error) {
      console.error("Error submitting report:", error)
      return Promise.reject(error)
    }
  }

  // Format time for messages
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!videosContainerRef.current) return

    if (!document.fullscreenElement) {
      videosContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Apply filter
  const applyFilter = (filter: string) => {
    console.log(`Applying filter: ${filter}`)
    setActiveFilter(filter)

    // If we're applying a filter, make sure the canvas is visible
    if (filter !== "none" && filterCanvasRef.current) {
      filterCanvasRef.current.style.display = "block"
      if (localVideoRef.current) {
        localVideoRef.current.style.display = "none"
      }
    } else {
      // If we're removing filters, hide the canvas and show the video
      if (filterCanvasRef.current) {
        filterCanvasRef.current.style.display = "none"
      }
      if (localVideoRef.current) {
        localVideoRef.current.style.display = "block"
      }
    }
  }

  // Switch between front and back camera
  const switchCamera = async () => {
    try {
      if (!localVideoRef.current) return

      // Stop all tracks in the current stream
      if (localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }

      // Get new stream with the opposite camera
      const newCameraType = cameraType === "user" ? "environment" : "user"
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newCameraType },
        audio: true,
      })

      // Update the local video
      localVideoRef.current.srcObject = newStream
      setCameraType(newCameraType)

      // If connected, we need to update the peer connection
      if (isConnected && webRTCServiceRef.current && webRTCServiceRef.current.peerConnection) {
        // Replace the video track in the peer connection
        const videoTrack = newStream.getVideoTracks()[0]
        const senders = webRTCServiceRef.current.peerConnection.getSenders()
        const videoSender = senders.find((sender) => sender.track && sender.track.kind === "video")
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
        }
      }

      // Store the new stream in the WebRTC service
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.localStream = newStream
      }

      toast({
        title: "Camera Switched",
        description: `Switched to ${newCameraType === "user" ? "front" : "back"} camera`,
      })
    } catch (error) {
      console.error("Error switching camera:", error)
      toast({
        title: "Camera Switch Failed",
        description: "Could not switch camera. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Initialize video stream
  useEffect(() => {
    const initializeStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Error accessing media devices:", error)
      }
    }

    initializeStream()

    return () => {
      // Clean up
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Toggle audio
  const toggleAudio2 = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const audioTrack = stream.getAudioTracks()[0]

      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  // Toggle video
  const toggleVideo2 = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const videoTrack = stream.getVideoTracks()[0]

      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  // Use mobile layout on small screens
  if (isMobile) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="py-4 px-2">
          <Logo />
        </div>

        <MobileLayout
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          isConnected={isConnected}
          isConnecting={isConnecting}
          onSkip={handleSkip}
          onStop={handleStop}
          onSwitchCamera={switchCamera}
          onSendMessage={handleSendMessage}
          message={message}
          setMessage={setMessage}
          messages={messages}
          formatTime={formatTime}
          onOpenSettings={() => setShowSettings(true)}
          activeFaceFilter={activeFaceFilter}
          onFaceFilterChange={handleFaceFilterChange}
          faceFilterCanvasRef={faceFilterCanvasRef}
        />

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="volume" className="col-span-4">
                  Volume: {volume}%
                </Label>
                <div className="col-span-4">
                  <Slider id="volume" defaultValue={[volume]} max={100} step={1} onValueChange={handleVolumeChange} />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="auto-reconnect" className="col-span-3">
                  Auto search for new users
                </Label>
                <Switch
                  id="auto-reconnect"
                  checked={isAutoReconnectEnabled}
                  onCheckedChange={setIsAutoReconnectEnabled}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="debug-mode" className="col-span-3">
                  Debug Mode
                </Label>
                <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden canvas for capturing screenshots */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={filterCanvasRef} className="hidden" />

        {/* Debug info panel */}
        {debugMode && (
          <div className="mt-4 p-4 bg-gray-800 text-white text-xs font-mono overflow-auto max-h-[200px]">
            <h3 className="font-bold mb-2">Debug Information:</h3>
            <div>
              <p>Connection Status: {connectionStatus}</p>
              <p>Error Message: {errorMessage || "None"}</p>
              <p>Local Video: {localVideoRef.current?.srcObject ? "Available" : "Not available"}</p>
              <p>Remote Video: {remoteVideoRef.current?.srcObject ? "Available" : "Not available"}</p>
              <p>Connection Attempts: {connectionAttempts}</p>
              <p>Current Peer ID: {currentPeerId || "None"}</p>
              <p>Cancelled: {isCancelled ? "Yes" : "No"}</p>
              <p>Has Remote Stream: {hasRemoteStream ? "Yes" : "No"}</p>
              <p>User Initiated Stop: {userInitiatedStop ? "Yes" : "No"}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center mb-8">
        <Logo />
        <h1 className="sr-only">Random Video Chat</h1>
      </div>

      <ConnectionStatus />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main video container */}
          <div ref={videosContainerRef} className="rounded-lg overflow-hidden shadow-lg mb-4">
            <div className="flex flex-col bg-black">
              {/* Remote video (stranger) */}
              <div className="relative bg-black w-full" style={{ height: `${remoteVideoHeight}px` }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-contain ${!isConnected ? "hidden" : ""}`}
                />

                {/* Stranger video placeholder when connected */}
                {isConnected && !hasRemoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <p className="text-white text-lg mb-2">Stranger's Video</p>
                    <p className="text-white text-sm opacity-70">(Waiting for connection...)</p>
                  </div>
                )}

                {/* Connecting spinner */}
                {isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="absolute mt-24 text-white font-medium">
                      Finding someone{connectionAttempts > 1 ? ` (attempt ${connectionAttempts})` : ""}...
                    </p>
                  </div>
                )}

                {/* Not connected state */}
                {!isConnected && !isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <p className="text-white text-xl mb-4">Click Start to begin chatting</p>
                    <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white" onClick={handleStart}>
                      Start
                    </Button>

                    {/* Show error message if there is one */}
                    {errorMessage && <p className="text-red-500 mt-4 text-center max-w-md">Error: {errorMessage}</p>}
                  </div>
                )}

                {/* Volume indicator */}
                {isConnected && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
                    {isAudioEnabled ? (
                      <Volume2 className="text-white h-5 w-5" />
                    ) : (
                      <VolumeX className="text-white h-5 w-5" />
                    )}
                  </div>
                )}

                {/* Report button */}
                {isConnected && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-full p-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0"
                            onClick={() => setShowReportDialog(true)}
                          >
                            <AlertTriangle className="text-white h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Report inappropriate behavior</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Fullscreen button */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={toggleFullscreen}>
                          <Maximize className="text-white h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-4 bg-gray-800 bg-opacity-50 cursor-ns-resize flex items-center justify-center"
                  onMouseDown={() => setIsResizingRemote(true)}
                  onTouchStart={() => setIsResizingRemote(true)}
                >
                  <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>

              {/* Local video (your video) with dynamic height */}
              <div className="relative bg-gray-800 w-full" style={{ height: `${localVideoHeight}px` }}>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                <canvas
                  ref={faceFilterCanvasRef}
                  className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Filter canvas that will be shown when a filter is active */}
                <canvas
                  ref={filterCanvasRef}
                  className="absolute top-0 left-0 w-full h-full object-contain"
                  style={{ display: activeFilter && activeFilter !== "none" ? "block" : "none" }}
                />

                {/* Video filters dropdown */}
                <VideoFilters videoRef={localVideoRef} activeFilter={activeFilter} onFilterChange={applyFilter} />

                <FaceFilterSelector activeFilter={activeFaceFilter} onFilterChange={handleFaceFilterChange} />

                {/* Video disabled overlay */}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
                    <VideoOff className="text-white" />
                  </div>
                )}

                {/* Label for your video */}
                <div className="absolute top-1 left-1 bg-black bg-opacity-50 px-2 py-0.5 rounded text-xs text-white">
                  Your Video
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-4 bg-gray-800 bg-opacity-50 cursor-ns-resize flex items-center justify-center"
                  onMouseDown={() => setIsResizingLocal(true)}
                  onTouchStart={() => setIsResizingLocal(true)}
                >
                  <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isConnected || isConnecting ? "destructive" : "default"}
                className={!isConnected && !isConnecting ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                size="lg"
                onClick={isConnected || isConnecting ? handleStop : handleStart}
              >
                {isConnected ? "Stop" : isConnecting ? "Cancel" : "Start"}
              </Button>

              {isConnected && (
                <Button variant="secondary" size="lg" onClick={handleSkip}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Skip
                </Button>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={toggleMic} disabled={!isPreviewMode && !isConnected}>
                      {isMicEnabled ? <Mic /> : <MicOff />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMicEnabled ? "Mute microphone" : "Unmute microphone"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleVideo}
                      disabled={!isPreviewMode && !isConnected}
                    >
                      {isVideoEnabled ? <Video /> : <VideoOff />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoEnabled ? "Turn off camera" : "Turn on camera"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={toggleAudio} disabled={!isConnected}>
                      {isAudioEnabled ? <Volume2 /> : <VolumeX />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isAudioEnabled ? "Mute stranger" : "Unmute stranger"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="volume" className="col-span-4">
                        Volume: {volume}%
                      </Label>
                      <div className="col-span-4">
                        <Slider
                          id="volume"
                          defaultValue={[volume]}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="auto-skip" className="col-span-3">
                        Auto-skip after inactivity
                      </Label>
                      <Switch id="auto-skip" checked={isAutoSkipEnabled} onCheckedChange={setIsAutoSkipEnabled} />
                    </div>

                    {isAutoSkipEnabled && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="skip-timer" className="col-span-4">
                          Skip after (seconds):
                        </Label>
                        <div className="col-span-4">
                          <Select
                            value={autoSkipTimer.toString()}
                            onValueChange={(value) => setAutoSkipTimer(Number.parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 seconds</SelectItem>
                              <SelectItem value="60">1 minute</SelectItem>
                              <SelectItem value="120">2 minutes</SelectItem>
                              <SelectItem value="300">5 minutes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="auto-reconnect" className="col-span-3">
                        Auto search for new users when disconnected
                      </Label>
                      <Switch
                        id="auto-reconnect"
                        checked={isAutoReconnectEnabled}
                        onCheckedChange={setIsAutoReconnectEnabled}
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="debug-mode" className="col-span-3">
                        Debug Mode
                      </Label>
                      <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleAuthClick}>
                <User className="mr-2 h-4 w-4" />
                {currentUser ? "Profile" : "Login"}
              </Button>

              <Button variant="outline" onClick={() => setShowRules(!showRules)}>
                <Flag className="mr-2 h-4 w-4" />
                Rules
              </Button>
            </div>
          </div>
        </div>

        {/* Chat section */}
        <div className="lg:col-span-1">
          <Card className="h-[500px] flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Chat</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 && (
                <p className="text-muted-foreground text-center mt-8">
                  {isConnected ? "Say hello to start a conversation!" : "Messages will appear here once connected"}
                </p>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === "you" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
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

            <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!isConnected}
              />
              <Button type="submit" size="icon" disabled={!isConnected}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Hidden canvas for capturing screenshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={showReportDialog}
        onOpenChange={setShowReportDialog}
        onReport={handleReport}
        remoteVideoRef={remoteVideoRef}
        disabled={!isConnected}
      />

      {/* Rules dialog */}
      {showRules && (
        <Card className="p-4 mb-4">
          <h2 className="font-bold text-lg mb-2">Chat Rules</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be respectful to other users</li>
            <li>Keep your face visible in the camera frame</li>
            <li>No inappropriate content or behavior</li>
            <li>No harassment or bullying</li>
            <li>No sharing of personal contact information</li>
            <li>No recording or screenshots without consent</li>
            <li>Users violating rules will be banned</li>
          </ul>
        </Card>
      )}

      {/* Debug info panel */}
      {debugMode && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-xs font-mono overflow-auto max-h-[200px]">
          <h3 className="font-bold mb-2">Debug Information:</h3>
          <div>
            <p>Connection Status: {connectionStatus}</p>
            <p>Error Message: {errorMessage || "None"}</p>
            <p>Local Video: {localVideoRef.current?.srcObject ? "Available" : "Not available"}</p>
            <p>Remote Video: {remoteVideoRef.current?.srcObject ? "Available" : "Not available"}</p>
            <p>Connection Attempts: {connectionAttempts}</p>
            <p>Current Peer ID: {currentPeerId || "None"}</p>
            <p>Cancelled: {isCancelled ? "Yes" : "No"}</p>
            <p>Has Remote Stream: {hasRemoteStream ? "Yes" : "No"}</p>
            <p>User Initiated Stop: {userInitiatedStop ? "Yes" : "No"}</p>
          </div>
        </div>
      )}
    </div>
  )
}

{
  /* Auth Modal */
}
;<AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

