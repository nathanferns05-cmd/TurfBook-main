import { Button } from "@/components/ui/button";
import { useAuthUser, useMyRole } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export function StarRow({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/40"
          }`}
        />
      ))}
    </span>
  );
}

export function TurfReviews({ turfId, ownerId }: { turfId: string; ownerId?: string }) {
  const { data: user } = useAuthUser();
  const { data: role } = useMyRole();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", turfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turf_reviews")
        .select("id, user_id, reviewer_name, rating, comment, created_at, updated_at")
        .eq("turf_id", turfId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const mine = reviews?.find((r) => r.user_id === user?.id);
  const canReview = !!user && role === "player" && user.id !== ownerId;

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
  }, [mine?.id, mine?.rating, mine?.comment]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", turfId] });
    queryClient.invalidateQueries({ queryKey: ["turf-ratings"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (rating < 1) throw new Error("Tap the stars to pick a rating.");
      const body = { rating, comment: comment.trim() || null };
      const { error } = mine
        ? await supabase.from("turf_reviews").update(body).eq("id", mine.id)
        : await supabase.from("turf_reviews").insert({ ...body, turf_id: turfId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(mine ? "Review updated" : "Thanks for your review!");
      setEditing(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("turf_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      setEditing(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const count = reviews?.length ?? 0;
  const avg = count ? reviews!.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  const showForm = canReview && (!mine || editing);

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base font-bold">Ratings & reviews</h2>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="font-bold">{avg.toFixed(1)}</span>
            <StarRow rating={avg} />
            <span className="text-muted-foreground">({count})</span>
          </span>
        )}
      </div>

      {showForm && (
        <div className="card-surface mt-3 space-y-3 p-4">
          <p className="text-sm font-semibold">{mine ? "Edit your review" : "Rate this turf"}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={`size-8 ${
                    n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="How was the turf, lighting, staff? (optional)"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            {mine && (
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mine ? "Update review" : "Post review"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading reviews…</p>}
        {!isLoading && count === 0 && (
          <p className="card-surface p-4 text-center text-sm text-muted-foreground">
            No reviews yet.{canReview ? " Be the first to rate this turf." : ""}
          </p>
        )}
        {reviews?.map((r) => (
          <div key={r.id} className="card-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {r.reviewer_name}
                  {r.user_id === user?.id && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <StarRow rating={r.rating} size="size-3.5" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {r.user_id === user?.id && !editing && (
                <div className="flex gap-3 text-xs">
                  <button className="text-primary" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                  <button
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(r.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
