import type { Metadata } from "next"
import AdminLoginForm from "../components/admin-login-form"

export const metadata: Metadata = {
  title: "Admin Login - Random Video Chat",
  description: "Admin login for Random Video Chat",
}

export default function AdminLoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-gray-600">Sign in to access the admin dashboard</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}

