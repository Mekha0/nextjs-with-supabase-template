import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="welcome-stage">
      <section className="welcome-screen" aria-label="Welcome">
        <div className="welcome-content">
          <h1 className="sr-only">Welcome</h1>
          <div className="welcome-mark">
            <div className="welcome-mark-art">
              <Image
                src="/figma-landing/logo-art.png"
                alt="What Can I Make? logo"
                width={298}
                height={298}
                priority
              />
            </div>
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
      </section>
    </main>
  );
}
