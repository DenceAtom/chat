// Simple utility to get the client IP address
export async function getClientIp(): Promise<string> {
  try {
    // In a real app, you would use a service like ipify or your own server endpoint
    // For this demo, we'll generate a random IP for testing
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

    // Alternatively, you could use a service like this:
    // const response = await fetch('https://api.ipify.org?format=json')
    // const data = await response.json()
    // return data.ip
  } catch (error) {
    console.error("Error getting client IP:", error)
    return "0.0.0.0" // Fallback
  }
}

