"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, IconField } from "@/components/auth-shell";
import { login } from "@/app/auth/login/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/sign-up"
            className="font-medium text-primary underline underline-offset-4"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <IconField
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          required
        />
        <div className="grid gap-1">
          <IconField
            id="password"
            name="password"
            type="password"
            label="Password"
            icon={Lock}
            required
          />
          <Link
            href="/auth/forgot-password"
            className="justify-self-end text-xs text-foreground/70 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="mx-auto h-11 w-3/4 rounded-full"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
