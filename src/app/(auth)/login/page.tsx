import type { Metadata } from "next";
import { AuthLogo } from "@/features/auth/auth-logo";
import { LoginForm } from "@/features/auth/login-form";
import { LoginPanel } from "@/features/auth/login-panel";

export const metadata: Metadata = { title: "Đăng nhập · Adaptive Placement Test" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  return (
    <div className="flex flex-1 items-center justify-center md:p-6">
      <main className="grid min-h-screen w-full max-w-[840px] overflow-hidden bg-white md:min-h-[580px] md:grid-cols-[45fr_55fr] md:rounded-xl md:shadow-xl">
        <LoginPanel />
        <section className="flex flex-col items-center justify-center gap-8 p-6 sm:p-8 md:p-12">
          <AuthLogo className="md:hidden" compact />
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </section>
      </main>
    </div>
  );
}
