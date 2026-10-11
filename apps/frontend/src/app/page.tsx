import Link from "next/link";
export default function Home() {
  return (
    <main className="foundation">
      <span className="wordmark">
        retailor<span>✳</span>
      </span>
      <div>
        <p className="eyebrow">Your next idea, beautifully dressed.</p>
        <h1>
          Bring your products.
          <br />
          <em>See your store.</em>
        </h1>
        <p className="intro">
          The foundation is ready. A beautiful clothing store and Tailor-led
          setup are on their way.
        </p>
        <Link className="primary" href="/demo">
          Open the demo workspace <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <p className="fixture-note">
        Development foundation · No paid calls · No real orders
      </p>
    </main>
  );
}
