import mongoose from "mongoose";

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("[DB] MONGODB_URI not set. Continuing without DB connection.");
    return null;
  }
  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(mongoUri, {
      dbName: undefined,
    });
    console.info(`[DB] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("[DB] Mongo connection error:", err.message);
    throw err;
  }
}
