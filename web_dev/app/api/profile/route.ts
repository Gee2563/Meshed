import { z } from "zod";

import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";

const profileNameSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJson(request, profileNameSchema);
    const updatedUser = await userRepository.updateProfile(user.id, {
      name: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
    });

    return ok({
      user: updatedUser,
    });
  } catch (error) {
    return fail(error);
  }
}
