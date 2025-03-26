import { connectToDatabase } from "../database/mongodb"
import { ObjectId } from "mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// Admin user interface
export interface Admin {
  _id: string
  email: string
  name: string
  role: "admin" | "moderator"
  passwordHash: string
  lastLogin?: Date
}

// Get admin by email
export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const { db } = await connectToDatabase()
  return db.collection("admins").findOne({ email }) as Promise<Admin | null>
}

// Verify admin credentials
export async function verifyAdminCredentials(email: string, password: string): Promise<Admin | null> {
  const { db } = await connectToDatabase()
  const admin = (await db.collection("admins").findOne({ email })) as Admin

  if (!admin) return null

  const isValid = await bcrypt.compare(password, admin.passwordHash)
  if (!isValid) return null

  // Update last login
  await db.collection("admins").updateOne({ _id: new ObjectId(admin._id) }, { $set: { lastLogin: new Date() } })

  return admin
}

// Generate JWT token for admin
export function generateAdminToken(admin: Admin): string {
  const JWT_SECRET = process.env.JWT_SECRET || "admin-secret-key"

  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  )
}

// Verify admin token from request
export function verifyAdminToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "admin-secret-key"
    const decoded = jwt.verify(token, JWT_SECRET) as any

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    console.error("Admin token verification error:", error)
    return null
  }
}

// Get all online users
export async function getOnlineUsers() {
  const { db } = await connectToDatabase()
  return db
    .collection("users")
    .find({
      connected: true,
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 minutes
    })
    .toArray()
}

// Get all active chats
export async function getActiveChats() {
  const { db } = await connectToDatabase()
  return db
    .collection("chats")
    .find({
      status: "active",
    })
    .toArray()
}

// Ban a user
export async function banUser(userId: string, reason: string) {
  const { db } = await connectToDatabase()

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        isBanned: true,
        banReason: reason,
        banDate: new Date(),
      },
    },
  )

  return { success: true }
}

// Unban a user
export async function unbanUser(userId: string) {
  const { db } = await connectToDatabase()

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        isBanned: false,
        banReason: null,
        banDate: null,
      },
    },
  )

  return { success: true }
}

// Initialize admin user if none exists
export async function initializeAdminUser() {
  const { db } = await connectToDatabase()

  // Check if admin exists
  const adminExists = await db.collection("admins").findOne({})

  if (!adminExists) {
    // Create default admin
    const passwordHash = await bcrypt.hash("admin123", 10)

    await db.collection("admins").insertOne({
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      passwordHash,
      createdAt: new Date(),
    })

    console.log("Default admin user created")
  }
}

