import type { Metadata } from "next"
import LiveMonitoring from "../components/live-monitoring"

export const metadata: Metadata = {
  title: "Live Monitoring - Admin Dashboard",
  description: "Monitor live chats in Random Video Chat",
}

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Live Monitoring</h1>
      <LiveMonitoring />
    </div>
  )
}

