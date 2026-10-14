import badminton from "@/assets/sport-badminton.jpg";
import cricket from "@/assets/sport-cricket.jpg";
import football from "@/assets/sport-football.jpg";
import pool from "@/assets/sport-pool.jpg";

export type Sport = {
  slug: string;
  name: string;
  image: string;
  tagline: string;
};

export const SPORTS: Sport[] = [
  { slug: "cricket", name: "Cricket", image: cricket, tagline: "Box turf & nets" },
  { slug: "football", name: "Football", image: football, tagline: "5v5 / 7v7 turf" },
  { slug: "badminton", name: "Badminton", image: badminton, tagline: "Indoor courts" },
  { slug: "pool", name: "8 Ball Pool", image: pool, tagline: "Club tables" },
];

export function sportBySlug(slug: string) {
  return SPORTS.find((s) => s.slug === slug);
}

export const LOCATIONS: string[] = [
  "Mira Road", "Dahisar", "Borivali", "Kandivali", "Malad", "Goregaon",
  "Ram Mandir", "Jogeshwari", "Andheri", "Vile Parle", "Santacruz", "Khar Road",
  "Bandra", "Mahim Junction", "Matunga Road", "Dadar", "Prabhadevi", "Lower Parel",
  "Mahalaxmi", "Mumbai Central", "Grant Road", "Charni Road", "Marine Lines", "Churchgate",
];

export function hourLabel(hour: number) {
  const to12 = (h: number) => {
    const n = ((h % 24) + 24) % 24;
    const suffix = n < 12 ? "AM" : "PM";
    const base = n % 12 === 0 ? 12 : n % 12;
    return `${base} ${suffix}`;
  };
  return `${to12(hour)} - ${to12(hour + 1)}`;
}

export function slotRange(openHour: number, closeHour: number) {
  const out: number[] = [];
  const end = closeHour <= openHour ? closeHour + 24 : closeHour;
  for (let h = openHour; h < end; h++) out.push(h % 24);
  return out;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextDays(count: number) {
  const out: { iso: string; day: string; date: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: String(d.getDate()),
    });
  }
  return out;
}

export type PricedTurf = {
  open_hour: number;
  price_per_hour: number | string;
  evening_price?: number | string | null;
  evening_start_hour?: number | null;
};

/** Slots from opening until evening_start_hour use the day price; the rest use the evening price. */
export function isEveningHour(t: PricedTurf, hour: number) {
  if (t.evening_price == null || t.evening_start_hour == null) return false;
  return !(hour >= t.open_hour && hour < t.evening_start_hour);
}

export function slotPrice(t: PricedTurf, hour: number) {
  return Number(isEveningHour(t, hour) ? t.evening_price : t.price_per_hour);
}

export function advanceFor(total: number, percent: number) {
  return Math.round((total * percent) / 100);
}

export function parseHours(value: string) {
  return [...new Set(value.split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 23))].sort(
    (a, b) => a - b,
  );
}

export function rupees(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export type PaymentApp = {
  id: string;
  label: string;
  hint: string;
  scheme: string;
};

export const PAYMENT_APPS: PaymentApp[] = [
  { id: "gpay", label: "Google Pay", hint: "Opens the GPay app", scheme: "tez://upi/pay" },
  { id: "phonepe", label: "PhonePe", hint: "Opens the PhonePe app", scheme: "phonepe://pay" },
  { id: "paytm", label: "Paytm", hint: "Opens the Paytm app", scheme: "paytmmp://pay" },
  { id: "upi", label: "Any UPI app", hint: "BHIM, bank apps, etc.", scheme: "upi://pay" },
];

export function buildUpiLink(opts: {
  scheme: string;
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName || "Turf Owner",
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note.slice(0, 60),
  });
  return `${opts.scheme}?${params.toString()}`;
}

export const AMENITIES: string[] = [
  "Floodlights", "Parking", "Washroom", "Changing room", "Drinking water",
  "Seating area", "Equipment on rent", "Cafeteria", "First aid", "CCTV", "Shower", "Wi-Fi",
];