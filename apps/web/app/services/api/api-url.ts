export function apiUrl(baseURL: string, path: string): string {
  const base = new URL(`${baseURL.replace(/\/$/, "")}/`);
  return new URL(path.replace(/^\//, ""), base).href;
}
