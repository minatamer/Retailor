import type { ModelCatalogue } from "@retailor/contracts/recognition";

type Attribute = ModelCatalogue["garments"][number]["attributes"][number];
const visible = new Set(["colour", "pattern", "closure", "sleeve", "neckline"]);
/** Existing evidence policy, expressed as fixed private diagnostic codes. */
export function attributeIssue(attr: Attribute, sources: readonly string[]) {
  if (new Set(attr.sourceIds).size !== attr.sourceIds.length)
    return "duplicate_sources" as const;
  if (attr.sourceIds.some((source) => !sources.includes(source)))
    return "foreign_source" as const;
  if (attr.evidence !== "unknown" && !attr.sourceIds.length)
    return "missing_evidence_sources" as const;
  if (attr.evidence !== "unknown" && attr.value === null)
    return "missing_evidence_value" as const;
  if (attr.evidence === "visual" && !visible.has(attr.name))
    return "visual_attribute_not_allowed" as const;
  if (attr.evidence === "label" && !["material", "care"].includes(attr.name))
    return "label_attribute_not_allowed" as const;
  if (attr.evidence === "unknown" && attr.value !== null)
    return "unknown_attribute_has_value" as const;
  if (attr.evidence === "unknown" && attr.sourceIds.length)
    return "unknown_attribute_has_sources" as const;
  return null;
}
