import { describe, expect, it, vi } from "vitest";

import { runLogoutFlow } from "@/lib/auth/logout-flow";

describe("runLogoutFlow", () => {
  it("clears the Meshed session, then redirects home", async () => {
    const events: string[] = [];
    const clearServerSession = vi.fn(async () => {
      events.push("server");
      return new Response(null, { status: 200 });
    });
    const redirect = vi.fn((href: string) => {
      events.push(`redirect:${href}`);
    });

    await runLogoutFlow({
      clearServerSession,
      redirect,
    });

    expect(clearServerSession).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/");
    expect(events).toEqual(["server", "redirect:/"]);
  });

  it("throws when the server session cannot be cleared and skips redirecting", async () => {
    const clearServerSession = vi.fn(async () => new Response(null, { status: 500 }));
    const redirect = vi.fn();

    await expect(
      runLogoutFlow({
        clearServerSession,
        redirect,
      }),
    ).rejects.toThrow("Logout request failed with status 500.");

    expect(redirect).not.toHaveBeenCalled();
  });
});
