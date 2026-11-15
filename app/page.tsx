import Link from "next/link";

export default function Home() {
  return (
    <main className="welcome-stage">
      <section className="welcome-screen" aria-label="Welcome">
        <div className="phone-status" aria-hidden="true">
          <span className="status-time">9:41</span>
          <img className="status-icons" src="/figma-auth/status-icons.svg" alt="" />
          <img className="status-notch" src="/figma-auth/notch.svg" alt="" />
        </div>

        <div className="welcome-content">
          <div className="welcome-artwork">
            <img className="artwork-disc" src="/figma-auth/ellipse.svg" alt="" />
            <img className="paperclip-art" src="/figma-auth/paperclip.svg" alt="" />
            <h1>Welcome !</h1>
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
