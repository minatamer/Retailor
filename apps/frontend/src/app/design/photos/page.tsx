import { notFound } from "next/navigation";
import { designPreviewAllowed } from "../../../server/design-preview.server";
import { PhotoLab } from "../../../features/photos/photo-lab";
export const dynamic = "force-dynamic";
export default function PhotoReferencePage() {
  if (!designPreviewAllowed()) notFound();
  return <PhotoLab />;
}
