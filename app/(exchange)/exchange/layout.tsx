import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AppNavbar from "@/app/components/AppNavbar";
import AppSidebar from "@/app/components/AppSidebar";

export default async function ExchangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar email={user.email} />
      <div className="flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
