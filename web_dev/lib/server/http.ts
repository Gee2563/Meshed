import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        detail: error.detail ?? null,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Unexpected server error",
    },
    { status: 500 },
  );
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ApiError(400, "Invalid request payload", result.error.flatten());
  }

  return result.data;
}
