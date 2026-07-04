import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "gaokao_session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  try {
    const [userId] = Buffer.from(sessionId, "base64").toString().split(":");
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const sessionData = `${userId}:${Date.now()}`;
  const sessionId = Buffer.from(sessionData).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return sessionId;
}

export async function ensureDemoUser() {
  let user = await prisma.user.findFirst({
    where: { email: "demo@gaokao.app" },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@gaokao.app",
        name: "Demo User",
      },
    });
  }
  await createSession(user.id);
  return user;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
