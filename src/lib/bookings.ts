import { supabase } from "@/integrations/supabase/client";

export type NewBooking = {
  turf_id: string;
  booking_date: string;
  slot_hour: number;
  amount_total: number;
  amount_paid: number;
  payment_type: "half" | "full";
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  created_by_admin?: boolean;
};

export async function createBooking(input: NewBooking) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: "You need to sign in again." };

  const { data, error } = await supabase
    .from("bookings")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { error: "That slot was just booked by someone else. Pick another time." };
    }
    return { error: error.message };
  }
  return { id: data.id };
}

