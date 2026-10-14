import { SlotGrid } from "@/components/SlotGrid";
import { TurfImage } from "@/components/TurfImage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { hourLabel, nextDays, rupees, slotPrice, slotRange, todayISO } from "@/lib/turf";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/player/turf/$turfId")({
  component: TurfSlots,
});

function TurfSlots() {
  const { turfId } = useParams({ from: "/_authenticated/player/turf/$turfId" });
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState<number[]>([]);
  const days = nextDays(7);

  const { data: turf } = useQuery({
    queryKey: ["turf", turfId],
    queryFn: async () => {
      const { data, error } = await supabase.from("turfs").select("*").eq("id", turfId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookedHours } = useQuery({
    queryKey: ["booked", turfId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booked_slots", {
        p_turf_id: turfId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []).map((row: { slot_hour: number }) => row.slot_hour);
    },
  });

  const slots = turf ? slotRange(turf.open_hour, turf.close_hour) : [];
  const booked = new Set<number>(bookedHours ?? []);
  const toggleHour = (h: number) =>
    setHours((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  const total = turf ? hours.reduce((sum, h) => sum + slotPrice(turf, h), 0) : 0;
  const hasEvening = turf?.evening_price != null && turf?.evening_start_hour != null;

  return (
    <main className="px-4 py-6">
      <Link
        to="/player"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Home
      </Link>

      {turf?.image_url && (
        <TurfImage
          path={turf.image_url}
          alt={turf.name}
          className="mt-4 h-52 w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
        />
      )}

      <h1 className="mt-4 text-3xl font-extrabold leading-tight">{turf?.name ?? "Turf"}</h1>
      <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-4" /> {turf?.address || turf?.location}
      </p>
      {turf && (
        <div className="mt-2 space-y-0.5 text-sm">
          <p>
            <span className="font-bold text-primary">{rupees(Number(turf.price_per_hour))}</span>
            <span className="text-muted-foreground">
              {" "}per slot{hasEvening ? ` · ${hourLabel(turf.open_hour).split(" - ")[0]} to ${hourLabel(turf.evening_start_hour - 1).split(" - ")[1]}` : ""}
            </span>
          </p>
          {hasEvening && (
            <p>
              <span className="font-bold text-primary">{rupees(Number(turf.evening_price))}</span>
              <span className="text-muted-foreground">
                {" "}per slot · {hourLabel(turf.evening_start_hour).split(" - ")[0]} onwards
              </span>
            </p>
          )}
          <p className="text-muted-foreground">{turf.advance_percent}% advance to book</p>
        </div>
      )}
      {!!turf?.amenities?.length && (

<div className="mt-3 flex flex-wrap gap-1.5">
          {turf.amenities.map((a: string) => (
            <span
              key={a}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
            >
              {a}
            </span>
          ))}
        </div>
      )}


      <h2 className="mt-6 text-base font-bold">
        Pick a date
      </h2>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => {
              setDate(d.iso);
              setHours([]);
            }}
            className={`flex min-w-14 flex-col items-center rounded-2xl border px-3 py-2.5 transition-colors ${
              date === d.iso
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <span className="text-xs uppercase">{d.day}</span>
            <span className="text-lg font-bold leading-none">{d.date}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold">
          Pick one or more times
        </h2>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-success" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-destructive" /> Booked
          </span>
        </div>
      </div>

      <div className="mt-3">
        <SlotGrid
          slots={slots}
          booked={booked}
          selected={hours}
          onSelect={toggleHour}
          date={date}
          priceFor={turf ? (h) => slotPrice(turf, h) : undefined}
        />
      </div>

      {hours.length > 0 && turf && (
        <div className="fixed inset-x-0 bottom-[72px] z-20 rounded-t-3xl border-t border-border bg-card p-4 shadow-[0_-12px_30px_-12px_rgb(0_0_0/0.18)]">
          <div className="flex items-center justify-between text-sm">
            <span>
              <span className="font-semibold text-primary">
                {hours.length} slot{hours.length > 1 ? "s" : ""}
              </span>{" "}
              on {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-lg font-bold">{rupees(total)}</span>
          </div>
          <Button
            className="mt-3 h-12 w-full text-base font-semibold"
            onClick={() =>
              navigate({
                to: "/player/book/$turfId",
                params: { turfId },
                search: { date, hours: [...hours].sort((a, b) => a - b).join(",") },
              })
            }
          >
            Continue booking
          </Button>
        </div>
      )}
    </main>
  );
}

