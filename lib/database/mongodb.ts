import { MongoClient, type Db, type Collection } from "mongodb"
import type { User, Report, Payment, Call } from "@/lib/database-service"

let client: MongoClient | null = null
let db: Db | null = null

export interface Collections {
  users: Collection<User>
  reports: Collection<Report>
  payments: Collection<Payment>
  calls: Collection<Call>
}

export async function connectToDatabase(): Promise<{
  client: MongoClient
  db: Db
  collections: Collections
}> {
  // If we already have a connection, return it
  if (client && db) {
    return {
      client,
      db,
      collections: {
        users: db.collection("users"),
        reports: db.collection("reports"),
        payments: db.collection("payments"),
        calls: db.collection("calls"),
      },
    }
  }

  // Get MongoDB URI from environment variable
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error("MongoDB URI is not defined in environment variables")
  }

  try {
    // Connect to MongoDB
    client = new MongoClient(uri)
    await client.connect()

    // Get database (default to 'videochat')
    db = client.db("videochat")

    // Create collections if they don't exist
    const collections = {
      users: db.collection("users"),
      reports: db.collection("reports"),
      payments: db.collection("payments"),
      calls: db.collection("calls"),
    }

    // Create indexes for better performance
    await collections.users.createIndex({ id: 1 }, { unique: true })
    await collections.reports.createIndex({ id: 1 }, { unique: true })
    await collections.payments.createIndex({ id: 1 }, { unique: true })
    await collections.calls.createIndex({ id: 1 }, { unique: true })

    console.log("Connected to MongoDB")

    return { client, db, collections }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error)

    // Fallback to localStorage if MongoDB connection fails
    console.log("Falling back to localStorage")

    return {
      client: null as any,
      db: null as any,
      collections: {
        users: createLocalStorageCollection("users"),
        reports: createLocalStorageCollection("reports"),
        payments: createLocalStorageCollection("payments"),
        calls: createLocalStorageCollection("calls"),
      },
    }
  }
}

// Create a mock collection that uses localStorage as fallback
function createLocalStorageCollection(collectionName: string) {
  return {
    findOne: async (query: any) => {
      try {
        if (typeof window === "undefined") return null

        if (collectionName === "users") {
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          if (query.id) {
            return users[query.id] || null
          }
        } else {
          const items = JSON.parse(localStorage.getItem(collectionName) || "[]")
          return (
            items.find((item: any) => {
              for (const key in query) {
                if (item[key] !== query[key]) return false
              }
              return true
            }) || null
          )
        }

        return null
      } catch (error) {
        console.error(`Error in findOne for ${collectionName}:`, error)
        return null
      }
    },

    find: (query: any) => {
      return {
        toArray: async () => {
          try {
            if (typeof window === "undefined") return []

            if (collectionName === "users") {
              const users = JSON.parse(localStorage.getItem("users") || "{}")
              return Object.values(users).filter((user: any) => {
                for (const key in query) {
                  if (key === "$or") {
                    return query.$or.some((condition: any) => {
                      for (const subKey in condition) {
                        if (user[subKey] === condition[subKey]) return true
                      }
                      return false
                    })
                  }

                  if (key.includes(".")) {
                    const parts = key.split(".")
                    let value = user
                    for (const part of parts) {
                      if (!value || value[part] === undefined) return false
                      value = value[part]
                    }

                    if (value !== query[key]) return false
                  } else if (query[key] !== undefined && user[key] !== query[key]) {
                    return false
                  }
                }
                return true
              })
            } else {
              const items = JSON.parse(localStorage.getItem(collectionName) || "[]")
              return items.filter((item: any) => {
                for (const key in query) {
                  if (item[key] !== query[key]) return false
                }
                return true
              })
            }
          } catch (error) {
            console.error(`Error in find.toArray for ${collectionName}:`, error)
            return []
          }
        },
      }
    },

    insertOne: async (document: any) => {
      try {
        if (typeof window === "undefined") return { acknowledged: true }

        if (collectionName === "users") {
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          users[document.id] = document
          localStorage.setItem("users", JSON.stringify(users))
        } else {
          const items = JSON.parse(localStorage.getItem(collectionName) || "[]")
          items.push(document)
          localStorage.setItem(collectionName, JSON.stringify(items))
        }

        return { acknowledged: true, insertedId: document.id }
      } catch (error) {
        console.error(`Error in insertOne for ${collectionName}:`, error)
        return { acknowledged: false }
      }
    },

    updateOne: async (query: any, update: any, options: any = {}) => {
      try {
        if (typeof window === "undefined") return { matchedCount: 0, modifiedCount: 0 }

        if (collectionName === "users") {
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          let user = null

          if (query.id) {
            user = users[query.id]
          } else {
            // Find user by other criteria
            for (const id in users) {
              let match = true
              for (const key in query) {
                if (users[id][key] !== query[key]) {
                  match = false
                  break
                }
              }
              if (match) {
                user = users[id]
                break
              }
            }
          }

          if (user) {
            // Apply updates
            if (update.$set) {
              Object.assign(user, update.$set)
            }

            if (update.$inc) {
              for (const key in update.$inc) {
                user[key] = (user[key] || 0) + update.$inc[key]
              }
            }

            localStorage.setItem("users", JSON.stringify(users))
            return { matchedCount: 1, modifiedCount: 1 }
          }

          // Handle upsert
          if (options.upsert && query.id) {
            const newUser = { id: query.id, ...update.$set }
            users[query.id] = newUser
            localStorage.setItem("users", JSON.stringify(users))
            return { matchedCount: 0, modifiedCount: 1, upsertedId: query.id }
          }

          return { matchedCount: 0, modifiedCount: 0 }
        } else {
          const items = JSON.parse(localStorage.getItem(collectionName) || "[]")
          let index = -1

          // Find item by criteria
          for (let i = 0; i < items.length; i++) {
            let match = true
            for (const key in query) {
              if (items[i][key] !== query[key]) {
                match = false
                break
              }
            }
            if (match) {
              index = i
              break
            }
          }

          if (index !== -1) {
            // Apply updates
            if (update.$set) {
              Object.assign(items[index], update.$set)
            }

            if (update.$inc) {
              for (const key in update.$inc) {
                items[index][key] = (items[index][key] || 0) + update.$inc[key]
              }
            }

            localStorage.setItem(collectionName, JSON.stringify(items))
            return { matchedCount: 1, modifiedCount: 1 }
          }

          return { matchedCount: 0, modifiedCount: 0 }
        }
      } catch (error) {
        console.error(`Error in updateOne for ${collectionName}:`, error)
        return { matchedCount: 0, modifiedCount: 0 }
      }
    },

    countDocuments: async (query: any = {}) => {
      try {
        if (typeof window === "undefined") return 0

        if (collectionName === "users") {
          const users = JSON.parse(localStorage.getItem("users") || "{}")
          return Object.values(users).filter((user: any) => {
            for (const key in query) {
              if (key.includes(".")) {
                const parts = key.split(".")
                let value = user
                for (const part of parts) {
                  if (!value || value[part] === undefined) return false
                  value = value[part]
                }

                if (value !== query[key]) return false
              } else if (user[key] !== query[key]) {
                return false
              }
            }
            return true
          }).length
        } else {
          const items = JSON.parse(localStorage.getItem(collectionName) || "[]")
          return items.filter((item: any) => {
            for (const key in query) {
              if (item[key] !== query[key]) return false
            }
            return true
          }).length
        }
      } catch (error) {
        console.error(`Error in countDocuments for ${collectionName}:`, error)
        return 0
      }
    },

    createIndex: async () => {
      // No-op for localStorage
      return null
    },
  }
}

