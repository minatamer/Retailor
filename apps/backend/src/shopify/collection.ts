import { randomBytes } from "node:crypto";
import { deny } from "../security/errors.js";
import type { ShopifyScope } from "./service.js";
import type {
  CollectionIntent,
  CollectionProvider,
  RemoteCollection,
} from "./collection-provider.js";
import type { ProductContext } from "./product-provider.js";

function owned(remote: RemoteCollection, intent: CollectionIntent) {
  return (
    remote.handle === intent.handle &&
    remote.metafield?.value === intent.marker &&
    (!intent.remoteId || remote.id === intent.remoteId)
  );
}

export class ShopifyCollection {
  constructor(readonly provider: CollectionProvider) {}
  async ensure(context: ProductContext, scope: ShopifyScope) {
    const intent = await scope.update((current) => {
      if (!current.collection) {
        const marker = randomBytes(32).toString("hex");
        current.collection = {
          marker,
          handle: `retailor-${marker}`,
          remoteId: null,
          dispatched: false,
          removed: false,
          imageDispatched: false,
        };
      }
      return structuredClone(current.collection);
    });
    if (intent.removed) return deny("STALE", 409);
    let remote = await this.provider.read(
      context,
      intent.remoteId ? { id: intent.remoteId } : { handle: intent.handle },
    );
    let created = false;
    if (!remote && !intent.dispatched) {
      await scope.update((current) => {
        current.collection!.dispatched = true;
        current.collection!.imageDispatched = true;
      });
      created = true;
      remote = await this.provider.create(context, intent);
      if (!remote)
        await scope.update((current) => {
          current.collection!.dispatched = false;
          current.collection!.imageDispatched = false;
        });
    }
    if (!remote) return deny("UPSTREAM_FAILED", 502);
    if (!owned(remote, intent)) return deny("FORBIDDEN", 403);
    if (!remote.image && !created && !intent.imageDispatched) {
      // Check again before dispatch. Shopify has no atomic empty-image
      // condition, so never describe this fresh read as a remote CAS guarantee.
      remote = await this.provider.read(context, { id: remote.id });
      if (!remote) return deny("UPSTREAM_FAILED", 502);
      if (!owned(remote, intent)) return deny("FORBIDDEN", 403);
      if (!remote.image) {
        await scope.update((current) => {
          current.collection!.imageDispatched = true;
        });
        const changed = await this.provider.setImage(context, remote.id);
        if (!changed) {
          await scope.update((current) => {
            current.collection!.imageDispatched = false;
          });
          return deny("UPSTREAM_FAILED", 502);
        }
        if (!owned(changed, intent) || changed.id !== remote.id)
          return deny("FORBIDDEN", 403);
        remote = changed;
      }
    }
    await scope.update((current) => {
      current.collection!.remoteId = remote.id;
      if (remote.image) current.collection!.imageDispatched = false;
    });
    return remote.id;
  }
  async contains(
    context: ProductContext,
    scope: ShopifyScope,
    productId: string,
  ) {
    const intent = await scope.update((current) =>
      structuredClone(current.collection),
    );
    // Older ledger exports predate collection support and keep their existing semantics.
    if (!intent) return true;
    const remote = await this.provider.read(
      context,
      intent.remoteId ? { id: intent.remoteId } : { handle: intent.handle },
    );
    return (
      !!remote &&
      owned(remote, intent) &&
      remote.products.nodes.some((product) => product.id === productId)
    );
  }
  async remove(context: ProductContext, scope: ShopifyScope) {
    const intent = await scope.update((current) =>
      structuredClone(current.collection),
    );
    if (!intent || intent.removed) return true;
    const identifier = intent.remoteId
      ? { id: intent.remoteId }
      : { handle: intent.handle };
    const remote = await this.provider.read(context, identifier);
    if (!remote) {
      // Absence cannot settle an unknown create which might still arrive later.
      if (intent.dispatched && !intent.remoteId) return false;
    } else {
      if (
        !owned(remote, intent) ||
        remote.products.pageInfo.hasNextPage ||
        remote.products.nodes.length
      )
        return false;
      await scope.update((current) => {
        current.collection!.remoteId = remote.id;
      });
      if (!(await this.provider.remove(context, remote.id))) return false;
      if (await this.provider.read(context, { id: remote.id })) return false;
    }
    await scope.update((current) => {
      current.collection!.removed = true;
    });
    return true;
  }
}
