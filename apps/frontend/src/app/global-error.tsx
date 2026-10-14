"use client";
import { ViewRecovery } from "../components/ui/recovery";
import { FontPreloads } from "../styles/font-preloads";
import "../styles/fonts.css";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <FontPreloads />
        <ViewRecovery retry={retry} />
      </body>
    </html>
  );
}
