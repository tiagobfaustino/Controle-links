import { getPb } from "@/lib/pocketbase";

export function loadAuthFromCookie(): ReturnType<typeof getPb> {
  const pb = getPb();
  if (pb.authStore.isValid) return pb;

  try {
    pb.authStore.loadFromCookie(document.cookie);
  } catch (err) {
    console.warn("invalid auth cookie ignored", err);
    pb.authStore.clear();
  }
  return pb;
}
