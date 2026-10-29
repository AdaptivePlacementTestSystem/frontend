"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-message";
import type { CurrentUser } from "@/lib/api/types";
import { homeFor } from "@/lib/auth/roles";
import { vi } from "@/messages/vi";

const schema = z.object({
  identifier: z.string().trim().min(1, vi.login.required),
  password: z.string().min(1, vi.login.required),
});
type Values = z.infer<typeof schema>;

/** Chỉ cho phép quay lại đường dẫn nội bộ (chống open-redirect). */
export function safeNext(next: string | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { user } = await bffRequest<{ user: CurrentUser }>("/api/auth/login", {
        method: "POST",
        body: values,
      });
      router.replace(safeNext(next) ?? homeFor(user.role));
      router.refresh();
    } catch (e) {
      setServerError(errorMessage(e));
    }
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{vi.login.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="login-form">
          {serverError && (
            <Alert variant="destructive" role="alert" data-testid="login-error">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="identifier">{vi.login.identifier}</Label>
            <Input
              id="identifier"
              autoComplete="username"
              aria-invalid={!!errors.identifier}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{vi.login.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="login-submit"
          >
            {isSubmitting ? vi.login.submitting : vi.login.submit}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled>
            {vi.login.sso}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
