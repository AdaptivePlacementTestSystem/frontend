import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
