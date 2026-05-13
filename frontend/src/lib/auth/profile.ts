/** Nexus demo accounts use short `u1`-style ids; MongoDB users use 24-char hex ObjectIds. */
export function isDemoProfileUser(user: { id: string } | null): boolean {
  return user != null && /^u\d+$/.test(user.id);
}
