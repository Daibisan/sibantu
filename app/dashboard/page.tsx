import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role.code) {
    case "ADMIN":
      redirect("/dashboard/admin");

    case "GUDANG":
      redirect("/dashboard/gudang");

    case "PETUGAS_POSKO":
      redirect("/dashboard/posko");

    default:
      redirect("/login");
  }
}