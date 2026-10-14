import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { abandonBooking, confirmPayment, startPayment } from "@/lib/payments.functions";
import { advanceFor, hourLabel, parseHours, rupees, slotPrice } from "@/lib/turf";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/player/book/$turfId")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: String(search.date ?? ""),
    hours: String(search.hours ?? ""),
  }),
  component: BookingPayment,
});

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as any).Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Checkout could not load")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Checkout could not load"));
    document.body.appendChild(script);
  });
}

function BookingPayment() {
  const { turfId } = useParams({ from: "/_authenticated/player/book/$turfId" });
  const { date, hours: hoursParam } = Route.useSearch();
  const hours = parseHours(hoursParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();

  const begin = useServerFn(startPayment);
  const confirm = useServerFn(confirmPayment);
  const abandon = useServerFn(abandonBooking);

  const [paymentType, setPaymentType] = useState<"half" | "full" | null>(null);
  const [showHalfWarning, setShowHalfWarning] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: turf } = useQuery({
    queryKey: ["turf", turfId],
    queryFn: async () => {
      const { data, error } = await supabase.from("turfs").select("*").eq("id", turfId).single();
      if (error) throw error;
      return data;
    },
  });

  const prices = turf ? hours.map((h) => slotPrice(turf, h)) : [];
  const total = prices.reduce((sum, n) => sum + n, 0);
  const advance = prices.reduce((sum, n) => sum + advanceFor(n, turf?.advance_percent ?? 50), 0);
  const payable = paymentType === "half" ? advance : total;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booked", turfId] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const pay = async () => {
    if (!turf || !paymentType || !hours.length) return;
    setBusy(true);
    let order: Awaited<ReturnType<typeof begin>>;
    try {
      await loadCheckout();
      order = await begin({
        data: {
          turf_id: turf.id,
          booking_date: date,
          slot_hours: hours,
          payment_type: paymentType,
          customer_name: profile?.full_name ?? "",
          customer_phone: profile?.phone ?? "",
        },
      });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Could not start the payment.");
      return;
    }

    const release = async () => {
      try {
        await abandon({ data: { bookingIds: order.bookingIds } });
      } catch {
        /* webhook will clean it up */
      }
      refresh();
    };

    const rzp = new (window as any).Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: "INR",
      name: turf.name,
      description: `${new Date(date).toDateString()} · ${hours.map((h) => hourLabel(h)).join(", ")}`,
      prefill: {
        name: profile?.full_name ?? "",
        contact: profile?.phone ?? "",
        email: profile?.email ?? "",
      },
      theme: { color: "#1e7a46" },
      modal: {
        ondismiss: async () => {
          setBusy(false);
          await release();
          toast.error("Payment cancelled — the slot was not booked.");
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await confirm({ data: { bookingIds: order.bookingIds, ...response } });
          refresh();
          toast.success("Payment received. Your booking is confirmed!");
          navigate({ to: "/player/bookings" });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "We could not verify the payment. If money was deducted, it reflects shortly.",
          );
          refresh();
          navigate({ to: "/player/bookings" });
        } finally {
          setBusy(false);
        }
      },
    });

    rzp.on("payment.failed", async () => {
      setBusy(false);
      await release();
      toast.error("Payment failed — the slot was not booked.");
    });

    rzp.open();
  };

  return (
    <main className="px-4 py-6">
      <Link
        to="/player/turf/$turfId"
        params={{ turfId }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Slots
      </Link>

      <h1 className="mt-4 text-3xl leading-none">CONFIRM & PAY</h1>

      <div className="card-surface mt-4 space-y-2 p-4 text-sm">
        <Row label="Turf" value={turf?.name ?? "—"} />
        <Row
          label="Date"
          value={new Date(date).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        />
        {hours.map((h, i) => (
          <Row key={h} label={hourLabel(h)} value={rupees(prices[i] ?? 0)} />
        ))}
        <div className="border-t border-border pt-2">
          <Row label={`Total (${hours.length} slot${hours.length > 1 ? "s" : ""})`} value={rupees(total)} strong />
        </div>
      </div>

      <h2 className="mt-6 text-xs font-semibold text-muted-foreground">
        Payment option
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowHalfWarning(true)}
          className={`card-surface p-4 text-left ${paymentType === "half" ? "border-primary glow" : ""}`}
        >
          <span className="block font-display text-2xl leading-none">HALF</span>
          <span className="mt-1 block text-lg font-bold text-primary">{rupees(advance)}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {turf?.advance_percent ?? 50}% advance · non-refundable
          </span>
        </button>
        <button
          onClick={() => setPaymentType("full")}
          className={`card-surface p-4 text-left ${paymentType === "full" ? "border-primary glow" : ""}`}
        >
          <span className="block font-display text-2xl leading-none">FULL</span>
          <span className="mt-1 block text-lg font-bold text-primary">{rupees(total)}</span>
          <span className="mt-1 block text-xs text-muted-foreground">Pay everything now</span>
        </button>
      </div>

      {paymentType && (
        <>
          <button
            disabled={busy || !hours.length}
            onClick={pay}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-display text-2xl leading-none text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : null}
            PAY {rupees(payable)}
          </button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Secure checkout with UPI, Google Pay, PhonePe, Paytm, cards and netbanking. Your slot
              is confirmed <span className="font-semibold text-foreground">only</span> after the
              money is actually received — going back or closing the payment page cancels it.
            </span>
          </p>
        </>
      )}

      <AlertDialog open={showHalfWarning} onOpenChange={setShowHalfWarning}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="size-7" />
            </div>
            <AlertDialogTitle className="text-center font-display text-2xl">
              HALF PAYMENT IS NON-REFUNDABLE
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You will pay {rupees(advance)} now and {rupees(total - advance)} at the turf. If you
              cancel, this advance will not be returned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel className="w-full sm:w-auto">Go back</AlertDialogCancel>
            <AlertDialogAction className="w-full sm:w-auto" onClick={() => setPaymentType("half")}>
              I understand, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-lg font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}

