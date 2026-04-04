import { describe, expect, it, vi } from "vitest";

import { runLogoutFlow } from "@/lib/auth/logout-flow";

describe("runLogoutFlow", () => {
  it("clears the Meshed session before Dynamic cleanup, then redirects home", async () => {
    const events: string[] = [];
    const clearServerSession = vi.fn(async () => {
      events.push("server");
      return new Response(null, { status: 200 });
    });
    const clearDynamicSession = vi.fn(async () => {
      events.push("dynamic");
    });
    const redirect = vi.fn((href: string) => {
      events.push(`redirect:${href}`);
    });

    await runLogoutFlow({
      clearServerSession,
      clearDynamicSession,
      redirect,
    });

    expect(clearServerSession).toHaveBeenCalledTimes(1);
    expect(clearDynamicSession).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/");
    expect(events).toEqual(["server", "dynamic", "redirect:/"]);
  });

  it("logs Dynamic cleanup failures but still redirects after the server session is cleared", async () => {
    const events: string[] = [];
    const dynamicError = new Error("Dynamic logout failed.");
    const clearServerSession = vi.fn(async () => {
      events.push("server");
      return new Response(null, { status: 200 });
    });
    const clearDynamicSession = vi.fn(async () => {
      events.push("dynamic");
      throw dynamicError;
    });
    const onDynamicLogoutError = vi.fn((error: unknown) => {
      events.push("dynamic-error");
      expect(error).toBe(dynamicError);
    });
    const redirect = vi.fn((href: string) => {
      events.push(`redirect:${href}`);
    });

    await runLogoutFlow({
      clearServerSession,
      clearDynamicSession,
      onDynamicLogoutError,
      redirect,
    });

    expect(clearServerSession).toHaveBeenCalledTimes(1);
    expect(clearDynamicSession).toHaveBeenCalledTimes(1);
    expect(onDynamicLogoutError).toHaveBeenCalledWith(dynamicError);
    expect(redirect).toHaveBeenCalledWith("/");
    expect(events).toEqual(["server", "dynamic", "dynamic-error", "redirect:/"]);
  });

  it("throws when the server session cannot be cleared and skips Dynamic cleanup", async () => {
    const clearServerSession = vi.fn(async () => new Response(null, { status: 500 }));
    const clearDynamicSession = vi.fn(async () => undefined);
    const redirect = vi.fn();

    await expect(
      runLogoutFlow({
        clearServerSession,
        clearDynamicSession,
        redirect,
      }),
    ).rejects.toThrow("Logout request failed with status 500.");

    expect(clearDynamicSession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
