"use server"
import { MongoClient, type Db } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(MONGODB_URI)

  await client.connect()
  const dbName = new URL(MONGODB_URI).pathname.substring(1)
  const db = client.db(dbName)

  cachedClient = client
  cachedDb = db

  return { client: cachedClient, db: cachedDb }
}

