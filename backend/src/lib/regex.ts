/** Escape arbitrary user input before embedding in a RegExp constructor. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
