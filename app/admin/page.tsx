import type { Metadata } from "next"
import AdminDashboard from "./admin-dashboard"

export const metadata: Metadata = {
  title: "Admin Dashboard - Random Video Chat",
  description: "Admin dashboard for moderating Random Video Chat",
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <AdminDashboard />
    </div>
  )
}

