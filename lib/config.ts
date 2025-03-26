// Debug mode
export const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "true"

// STUN/TURN servers for WebRTC
export const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun1.l.google.com:19302",
  },
  {
    urls: "stun:stun2.l.google.com:19302",
  },
  {
    urls: "stun:stun3.l.google.com:19302",
  },
  {
    urls: "stun:stun4.l.google.com:19302",
  },
  // Add free TURN servers for better connectivity
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
]

export const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || "http://localhost:3001"

