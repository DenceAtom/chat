import type React from "react"
import type { Metadata } from "next"
import AdminLayoutClient from "./AdminLayoutClient"

export const metadata: Metadata = {
  title: "Admin Dashboard - Random Video Chat",
  description: "Admin dashboard for moderating Random Video Chat",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient children={children} />
}

