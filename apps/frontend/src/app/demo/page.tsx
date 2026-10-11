import Link from "next/link";
export default function Demo() {
  return (
    <main className="foundation">
      <Link className="wordmark" href="/">
        retailor<span>✳</span>
      </Link>
      <div>
        <p className="eyebrow">Development workspace</p>
        <h1>
          Your collection.
          <br />
          <em>Coming into focus.</em>
        </h1>
        <p className="intro">
          Photo intake, catalogue review and Tailor styling will live here. The
          backend is safely configured with paid calls disabled.
        </p>
        <Link className="primary" href="/">
          Back to Retailor <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <p className="fixture-note">
        RTL-001 foundation · Feature implementation follows the queue
      </p>
    </main>
  );
}
