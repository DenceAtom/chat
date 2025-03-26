"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

      // Check if device is mobile based on user agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

      // Also check screen width as a fallback
      const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth < 768

      setIsMobile(isMobileDevice)
    }

    checkIfMobile()

    // Re-check on resize
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  return isMobile
}

export default useMobile

