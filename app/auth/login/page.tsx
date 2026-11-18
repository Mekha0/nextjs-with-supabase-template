import { LoginForm } from "@/components/login-form"; // SignUpForm on the other page

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
