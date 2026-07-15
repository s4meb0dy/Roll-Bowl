/** Delete a single order from the server inbox (admin only). */
export async function deleteOrderRemote(
  orderId: string,
  pin?: string
): Promise<
  | { ok: true; deleted: boolean; inboxEnabled: boolean }
  | { ok: false; reason: string }
> {
  const res = await fetch("/api/admin/orders/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(pin ? { "x-admin-pin": pin } : {}),
    },
    credentials: "same-origin",
    body: JSON.stringify({ orderId }),
  });

  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (res.status === 503) return { ok: false, reason: "inbox_unreachable" };
  if (!res.ok) return { ok: false, reason: "delete_failed" };

  const data = (await res.json().catch(() => ({}))) as {
    deleted?: boolean;
    inboxEnabled?: boolean;
  };
  return {
    ok: true,
    deleted: data.deleted ?? false,
    inboxEnabled: data.inboxEnabled ?? true,
  };
}
