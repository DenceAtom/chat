import { ObjectId } from "mongodb"
import { connectToDatabase } from "../mongodb"
import type { Admin } from "../models/admin"
import bcrypt from "bcryptjs"

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const { db } = await connectToDatabase()
  return db.collection("admins").findOne({ email }) as Promise<Admin | null>
}

export async function verifyAdminCredentials(email: string, password: string): Promise<Admin | null> {
  const admin = await getAdminByEmail(email)
  if (!admin) return null

  const isValid = await bcrypt.compare(password, admin.passwordHash)
  if (!isValid) return null

  // Update last login
  const { db } = await connectToDatabase()
  await db.collection("admins").updateOne({ _id: admin._id }, { $set: { lastLogin: new Date() } })

  return admin
}

export async function getAllOnlineUsers() {
  const { db } = await connectToDatabase()
  return db
    .collection("users")
    .find({
      isOnline: true,
      lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 minutes
    })
    .toArray()
}

export async function getActiveChats() {
  const { db } = await connectToDatabase()
  return db
    .collection("activeSessions")
    .find({
      endTime: null, // Sessions that haven't ended
    })
    .toArray()
}

export async function banUser(userId: string, adminId: string, reason: string, duration?: number) {
  const { db } = await connectToDatabase()

  // Create ban record
  await db.collection("moderatorActions").insertOne({
    adminId: new ObjectId(adminId),
    userId: new ObjectId(userId),
    action: "ban",
    reason,
    timestamp: new Date(),
    duration,
  })

  // Update user status
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        isBanned: true,
        banReason: reason,
        banExpiration: duration ? new Date(Date.now() + duration) : null,
      },
    },
  )

  return { success: true }
}

export async function unbanUser(userId: string, adminId: string, reason: string) {
  const { db } = await connectToDatabase()

  // Create unban record
  await db.collection("moderatorActions").insertOne({
    adminId: new ObjectId(adminId),
    userId: new ObjectId(userId),
    action: "unban",
    reason,
    timestamp: new Date(),
  })

  // Update user status
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        isBanned: false,
        banReason: null,
        banExpiration: null,
      },
    },
  )

  return { success: true }
}

export async function startMonitoringSession(adminId: string, targetData: { userId?: string; sessionId?: string }) {
  const { db } = await connectToDatabase()

  const session = {
    adminId: new ObjectId(adminId),
    targetUserId: targetData.userId ? new ObjectId(targetData.userId) : undefined,
    targetSessionId: targetData.sessionId,
    startTime: new Date(),
    notes: "",
  }

  const result = await db.collection("monitoringSessions").insertOne(session)
  return { ...session, _id: result.insertedId }
}

export async function endMonitoringSession(sessionId: string, notes?: string) {
  const { db } = await connectToDatabase()

  await db.collection("monitoringSessions").updateOne(
    { _id: new ObjectId(sessionId) },
    {
      $set: {
        endTime: new Date(),
        notes: notes || "",
      },
    },
  )

  return { success: true }
}

export async function getModeratorActionHistory(userId?: string, adminId?: string, limit = 100) {
  const { db } = await connectToDatabase()

  const query: any = {}
  if (userId) query.userId = new ObjectId(userId)
  if (adminId) query.adminId = new ObjectId(adminId)

  return db.collection("moderatorActions").find(query).sort({ timestamp: -1 }).limit(limit).toArray()
}

