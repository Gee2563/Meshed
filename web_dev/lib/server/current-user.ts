import { cookies } from "next/headers";

import { ApiError } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { getSessionCookieName, verifySessionToken } from "@/lib/server/session";

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
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  return user;
}
