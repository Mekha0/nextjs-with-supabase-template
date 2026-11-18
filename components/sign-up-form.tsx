"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell, IconField } from "@/components/auth-shell";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/home`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign up"
      subtitle="Start crafting today!"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <IconField
          id="name"
          label="Name"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <IconField
          id="email"
          type="email"
          label="Email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <IconField
          id="password"
          type="password"
          label="Password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <IconField
          id="repeat-password"
          type="password"
          label="Repeat password"
          icon={Lock}
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="mx-auto h-11 w-3/4 rounded-full"
        >
          {isLoading ? "Creating account…" : "Register"}
        </Button>
      </form>
    </AuthShell>
  );
}
