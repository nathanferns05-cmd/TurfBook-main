import { useAuthUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { hourLabel, rupees } from "@/lib/turf";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: OwnerBookings,
});

function OwnerBookings() {
  const { data: user } = useAuthUser();





  const { data: turfIds } = useQuery({
    queryKey: ["admin-turf-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("id").eq("owner_id", user!.id);
      return (data ?? []).map((t) => t.id);
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["owner-bookings", turfIds],
    enabled: !!turfIds?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, turfs(name, location)")
        .in("turf_id", turfIds!)
        .order("booking_date", { ascending: false })
        .order("slot_hour", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const earned = (bookings ?? [])
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + Number(b.amount_paid), 0);

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">RESERVATIONS</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Every booking on your turfs, app or walk-in.
      </p>

      <div className="card-surface mt-4 flex items-center justify-between p-4">
        <span className="text-sm text-muted-foreground">Collected so far</span>
        <span className="font-display text-2xl text-primary">{rupees(earned)}</span>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !bookings?.length && (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            No reservations yet.
          </div>
        )}
        {bookings?.map((b) => (
          <div key={b.id} className="card-surface space-y-1.5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{b.customer_name || "Player"}</p>
                <p className="text-xs text-muted-foreground">{b.customer_phone || "—"}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  b.status === "cancelled"
                    ? "bg-destructive/15 text-destructive"
                    : b.status === "pending"
                      ? "bg-accent/15 text-accent"
                      : "bg-success/15 text-success"
                }`}
              >
                {b.status === "pending" ? "Pending payment" : b.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {b.turfs?.name} · {new Date(b.booking_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}{" "}
              · {hourLabel(b.slot_hour)}
            </p>
            <p className="text-sm">
              <span className="font-bold text-primary">{rupees(Number(b.amount_paid))}</span>
              <span className="text-muted-foreground">
                {" "}
                / {rupees(Number(b.amount_total))} · {b.payment_type} · {b.payment_method}
                {b.created_by_admin ? " · walk-in" : ""}
              </span>
            </p>
            {b.status === "pending" && (
              <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Payment not completed yet — this slot is only held. It confirms automatically the
                moment the money is received.
              </p>
            )}

          </div>
        ))}
      </div>
    </main>
  );
}

