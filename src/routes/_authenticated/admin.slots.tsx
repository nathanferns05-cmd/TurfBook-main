import { SlotGrid } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { createBooking } from "@/lib/bookings";
import { PAYMENT_APPS, advanceFor, buildUpiLink, hourLabel, nextDays, rupees, slotPrice, slotRange, todayISO } from "@/lib/turf";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/slots")({
  component: AdminSlots,
});

type Turf = {
  id: string;
  name: string;
  price_per_hour: number;
  evening_price: number | null;
  evening_start_hour: number | null;
  advance_percent: number;
  open_hour: number;
  close_hour: number;
  upi_id: string | null;
  payee_name: string | null;
};

function AdminSlots() {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const [turfId, setTurfId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState<number[]>([]);
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentType, setPaymentType] = useState<"half" | "full">("full");
  const [busy, setBusy] = useState(false);

  const { data: turfs } = useQuery({
    queryKey: ["admin-turfs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turfs")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Turf[];
    },
  });

  useEffect(() => {
    if (!turfId && turfs?.length) setTurfId(turfs[0].id);
  }, [turfs, turfId]);

  const turf = turfs?.find((t) => t.id === turfId);

  const { data: bookedHours } = useQuery({
    queryKey: ["booked", turfId, date],
    enabled: !!turfId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booked_slots", {
        p_turf_id: turfId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []).map((r: { slot_hour: number }) => r.slot_hour);
    },
  });

  const prices = turf ? hours.map((h) => slotPrice(turf, h)) : [];
  const total = prices.reduce((sum, n) => sum + n, 0);
  const advance = prices.reduce((sum, n) => sum + advanceFor(n, turf?.advance_percent ?? 50), 0);
  const payable = paymentType === "half" ? advance : total;

  const toggleHour = (h: number) =>
    setHours((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h].sort((a, b) => a - b)));

  const book = async (method: string, scheme?: string) => {
    if (!turf || !hours.length) return;
    if (name.trim().length < 2) {
      toast.error("Enter the customer's name");
      return;
    }
    setBusy(true);
    const booked: number[] = [];
    let failure = "";
    for (const h of hours) {
      const price = slotPrice(turf, h);
      const result = await createBooking({
        turf_id: turf.id,
        booking_date: date,
        slot_hour: h,
        amount_total: price,
        amount_paid: paymentType === "half" ? advanceFor(price, turf.advance_percent) : price,
        payment_type: paymentType,
        payment_method: method,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        created_by_admin: true,
      });
      if ("error" in result) {
        failure = result.error ?? "Could not book this slot.";
        break;
      }
      booked.push(h);
    }
    setBusy(false);
    queryClient.invalidateQueries({ queryKey: ["booked", turf.id] });
    queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
    if (failure) {
      toast.error(
        booked.length
          ? `${failure} Booked so far: ${booked.map((h) => hourLabel(h)).join(", ")}.`
          : failure,
      );
      setHours((cur) => cur.filter((h) => !booked.includes(h)));
      if (!booked.length) return;
    } else {
      toast.success(
        `${booked.length > 1 ? "Slots" : "Slot"} booked — shown as red for players.`,
      );
    }
    setSheet(false);
    setHours([]);
    setName("");
    setPhone("");
    if (!failure && scheme && turf.upi_id) {
      window.location.href = buildUpiLink({
        scheme,
        upiId: turf.upi_id,
        payeeName: turf.payee_name || turf.name,
        amount: payable,
        note: `${turf.name} ${date} ${booked.map((h) => hourLabel(h)).join(", ")}`,
      });
    }
  };

  const slots = turf ? slotRange(turf.open_hour, turf.close_hour) : [];

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">SLOTS</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Tap one or more free slots to book a walk-in customer. Red slots are already booked.
      </p>

      {!turfs?.length ? (
        <div className="card-surface mt-5 p-8 text-center text-sm text-muted-foreground">
          Add a turf first to manage slots.
        </div>
      ) : (
        <>
          <select
            value={turfId}
            onChange={(e) => {
              setTurfId(e.target.value);
              setHours([]);
            }}
            className="mt-4 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
          >
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {nextDays(7).map((d) => (
              <button
                key={d.iso}
                onClick={() => {
                  setDate(d.iso);
                  setHours([]);
                }}
                className={`flex min-w-14 flex-col items-center rounded-xl border px-3 py-2 ${
                  date === d.iso
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                <span className="text-xs uppercase">{d.day}</span>
                <span className="text-lg font-bold leading-none">{d.date}</span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <SlotGrid
              slots={slots}
              booked={new Set(bookedHours ?? [])}
              selected={hours}
              onSelect={toggleHour}
              date={date}
              priceFor={turf ? (h) => slotPrice(turf, h) : undefined}
            />
          </div>
          {hours.length > 0 && (
            <Button className="mt-5 h-12 w-full text-base" onClick={() => setSheet(true)}>
              Book {hours.length} slot{hours.length > 1 ? "s" : ""} · {rupees(total)}
            </Button>
          )}
        </>
      )}

      {sheet && hours.length > 0 && turf && (
        <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Book {hours.length} slot{hours.length > 1 ? "s" : ""}</h2>
              <button onClick={() => setSheet(false)} aria-label="Close">
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Customer name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Phone
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={15}
                  inputMode="tel"
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["half", "full"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPaymentType(type)}
                  className={`card-surface p-3 text-left ${paymentType === type ? "border-primary" : ""}`}
                >
                  <span className="block font-display text-xl uppercase leading-none">{type}</span>
                  <span className="mt-1 block text-sm font-bold text-primary">
                    {rupees(type === "half" ? advance : total)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              {PAYMENT_APPS.map((app) => (
                <button
                  key={app.id}
                  disabled={busy}
                  onClick={() => book(app.id, app.scheme)}
                  className="card-surface flex w-full items-center gap-3 p-3.5 text-left disabled:opacity-60"
                >
                  <Wallet className="size-5 text-primary" />
                  <span className="flex-1 text-sm font-semibold">{app.label}</span>
                </button>
              ))}
              <button
                disabled={busy}
                onClick={() => book("cash")}
                className="card-surface flex w-full items-center gap-3 p-3.5 text-left disabled:opacity-60"
              >
                <Banknote className="size-5 text-accent" />
                <span className="flex-1 text-sm font-semibold">Cash on delivery</span>
              </button>
            </div>

            <Button variant="outline" className="mt-4 w-full" onClick={() => setSheet(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

