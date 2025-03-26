import type { ObjectId } from "mongodb"

export interface Admin {
  _id?: ObjectId
  email: string
  passwordHash: string
  role: "admin" | "moderator" | "super-admin"
  createdAt: Date
  lastLogin?: Date
}

export interface ModeratorAction {
  _id?: ObjectId
  adminId: ObjectId
  userId: ObjectId
  action: "ban" | "unban" | "quarantine" | "release" | "warning"
  reason: string
  timestamp: Date
  duration?: number // Duration in milliseconds for temporary actions
}

export interface MonitoringSession {
  _id?: ObjectId
  adminId: ObjectId
  targetSessionId?: string
  targetUserId?: ObjectId
  startTime: Date
  endTime?: Date
  notes?: string
}

