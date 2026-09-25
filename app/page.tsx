import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  // Pengguna yang belum login diarahkan ke halaman transparansi publik.
  // Login tetap bisa diakses via tombol di navbar halaman transparansi.
  redirect("/transparansi");
}