import type { Metadata } from "next"
import UserManagement from "../components/user-management"

export const metadata: Metadata = {
  title: "User Management - Admin Dashboard",
  description: "Manage users in Random Video Chat",
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <UserManagement />
    </div>
  )
}

