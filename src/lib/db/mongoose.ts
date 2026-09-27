import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Preserve connection across Next.js hot-reloads in development
declare global {
   
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null }
global.mongooseCache = cached

export async function connectDB(): Promise<typeof mongoose> {
  // Route handlers are imported during `next build`, where deployment secrets
  // are intentionally unavailable. Validate only when a request actually
  // needs a database connection so builds remain hermetic while production
  // requests still fail clearly if configuration is missing.
  const mongodbUri = process.env.MONGODB_URI
  if (!mongodbUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    }
    cached.promise = mongoose.connect(mongodbUri, opts)
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }

  return cached.conn
}
