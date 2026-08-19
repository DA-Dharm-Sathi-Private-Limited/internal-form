import mongoose from 'mongoose';

// @ts-expect-error - mongoose global cache
let cached = global.mongoose;

if (!cached) {
  // @ts-expect-error - mongoose global cache
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/internal_sales_tool';

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 10000, // 10s timeout for MongoDB Atlas Cloud
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
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
