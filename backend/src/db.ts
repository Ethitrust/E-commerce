import mongoose from "mongoose";
import { env } from "./config/env.js";

let connectionLoggingAttached = false;

function attachConnectionLogging(): void {
  if (connectionLoggingAttached) {
    return;
  }
  connectionLoggingAttached = true;
  const cx = mongoose.connection;
  cx.on("disconnected", () => console.warn("[db] MongoDB disconnected"));
  cx.on("reconnected", () => console.info("[db] MongoDB reconnected"));
}

function logMongoConnected(cx: mongoose.Connection): void {
  const name = cx.name || "(unknown db)";
  const host = cx.host || "mongodb";
  console.info(`[db] Connected — "${name}" @ ${host} (state: ready)`);
}

export async function connectMongo(): Promise<void> {
  attachConnectionLogging();
  await mongoose.connect(env.MONGODB_URI);
  logMongoConnected(mongoose.connection);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  console.info("[db] MongoDB connection closed");
}
/**
 * Runs a server-side ping against MongoDB when the driver reports a live connection.
 * Returns 503 from GET /health when this is false so operators can distinguish app vs DB outages.
 */
export async function pingMongo(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return false;
    }
    await db.admin().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
