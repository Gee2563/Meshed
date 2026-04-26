import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { updateProfileSchema } from "@/lib/server/validation/verified-interaction-schemas";

function uniqueTrimmed(values?: string[]) {
  if (!values) {
    return undefined;
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJson(request, updateProfileSchema);
    const resolvedName =
      payload.name?.trim() ??
      (payload.firstName && payload.lastName ? `${payload.firstName.trim()} ${payload.lastName.trim()}` : undefined);

    const updatedUser = await userRepository.updateProfile(user.id, {
      name: resolvedName,
      bio: payload.bio,
      skills: uniqueTrimmed(payload.skills),
      sectors: uniqueTrimmed(payload.sectors),
      linkedinUrl: payload.linkedinUrl?.trim() ? payload.linkedinUrl.trim() : payload.linkedinUrl === "" ? null : undefined,
      outsideNetworkAccessEnabled: payload.outsideNetworkAccessEnabled,
    });

    return ok({
      user: updatedUser,
    });
  } catch (error) {
    return fail(error);
  }
}
