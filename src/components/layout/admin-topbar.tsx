import { MaterialIcon } from "@/components/ui/material-icon";
import { vi } from "@/messages/vi";

/** Thanh trên khu Admin (Stitch): nhãn hệ thống, hỗ trợ kỹ thuật. Cố định trên cùng ở màn rộng. */
export function AdminTopbar() {
  return (
    <header className="z-40 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-surface-container-lowest/90 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md md:fixed md:top-0 md:right-0 md:left-60 md:px-8">
      <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-semibold tracking-[0.02em] text-primary">
        {vi.adminNav.topbarBadge}
      </span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 text-[13px] text-on-surface-variant">
          <MaterialIcon name="help" size={20} className="text-outline" />
          {vi.adminNav.support}
        </span>
        <span className="h-4 w-px bg-outline-variant" />
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MaterialIcon name="person" size={18} />
        </span>
      </div>
    </header>
  );
}
