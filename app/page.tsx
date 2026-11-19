import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          {/* App Logo */}
          <div className="flex h-100 w-100 items-center justify-center overflow-hidden rounded-full shadow-md">
            <Image
              src="/images/logo.png"
              alt="App logo"
              width={80}
              height={80}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          {/* Welcome Heading */}
          <div className="text-center">
            <h1 className="font-display text-4xl tracking-tight">Welcome!</h1>
            <p className="font-sans mt-1 text-sm text-muted-foreground">
              Turn the supplies you have into something wonderful.
            </p>
          </div>

          {/* Account Actions */}
          <div className="flex w-full flex-col gap-4 rounded-3xl p-5">
            <Link
              href="/auth/sign-up"
              className="font-sans flex h-11 w-3/4 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground font-medium transition-opacity hover:opacity-90"
            >
              Sign up
            </Link>

            <Link
              href="/auth/login"
              className="font-sans flex h-11 w-3/4 mx-auto items-center justify-center rounded-full border border-border bg-background text-foreground font-medium transition-colors hover:bg-muted"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
