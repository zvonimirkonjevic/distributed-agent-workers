import "server-only";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";

/** Store the FastAPI session token in an httpOnly cookie that expires with the session. */
export async function setSessionCookie(token: string, expiresAt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}
