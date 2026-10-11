import { LiveWorkspace } from "../../features/demo/live-workspace";
import { DevelopmentWorkspace } from "../../features/demo/development-workspace";
import { designPreviewAllowed } from "../../server/design-preview.server";
export const dynamic = "force-dynamic";
export default function Demo() {
  return designPreviewAllowed() ? <DevelopmentWorkspace /> : <LiveWorkspace />;
}
