import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { originGuard } from "./server/origin-guard.server";

export function proxy(request: NextRequest) {
  return originGuard(request) ?? NextResponse.next();
}

// The fixed API checks the same seal inside its bridge, preserving streaming uploads.
// Everything else includes public assets, static bundles, RSC and page navigation.
export const config = {
  matcher: ["/((?!api/retailor/v1(?:/|$)).*)"],
};
