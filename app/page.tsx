import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="welcome-stage">
      <section className="welcome-screen" aria-label="Welcome">
        <div className="phone-status" aria-hidden="true">
          <span className="status-time">9:41</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="status-icons" src="/figma-landing/status-icons.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="status-notch" src="/figma-landing/notch.svg" alt="" />
        </div>

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

          <nav className="welcome-actions" aria-label="Account">
            <Link className="welcome-button welcome-button-primary" href="/auth/sign-up">
              Sign up
            </Link>
            <Link className="welcome-button welcome-button-secondary" href="/auth/login">
              Login
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
