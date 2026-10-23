import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slotRange } from "@/lib/turf";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const BOOKING_WINDOW_DAYS = 7;

/** Today's date (YYYY-MM-DD) and current hour in India, whatever the server's timezone. */
function nowInIndia() {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return { date: ist.toISOString().slice(0, 10), hour: ist.getUTCHours() };
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Same rules as the slot grid: the date must be within the booking window, every
 * hour must be inside opening hours, and today's slots are bookable only once
 * the current hour has ended (a slot that has started counts as passed).
 */
function assertBookableSlots(
  turf: { open_hour: number; close_hour: number },
  bookingDate: string,
  hours: number[],
) {
  const now = nowInIndia();
  const lastDate = addDays(now.date, BOOKING_WINDOW_DAYS - 1);
  if (bookingDate < now.date) throw new Error("That date has already passed.");
  if (bookingDate > lastDate) {
    throw new Error(`You can only book up to ${BOOKING_WINDOW_DAYS} days ahead.`);
  }

  const open = new Set(slotRange(turf.open_hour, turf.close_hour));
  if (hours.some((h) => !open.has(h))) {
    throw new Error("One of those slots is outside the turf's opening hours.");
  }
  if (bookingDate === now.date && hours.some((h) => h <= now.hour)) {
    throw new Error("One of those slots has already started or passed. Please pick again.");
  }
}

const orderInput = z.object({
  turf_id: z.string().uuid(),
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d), "Invalid date"),
  slot_hours: z.array(z.number().int().min(0).max(23)).min(1).max(8),
  payment_type: z.enum(["half", "full"]),
  customer_name: z.string().trim().max(80).default(""),
  customer_phone: z.string().trim().max(20).default(""),
});

/**
 * Creates the booking in `pending` state (amounts are computed by database
 * triggers) and opens a Razorpay order for exactly that amount.
 */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderInput.parse(data))
  .handler(async ({ data, context }) => {
    const { createRazorpayOrder, razorpayCreds } = await import("@/lib/payments.server");
    const { keyId } = razorpayCreds();

    const hours = [...new Set(data.slot_hours)];

    const { data: turf } = await context.supabase
      .from("turfs")
      .select("open_hour, close_hour")
      .eq("id", data.turf_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!turf) throw new Error("This turf is not taking bookings right now.");
    assertBookableSlots(turf, data.booking_date, hours);

    // One row per hour, inserted in a single statement: if any slot is taken, none are held.
    const { data: rows, error } = await context.supabase
      .from("bookings")
      .insert(
        hours.map((slot_hour) => ({
          turf_id: data.turf_id,
          user_id: context.userId,
          booking_date: data.booking_date,
          slot_hour,
          payment_type: data.payment_type,
          payment_method: "razorpay",
          amount_total: 0,
          amount_paid: 0,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
        })),
      )
      .select("id, amount_paid, amount_total");

    if (error || !rows?.length) {
      const message = error?.message ?? "Could not hold these slots.";
      if (error?.code === "23505" || /duplicate|unique/i.test(message)) {
        throw new Error("One of those slots was just taken. Please pick again.");
      }
      throw new Error(message);
    }

    const bookingIds = rows.map((r) => r.id);
    const paidTotal = rows.reduce((sum, r) => sum + Number(r.amount_paid), 0);
    const grandTotal = rows.reduce((sum, r) => sum + Number(r.amount_total), 0);
    const amountPaise = Math.round(paidTotal * 100);

    try {
      const order = await createRazorpayOrder({
        amountPaise,
        receipt: bookingIds[0],
        notes: { booking_ids: bookingIds.join(",").slice(0, 250), turf_id: data.turf_id },
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("bookings")
        .update({ razorpay_order_id: order.id })
        .in("id", bookingIds);

      return {
        bookingIds,
        orderId: order.id,
        amount: order.amount,
        keyId,
        amountPaid: paidTotal,
        amountTotal: grandTotal,
      };
    } catch (e) {
      // No order = no way to pay, so release the held slot immediately.
      await context.supabase.from("bookings").update({ status: "cancelled" }).in("id", bookingIds);
      throw e;
    }
  });

const verifyInput = z.object({
  bookingIds: z.array(z.string().uuid()).min(1).max(8),
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(8),
});

/**
 * Confirms a booking ONLY after the checkout signature is valid and Razorpay
 * itself reports the payment as captured for the right order and amount.
 */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { verifyCheckoutSignature, fetchRazorpayPayment } = await import(
      "@/lib/payments.server"
    );

    const { data: found } = await context.supabase
      .from("bookings")
      .select("id, amount_paid, razorpay_order_id, status")
      .in("id", data.bookingIds)
      .eq("user_id", context.userId);

    if (!found?.length || found.length !== new Set(data.bookingIds).size) {
      throw new Error("Booking not found.");
    }
    if (found.some((b) => b.razorpay_order_id !== data.razorpay_order_id)) {
      throw new Error("Payment does not match this booking.");
    }

    const valid = await verifyCheckoutSignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
    });
    if (!valid) throw new Error("Payment could not be verified.");

    const payment = await fetchRazorpayPayment(data.razorpay_payment_id);
    const expectedPaise = Math.round(found.reduce((sum, b) => sum + Number(b.amount_paid), 0) * 100);
    if (
      payment.order_id !== data.razorpay_order_id ||
      payment.amount !== expectedPaise ||
      !["captured", "authorized"].includes(payment.status)
    ) {
      throw new Error("Payment was not completed.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "confirmed",
        razorpay_payment_id: payment.id,
        payment_method: payment.method ?? "razorpay",
      })
      .in("id", data.bookingIds);
    if (error) throw new Error(error.message);

    return { status: "confirmed" as const };
  });

/** Releases a held slot when the player abandons or fails the payment. */
export const abandonBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ bookingIds: z.array(z.string().uuid()).min(1).max(8) }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .in("id", data.bookingIds)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    return { ok: true };
  });

