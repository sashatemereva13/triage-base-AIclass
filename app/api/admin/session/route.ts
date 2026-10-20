import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  verifyAdminPassword,
} from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Enter the admin password." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || !("password" in payload) ||
    typeof payload.password !== "string" || !verifyAdminPassword(payload.password)) {
    return Response.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Admin access is not configured." }, { status: 503 });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${createAdminSession()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${ADMIN_SESSION_MAX_AGE}${secure}`,
      },
    },
  );
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0` } },
  );
}
