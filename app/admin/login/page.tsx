import AdminLoginForm from "./AdminLoginForm"

export const metadata = {
  title: "Admin Login - Random Video Chat",
  description: "Admin login for the random video chat application",
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground">Enter your credentials to access the admin dashboard</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}

