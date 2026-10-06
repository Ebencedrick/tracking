import mongoose from 'mongoose'
import '../../server/models/Shipment.js'
import '../../server/models/Carrier.js'
import '../../server/models/Inquiry.js'
import '../../server/models/Chat.js'
import '../../server/models/Settings.js'
import { connectDB as serverConnectDB } from '../../server/db.js'

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://ebencedrick29_db_user:675Amiri%24%24%24@cluster0.unvy8tj.mongodb.net/tracking2?retryWrites=true&w=majority&appName=Cluster0'

/**
 * Global cache across hot reloads in Next.js development
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}

let cached = global.mongooseCache

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached && cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (mongoose.connection.readyState === 1) {
    if (cached) cached.conn = mongoose
    return mongoose
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    }

    mongoose.set('strictQuery', false)
    cached!.promise = mongoose.connect(MONGODB_URI, opts).then(async (m) => {
      // Run seed logic if first time
      try {
        await serverConnectDB()
      } catch {}
      return m
    })
  }

  try {
    cached!.conn = await cached!.promise
  } catch (e) {
    cached!.promise = null
    throw e
  }

  return cached!.conn
}
