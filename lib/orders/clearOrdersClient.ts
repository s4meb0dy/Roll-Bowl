export async function clearAllOrdersRemote(
  pin: string
): Promise<
  | { ok: true; deleted: number; inboxEnabled: boolean }
  | { ok: false; reason: string }
> {
  const res = await fetch("/api/admin/orders/clear", {
    method: "POST",
    headers: { "x-admin-pin": pin },
    credentials: "same-origin",
  });

  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (res.status === 503) return { ok: false, reason: "inbox_unreachable" };
  if (!res.ok) return { ok: false, reason: "clear_failed" };

  const data = (await res.json()) as {
    deleted?: number;
    inboxEnabled?: boolean;
  };
  return {
    ok: true,
    deleted: data.deleted ?? 0,
    inboxEnabled: data.inboxEnabled ?? true,
  };
}
