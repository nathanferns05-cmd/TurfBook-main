import { Button } from "@/components/ui/button"; 
import { createFileRoute, useNavigate } from "@tanstack/react-router"; 
import { ShieldCheck, User } from "lucide-react"; 
import { useEffect, useState } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import logo from '../assets/logo.jpg'; 

if (typeof document !== "undefined") {
  const fontId = "google-font-anton";
  if (!document.getElementById(fontId)) {
    const link = document.createElement("link");
    link.id = fontId;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
    document.head.appendChild(link);
  }
}

export const Route = createFileRoute("/")({ 
  head: () => ({ 
    meta: [ 
      { title: "TurfBook — Book Cricket, Football & Badminton Turfs" }, 
      { 
        name: "description", 
        content: 
          "Choose Player to book turf slots near your Locality, or Admin to list and manage your own turf, pricing and reservations.", 
      }, 
      { property: "og:title", content: "TurfBook — Book Cricket, Football & Badminton Turfs" }, 
      { 
        property: "og:description", 
        content: 
          "Choose Player to book turf slots near your Locality, or Admin to list and manage your own turf, pricing and reservations.", 
      }, 
    ], 
  }), 
  component: Landing, 
}); 

function Landing() { 
  const navigate = useNavigate(); 
  const [checking, setChecking] = useState(true); 

  useEffect(() => { 
    let cancelled = false; 
    (async () => { 
      const { data } = await supabase.auth.getSession(); 
      const uid = data.session?.user?.id; 
      if (cancelled) return; 
      if (!uid) { 
        setChecking(false); 
        return; 
      } 
      const { data: roleRow } = await supabase 
        .from("user_roles") 
        .select("role") 
        .eq("user_id", uid) 
        .maybeSingle(); 
      if (cancelled) return; 
      navigate({ to: roleRow?.role === "admin" ? "/admin" : "/player", replace: true }); 
    })(); 
    return () => { 
      cancelled = true; 
    }; 
  }, [navigate]); 

  if (checking) { 
    return <main className="min-h-screen bg-background" aria-hidden />; 
  } 

  return ( 
    <main className="flex min-h-screen flex-col justify-between px-6 pb-10 pt-16"> 
      <header className="text-center"> 
        <div className="glow mx-auto flex size-28 items-center justify-center overflow-hidden rounded-3xl"> 
          <img 
            src={logo} 
            alt="TurfBook logo" 
            className="size-full object-cover" 
          /> 
        </div>

        {/* REDUCED TITLE FONT SIZE */}
        <h1 
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }} 
          className="mt-5 text-4xl md:text-5xl leading-none text-primary tracking-tight"
        >
          TurfBook
        </h1> 
        <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground"> 
          Mumbai's western line turf booking — cricket, football, badminton and 8 ball pool. 
        </p> 
      </header> 

      <section className="mt-10 space-y-4"> 
        <p className="text-center text-sm font-semibold text-muted-foreground"> 
          Continue as
        </p> 

        {/* REDUCED PLAYER LABEL FONT SIZE */}
        <button 
          onClick={() => navigate({ to: "/auth", search: { role: "player", mode: "signin" } })} 
          className="card-surface w-full p-4 text-left transition-transform active:scale-[0.98]" 
        > 
          <div className="flex items-center gap-4"> 
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"> 
              <User className="size-5" /> 
            </span> 
            <span className="flex-1"> 
              <span 
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }} 
                className="block text-xl leading-none text-foreground tracking-tight mb-1"
              >
                Player
              </span> 
              <span className="block text-xs text-muted-foreground"> 
                Find turfs, check live slots and book 
              </span> 
            </span> 
          </div> 
        </button> 

        {/* REDUCED ADMIN LABEL FONT SIZE */}
        <button 
          onClick={() => navigate({ to: "/auth", search: { role: "admin", mode: "signin" } })} 
          className="card-surface w-full p-4 text-left transition-transform active:scale-[0.98]" 
        > 
          <div className="flex items-center gap-4"> 
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/30 text-accent-foreground"> 
              <ShieldCheck className="size-5" /> 
            </span> 
            <span className="flex-1"> 
              <span 
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }} 
                className="block text-xl leading-none text-foreground tracking-tight mb-1"
              >
                Admin
              </span> 
              <span className="block text-xs text-muted-foreground"> 
                Turf owners — needs an admin code 
              </span> 
            </span> 
          </div> 
        </button> 
      </section> 

      <footer className="mt-10 text-center"> 
        <Button 
          variant="ghost" 
          className="text-xs text-muted-foreground" 
          onClick={() => navigate({ to: "/auth", search: { role: "player", mode: "signup" } })} 
        > 
          New here? Create an account 
        </Button> 
      </footer> 
    </main> 
  ); 
}