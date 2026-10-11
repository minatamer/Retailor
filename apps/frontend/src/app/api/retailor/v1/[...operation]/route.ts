import { backendRequest } from "../../../../../server/backend.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string[] }> };
async function route(request: Request, context: Context) {
  const { operation } = await context.params;
  return backendRequest(request, operation.join("/"));
}
export const GET = route;
export const POST = route;
