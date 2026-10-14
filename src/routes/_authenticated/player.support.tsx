import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/player/support")({
  component: AdminSupport,
});

const FAQS = [
  {
    q: "How do payouts work?",
    a: "Players pay the advance directly to your UPI id at booking time. The rest is collected by you at the venue.",
  },
  {
    q: "How do I block a slot without a booking?",
    a: "Go to Slots, pick the date, and add a walk-in booking for that slot to mark it as taken.",
  },
  {
    q: "Can I edit a turf's price or timings later?",
    a: "Yes — open My Turfs, tap the pencil icon on any turf, update the details, and save.",
  },
];

function AdminSupport() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">SUPPORT</h1>

      <p className="mt-1.5 text-sm text-muted-foreground">
        Need help managing your turf or a booking? Reach out below.
      </p>

      <div className="mt-5 space-y-3">
        {/* WhatsApp */}
        <a
          href="https://wa.me/910000000000"
          target="_blank"
          rel="noreferrer"
          className="card-surface flex items-center gap-3 p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
            <MessageCircle className="size-5" />
          </span>

          <div>
            <p className="text-sm font-semibold">WhatsApp us</p>
            <p className="text-xs text-muted-foreground">
              Fastest response, 9 AM – 9 PM
            </p>
          </div>
        </a>

        {/* Phone */}
        <a
          href="tel:+910000000000"
          className="card-surface flex items-center gap-3 p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Phone className="size-5" />
          </span>

          <div>
            <p className="text-sm font-semibold">Call support</p>
            <p className="text-xs text-muted-foreground">
              +91 00000 00000
            </p>
          </div>
        </a>

        {/* Email */}
        <a
          href="mailto:support@turfbook.app"
          className="card-surface flex items-center gap-3 p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Mail className="size-5" />
          </span>

          <div>
            <p className="text-sm font-semibold">Email us</p>
            <p className="text-xs text-muted-foreground">
              support@turfbook.app
            </p>
          </div>
        </a>
      </div>

      <h2 className="mt-7 text-xl font-display leading-none">FAQs</h2>

      <div className="mt-3 space-y-2">
        {FAQS.map((item) => (
          <details key={item.q} className="card-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              {item.q}
            </summary>

            <p className="mt-2 text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}