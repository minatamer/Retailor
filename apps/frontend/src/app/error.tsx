"use client";
import { ViewRecovery } from "../components/ui/recovery";
/** Next's private/framework diagnostics remain; no exception detail is rendered/logged here. */
export default function RouteError({ retry }: { retry: () => void }) {
  return <ViewRecovery retry={retry} />;
}
