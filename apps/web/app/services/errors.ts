export function statusCodeFrom(cause: unknown): number | undefined {
  if (typeof cause !== "object" || cause === null || !("statusCode" in cause))
    return undefined;
  return typeof cause.statusCode === "number" ? cause.statusCode : undefined;
}
