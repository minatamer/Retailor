import type { NamedPhoto } from "./controller";
export function namedFiles(files: FileList | null): NamedPhoto[] {
  const result: NamedPhoto[] = [];
  if (files)
    for (let i = 0; i < Math.min(files.length, 25); i++) {
      const file = files.item(i);
      if (file) result.push({ name: file.name, blob: file });
    }
  return result;
}
