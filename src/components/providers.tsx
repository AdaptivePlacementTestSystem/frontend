"use client";

import { useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { notifyError } from "@/lib/api/notify-error";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // Mọi lỗi tải dữ liệu hay thao tác đều phải báo cho người dùng (kể cả quá giới hạn kèm số giây phải chờ)
        queryCache: new QueryCache({ onError: (e) => void notifyError(e) }),
        mutationCache: new MutationCache({ onError: (e) => void notifyError(e) }),
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // Không thử lại lỗi 4xx (sai quyền, không tìm thấy…); chỉ thử lại lỗi mạng/5xx tối đa 1 lần
            retry: (count, e) =>
              !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
