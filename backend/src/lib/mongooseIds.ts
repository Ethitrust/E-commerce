import { Types } from "mongoose";

/** Canonical ObjectId hex string for map keys/API, or `null` if missing/invalid BSON. */
export function tryObjectIdString(id: unknown): string | null {
  if (id == null) return null;
  try {
    return new Types.ObjectId(id as Types.ObjectId).toString();
  } catch {
    return null;
  }
}
