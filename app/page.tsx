import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const pbAuth = cookieStore.get("pb_auth");

  if (!pbAuth?.value) {
    redirect("/login");
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(pbAuth.value));
    const model = parsed?.model;

    if (model?.firstLogin) {
      redirect("/alterar-senha");
    }
  } catch {
    redirect("/login");
  }

  redirect("/dashboard");
}
