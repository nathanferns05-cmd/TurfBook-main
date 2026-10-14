import { hourLabel } from "@/lib/turf";
import { Check } from "lucide-react";

export function SlotGrid({
  slots,
  booked,
  selected = [],
  onSelect,
  date,
  priceFor,
}: {
  slots: number[];
  booked: Set<number>;
  selected?: number[];
  onSelect?: (hour: number) => void;
  date: string;
  priceFor?: (hour: number) => number;
}) {
  const now = new Date();
  const isToday = date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {slots.map((hour) => {
        const isBooked = booked.has(hour);
        const isPast = isToday && hour <= now.getHours();
        const disabled = isBooked || isPast;
        const isSelected = selected.includes(hour);

        return (
          <button
            key={hour}
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(hour)}
            aria-pressed={isSelected}
            className={[
              "relative rounded-xl border-2 px-3 py-3 text-left transition-all",
              isSelected
                ? "border-primary bg-primary text-primary-foreground glow"
                : isBooked
                  ? "border-transparent bg-destructive/10 text-destructive/80 line-through decoration-destructive/40"
                  : isPast
                    ? "border-transparent bg-muted text-muted-foreground/70"
                    : "border-success/30 bg-card text-foreground hover:border-success active:scale-[0.97]",
            ].join(" ")}
          >
            {isSelected && <Check className="absolute right-2 top-2 size-4" />}
            <span className="block text-sm font-semibold">{hourLabel(hour)}</span>
            <span className="block text-xs opacity-80">
              {isBooked ? "Booked" : isPast ? "Passed" : priceFor ? `₹${priceFor(hour).toLocaleString("en-IN")}` : "Available"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
