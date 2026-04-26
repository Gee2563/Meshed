import { cookies } from "next/headers";

import { ApiError } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { getSessionCookieName, verifySessionToken } from "@/lib/server/session";

// Resolve the signed-in user from the session cookie for server components and route handlers.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    return null;
  }

  return userRepository.findById(userId);
}

export async function requireCurrentUser() {
  // Use a dedicated helper when callers need an auth guard instead of a nullable user lookup.
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  return user;
}
