// File-saving helpers shared by the event-image download and the social-image download.

const MAX_SLUG = 60;

export function slugFor(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "") // accents
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, "");
  return slug || "event";
}

/** Two files with the same name get -2, -3 and so on, so nothing overwrites anything. */
export function uniqueNames(files: { baseName: string }[]): string[] {
  const used = new Set<string>();
  return files.map(({ baseName }) => {
    const dot = baseName.lastIndexOf(".");
    const stem = baseName.slice(0, dot);
    const ext = baseName.slice(dot);
    let name = baseName;
    for (let n = 2; used.has(name); n++) name = `${stem}-${n}${ext}`;
    used.add(name);
    return name;
  });
}

export function saveFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
