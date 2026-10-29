import type { ReactNode } from "react";
import { AuthLogo } from "./auth-logo";

/** L-AUTH (S16–S18): thẻ trắng căn giữa rộng tối đa 420 px, logo nhỏ phía trên, không thanh điều hướng. */
export function AuthCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
      <AuthLogo />
      <main className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-sm sm:p-8">
        {children}
      </main>
    </div>
  );
}
