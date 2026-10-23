import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { hourLabel, rupees } from "@/lib/turf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/player/bookings")({
  component: MyBookings,
});

function MyBookings() {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, turfs(name, location, sport, advance_percent)")
        .eq("user_id", user!.id)
        .order("booking_date", { ascending: false })
        .order("slot_hour", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled. The advance amount is not refunded.");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booked"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">MY BOOKINGS</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        All your slots. Cancelling deducts the advance amount you paid.
      </p>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !bookings?.length && (
          <div className="card-surface p-8 text-center">
            <CalendarX2 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
            <Button asChild className="mt-4">
              <Link to="/player">Book a turf</Link>
            </Button>
          </div>
        )}

        {bookings?.map((booking) => {
          const cancelled = booking.status === "cancelled";
          const slotEnd = new Date(`${booking.booking_date}T00:00`);
          slotEnd.setHours(booking.slot_hour + 1);
          const past = slotEnd.getTime() <= Date.now();
          const pending = booking.status === "pending" && !past;
          return (
            <div key={booking.id} className="card-surface space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl leading-none">
                    {booking.turfs?.name ?? "Turf"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {booking.turfs?.location} · {booking.turfs?.sport}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    cancelled
                      ? "bg-destructive/15 text-destructive"
                      : past
                        ? "bg-muted text-muted-foreground"
                        : pending
                          ? "bg-accent/15 text-accent"
                          : "bg-success/15 text-success"
                  }`}
                >
                  {cancelled
                    ? "Cancelled"
                    : past
                      ? booking.status === "pending"
                        ? "Expired"
                        : "Completed"
                      : pending
                        ? "Pending payment"
                        : "Confirmed"}
                </span>
              </div>

              {pending && (
                <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Payment not completed. This slot is only held — it becomes confirmed as soon as
                  the payment goes through.
                </p>
              )}


              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {new Date(booking.booking_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span>{hourLabel(booking.slot_hour)}</span>
                <span className="uppercase">{booking.payment_method}</span>
              </div>

              <p className="text-sm">
                {booking.status === "pending" ? "To pay" : "Paid"}{" "}
                <span className="font-bold text-primary">{rupees(Number(booking.amount_paid))}</span>
                <span className="text-muted-foreground">
                  {" "}
                  of {rupees(Number(booking.amount_total))} ({booking.payment_type} payment)
                </span>
              </p>

              {!cancelled && !past && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-1 w-full">
                      Cancel booking
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-2xl">
                        CANCEL THIS SLOT?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {rupees(Number(booking.amount_paid))} already paid will be deducted and is
                        not refunded. The slot becomes available for others.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep booking</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancel.mutate(booking.id)}>
                        Yes, cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

