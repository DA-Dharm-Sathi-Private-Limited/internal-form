import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://manas_db_user:Bhatia%406635@cluster0.c8xvcnq.mongodb.net/test?retryWrites=true&w=majority';

// @ts-expect-error - mongoose global cache
let cached = global.mongoose;

if (!cached) {
  // @ts-expect-error - mongoose global cache
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 3000, // 3s fast timeout to prevent Vercel serverless function 504 timeouts
      connectTimeoutMS: 3000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    }).catch((err) => {
      console.error('MongoDB connection error:', err);
      cached.promise = null;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch {
    cached.promise = null;
    cached.conn = null;
  }

  return cached.conn;
}

export default dbConnect;
