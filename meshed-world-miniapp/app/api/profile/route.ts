import { randomUUID } from "node:crypto";

import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { userSocialConnectionRepository } from "@/lib/server/repositories/user-social-connection-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { updateProfileSchema } from "@/lib/server/validation/verified-interaction-schemas";

function uniqueTrimmed(values?: string[]) {
  if (!values) {
    return undefined;
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

    const socialFields = [
      {
        provider: "LINKEDIN" as const,
        value: payload.linkedinUrl === undefined ? undefined : normalizeOptionalString(payload.linkedinUrl),
      },
      {
        provider: "EMAIL" as const,
        value: payload.emailAddress === undefined ? undefined : normalizeOptionalString(payload.emailAddress),
      },
      {
        provider: "SLACK" as const,
        value: payload.slackWorkspace === undefined ? undefined : normalizeOptionalString(payload.slackWorkspace),
      },
      {
        provider: "MICROSOFT_TEAMS" as const,
        value:
          payload.microsoftTeamsWorkspace === undefined ? undefined : normalizeOptionalString(payload.microsoftTeamsWorkspace),
      },
      {
        provider: "TWITTER" as const,
        value: payload.twitterHandle === undefined ? undefined : normalizeOptionalString(payload.twitterHandle),
      },
      {
        provider: "CALENDAR" as const,
        value: payload.calendarEmail === undefined ? undefined : normalizeOptionalString(payload.calendarEmail),
      },
      {
        provider: "INSTAGRAM" as const,
        value: payload.instagramHandle === undefined ? undefined : normalizeOptionalString(payload.instagramHandle),
      },
    ].filter((entry) => entry.value !== undefined);

    if (socialFields.length > 0) {
      await userSocialConnectionRepository.upsertMany(
        user.id,
        socialFields.map((entry) => ({
          id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
          provider: entry.provider,
          status: entry.value ? "CONNECTED" : "SKIPPED",
          accountLabel: entry.value ?? null,
        })),
      );
    }

    return ok({
      user: updatedUser,
    });
  } catch (error) {
    return fail(error);
  }
}
