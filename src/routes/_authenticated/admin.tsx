import { roleForCurrentUser, useMyProfile } from "@/hooks/useSession";
import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, Headphones, LayoutGrid, Timer, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    if ((await roleForCurrentUser()) !== "admin") throw redirect({ to: "/player" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { data: profile } = useMyProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItem = (to: string, label: string, Icon: typeof LayoutGrid, exact = false) => {
    const active = exact ? pathname === to : pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="size-5" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg">
        <Link
          to="/admin/profile"
          className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          {(profile?.full_name || "A").charAt(0).toUpperCase()}
        </Link>
        <span className="font-display text-xl text-primary">Turf owner</span>
        <Link
          to="/admin/support"
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"
          aria-label="Customer support"
        >
          <Headphones className="size-5" />
        </Link>
      </header>

      <Outlet />

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        {navItem("/admin", "My Turfs", LayoutGrid, true)}
        {navItem("/admin/slots", "Slots", Timer)}
        {navItem("/admin/bookings", "Bookings", CalendarCheck)}
        {navItem("/admin/profile", "Profile", User)}
      </nav>
    </div>
  );
}