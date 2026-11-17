import { vi } from "@/messages/vi";
import { AuthLogo } from "./auth-logo";

/** Nửa trái của S01 (≥ md): nền #EFF6FF, logo, câu giá trị, họa tiết đường cong chữ S. Không ảnh chụp. */
export function LoginPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[var(--auth-panel)] p-12 md:flex md:flex-col md:justify-between">
      <AuthLogo />
      <p className="relative z-10 my-auto max-w-sm py-8 text-2xl leading-8 font-bold tracking-tight text-foreground">
        {vi.login.valueProp}
      </p>
      <svg
        aria-hidden="true"
        viewBox="0 0 300 300"
        fill="none"
        className="pointer-events-none absolute -right-8 -bottom-8 size-80 text-primary opacity-[0.14] select-none"
      >
        <line
          x1="20"
          y1="260"
          x2="280"
          y2="260"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <line
          x1="40"
          y1="20"
          x2="40"
          y2="280"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M40 250C110 250 130 150 160 150C190 150 210 50 270 50"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M40 260C130 260 140 180 170 170C200 160 220 80 270 70"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
        <circle cx="160" cy="150" r="5" fill="currentColor" />
        <circle cx="210" cy="88" r="3.5" fill="currentColor" />
        <circle cx="110" cy="212" r="3.5" fill="currentColor" />
      </svg>
    </aside>
  );
}
