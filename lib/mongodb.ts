import { MongoClient, type Db } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/videochat"
const MONGODB_DB = process.env.MONGODB_DB || "videochat"

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  // If we have cached values, use them
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  // Connect to the MongoDB database
  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db(MONGODB_DB)

  // Cache the client and db for future use
  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getAdminByUsername(username: string) {
  const { db } = await connectToDatabase()
  return db.collection("admins").findOne({ username })
}

export async function createAdmin(adminData: { username: string; password: string }) {
  const { db } = await connectToDatabase()
  return db.collection("admins").insertOne({
    ...adminData,
    createdAt: new Date(),
    lastLogin: null,
  })
}

export async function updateAdminLastLogin(adminId: string) {
  const { db } = await connectToDatabase()
  return db.collection("admins").updateOne({ _id: adminId }, { $set: { lastLogin: new Date() } })
}

