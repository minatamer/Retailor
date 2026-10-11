import { notFound } from "next/navigation";
import { DesignLab } from "../../features/store-design/design-lab";
import { designPreviewAllowed } from "../../server/design-preview.server";
export const dynamic = "force-dynamic";
export default function DesignReferencePage() {
  if (!designPreviewAllowed()) notFound();
  return <DesignLab />;
}
