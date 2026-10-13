import Link from "next/link";
import styles from "./recovery.module.css";
export function ViewRecovery({ retry }: { retry: () => void }) {
  return (
    <main className={styles.recovery}>
      <div>
        <p className={styles.brand}>Retailor</p>
        <h1>Let’s try that again.</h1>
        <p>
          We couldn’t open this view. Try again, or return to the start of your
          demo.
        </p>
        <p className={styles.note}>
          Your temporary collection can resume if its saved data is still
          available. This won’t start another AI request.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={retry}>
            Try again
          </button>
          <Link href="/" prefetch={false}>
            Back to Retailor
          </Link>
        </div>
      </div>
    </main>
  );
}
