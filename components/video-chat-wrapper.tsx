"use client"

import dynamic from "next/dynamic"

// Use dynamic import with ssr: false to prevent the component from running during build
const VideoChat = dynamic(() => import("@/components/video-chat"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Loading video chat...</div>,
})

export default function VideoChatWrapper() {
  return <VideoChat />
}

