import badminton from "@/assets/sport-badminton.jpg";
import cricket from "@/assets/sport-cricket.jpg";
import football from "@/assets/sport-football.jpg";
import pool from "@/assets/sport-pool.jpg";
import { createFileRoute, Link } from "@tanstack/react-router";

const SPORTS = [
  { slug: "cricket", name: "Cricket", image: cricket, tagline: "Box turf & nets" },
  { slug: "football", name: "Football", image: football, tagline: "5v5 / 7v7 turf" },
  { slug: "badminton", name: "Badminton", image: badminton, tagline: "Indoor courts" },
  { slug: "pool", name: "8 Ball Pool", image: pool, tagline: "Club tables" },
];

export const Route = createFileRoute("/_authenticated/player/")({
  component: PlayerHome,
});

function PlayerHome() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">PICK YOUR SPORT</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Choose a sport, then your station to see turfs and live slots.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {SPORTS.map((sport) => (
          <Link
            key={sport.slug}
            to="/player/sport/$sport"
            params={{ sport: sport.slug }}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border transition-transform active:scale-[0.97]"
          >
            <img
              src={sport.image}
              alt={`${sport.name} turf`}
              className="absolute inset-0 size-full object-cover"
            />
            {/* Even dim over the whole image (no fade) so the text stays readable */}
            <span className="absolute inset-0 bg-black/35" />
            <span className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
              <span className="block font-display text-2xl leading-none text-white drop-shadow-md">
                {sport.name}
              </span>
              <span className="mt-1.5 block text-[11px] uppercase tracking-wider text-white/90 drop-shadow">
                {sport.tagline}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
