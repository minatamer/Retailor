"use client";
import { ViewRecovery } from "../components/ui/recovery";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <ViewRecovery retry={retry} />
      </body>
    </html>
  );
}
