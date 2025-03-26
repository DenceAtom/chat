import type React from "react"
import AdminLayoutClient from "./AdminLayoutClient"

export const metadata = {
  title: "Admin Dashboard - Random Video Chat",
  description: "Admin dashboard for managing the random video chat application",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}

