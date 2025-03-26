// This is a script you would run manually to create the first admin user
// Run with: node scripts/create-admin.js

import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/videochat"

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db()

    // Check if admin collection exists
    const collections = await db.listCollections({ name: "admins" }).toArray()
    if (collections.length === 0) {
      await db.createCollection("admins")
      console.log("Created admins collection")
    }

    // Check if any admin exists
    const adminCount = await db.collection("admins").countDocuments()

    if (adminCount > 0) {
      console.log("Admin user already exists")
      return
    }

    // Create default admin
    const passwordHash = await bcrypt.hash("admin123", 10)

    await db.collection("admins").insertOne({
      email: "admin@example.com",
      passwordHash,
      role: "super-admin",
      createdAt: new Date(),
    })

    console.log("Created default admin user:")
    console.log("Email: admin@example.com")
    console.log("Password: admin123")
    console.log("IMPORTANT: Change this password immediately after first login!")
  } catch (error) {
    console.error("Error creating admin user:", error)
  } finally {
    await client.close()
    console.log("Disconnected from MongoDB")
  }
}

createAdmin().catch(console.error)

