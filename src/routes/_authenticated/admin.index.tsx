import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TurfImage } from "@/components/TurfImage";
import { useAuthUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { AMENITIES, LOCATIONS, SPORTS, rupees } from "@/lib/turf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminTurfs,
});

type TurfRow = {
  id: string;
  name: string;
  sport: string;
  location: string;
  address: string | null;
  description: string | null;
  price_per_hour: number;
  evening_price: number | null;
  evening_start_hour: number | null;
  advance_percent: number;
  open_hour: number;
  close_hour: number;
  upi_id: string | null;
  payee_name: string | null;
  image_url: string | null;
  amenities: string[] | null;
  is_active: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2, "Turf name is required").max(80),
  sport: z.string().min(1),
  location: z.string().min(1),
  address: z.string().trim().max(200).optional(),
  description: z.string().trim().max(400).optional(),
  price_per_hour: z.coerce.number().min(1, "Day price is mandatory").max(100000),
  evening_price: z.coerce.number().min(1, "Evening price is mandatory").max(100000),
  evening_start_hour: z.coerce.number().int().min(1, "Evening start must be 1-23").max(23, "Evening start must be 1-23"),
  advance_percent: z.coerce.number().min(1, "Advance % is mandatory").max(100),
  open_hour: z.coerce.number().min(0).max(23),
  close_hour: z.coerce.number().min(1).max(24),
  upi_id: z.string().trim().min(3, "UPI id is required so payments reach you").max(80),
  payee_name: z.string().trim().max(80).optional(),
}).refine((v) => v.close_hour <= v.open_hour || (v.evening_start_hour > v.open_hour && v.evening_start_hour < v.close_hour), {
  message: "Evening pricing must start after opening time and before closing time",
  path: ["evening_start_hour"],
});

function AdminTurfs() {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TurfRow | "new" | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [existingPhoto, setExistingPhoto] = useState<string>("");
  const [amenities, setAmenities] = useState<string[]>([]);

  const openForm = (target: TurfRow | "new") => {
    setEditing(target);
    setPhotoFile(null);
    setPhotoPreview("");
    setExistingPhoto(target === "new" ? "" : (target.image_url ?? ""));
    setAmenities(target === "new" ? [] : (target.amenities ?? []));
  };

  const { data: turfs, isLoading } = useQuery({
    queryKey: ["admin-turfs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turfs")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TurfRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = schema.parse(Object.fromEntries(form));
      if (!photoFile && !existingPhoto) {
        throw new Error("Turf ka photo dalna zaroori hai");
      }
      if (amenities.length === 0) {
        throw new Error("Kam se kam ek amenity select karo");
      }

      let imagePath = existingPhoto;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("turf-photos")
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const payload = {
        ...parsed,
        owner_id: user!.id,
        image_url: imagePath,
        amenities,
      };
      if (editing && editing !== "new") {
        const { error } = await supabase.from("turfs").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("turfs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Turf saved");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-turfs"] });
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof Error
            ? error.message
            : "Could not save turf";
      toast.error(msg);
    },
  });

  const toggle = useMutation({
    mutationFn: async (turf: TurfRow) => {
      const { error } = await supabase
        .from("turfs")
        .update({ is_active: !turf.is_active })
        .eq("id", turf.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-turfs"] }),
  });

  const remove = useMutation({
    mutationFn: async (turf: TurfRow) => {
      const { error } = await supabase.from("turfs").delete().eq("id", turf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Turf deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-turfs"] });
    },
    onError: (error: Error) =>
      toast.error(
        /foreign key|violates/i.test(error.message)
          ? "This turf has bookings, so it can't be deleted. Close bookings instead."
          : error.message,
      ),
  });

  return (
    <main className="px-4 py-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl leading-none">MY TURFS</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Add your turf, pricing, timings and UPI id.
          </p>
        </div>
        <Button size="sm" onClick={() => openForm("new")}>
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !turfs?.length && (
          <div className="card-surface p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No turf added yet. Tap Add to list your first turf.
            </p>
          </div>
        )}
        {turfs?.map((turf) => (
          <div key={turf.id} className="card-surface space-y-2 overflow-hidden p-0">
            <TurfImage path={turf.image_url} alt={turf.name} className="h-32 w-full object-cover" />
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl leading-none">{turf.name}</h2>
                  <p className="text-xs capitalize text-muted-foreground">
                    {turf.sport} · {turf.location}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openForm(turf)}>
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Delete turf">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-2xl">
                          DELETE {turf.name.toUpperCase()}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the turf permanently. Players will no longer see it or its
                          slots. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep turf</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(turf)}>
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {rupees(Number(turf.price_per_hour))} day
                  {turf.evening_price != null && ` · ${rupees(Number(turf.evening_price))} evening`}
                </span>
                <span>{turf.advance_percent}% advance</span>
                <span>
                  {turf.open_hour}:00 – {turf.close_hour}:00
                </span>
                <span>UPI: {turf.upi_id || "not set"}</span>
              </div>
              {!!turf.amenities?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {turf.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => toggle.mutate(turf)}
              >
                {turf.is_active ? "Close bookings (hide turf)" : "Open bookings (show turf)"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {editing === "new" ? "ADD TURF" : "EDIT TURF"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Turf photo (mandatory)
                </span>
                <label className="mt-1 flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-background">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Turf preview" className="size-full object-cover" />
                  ) : existingPhoto ? (
                    <TurfImage
                      path={existingPhoto}
                      alt="Turf photo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                      <ImagePlus className="size-6" />
                      Tap to upload turf photo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Photo 5MB se chhoti honi chahiye");
                        return;
                      }
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Amenities (mandatory)
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {AMENITIES.map((a) => {
                    const on = amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setAmenities((prev) =>
                            prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Turf name" name="name" defaultValue={row(editing, "name")} required />

              <div className="grid grid-cols-2 gap-3">
                <Select label="Sport" name="sport" defaultValue={row(editing, "sport")}>
                  {SPORTS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select label="Station" name="location" defaultValue={row(editing, "location")}>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <Field label="Address" name="address" defaultValue={row(editing, "address")} />
              <Field
                label="Short description"
                name="description"
                defaultValue={row(editing, "description")}
              />
              <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                <p className="text-sm font-semibold">Slot pricing</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Day price applies from opening time until the evening start hour. Evening price applies from then until closing.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field
                    label="Day price per slot (₹)"
                    name="price_per_hour"
                    type="number"
                    defaultValue={row(editing, "price_per_hour")}
                    required
                  />
                  <Field
                    label="Evening price per slot (₹)"
                    name="evening_price"
                    type="number"
                    defaultValue={row(editing, "evening_price") || row(editing, "price_per_hour")}
                    required
                  />
                </div>
                <div className="mt-3">
                  <Field
                    label="Evening pricing starts at (hour, 24h — 16 = 4 PM)"
                    name="evening_start_hour"
                    type="number"
                    defaultValue={row(editing, "evening_start_hour") || "16"}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Advance %"
                  name="advance_percent"
                  type="number"
                  defaultValue={row(editing, "advance_percent") || "50"}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Open hour (0-23)"
                  name="open_hour"
                  type="number"
                  defaultValue={row(editing, "open_hour") || "6"}
                  required
                />
                <Field
                  label="Close hour (1-24)"
                  name="close_hour"
                  type="number"
                  defaultValue={row(editing, "close_hour") || "23"}
                  required
                />
              </div>
              <Field
                label="Your UPI id (payments come here)"
                name="upi_id"
                defaultValue={row(editing, "upi_id")}
                required
              />
              <Field
                label="Payee name on UPI"
                name="payee_name"
                defaultValue={row(editing, "payee_name")}
              />
            </div>

            <Button type="submit" className="mt-5 h-12 w-full text-base" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save turf"}
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}

function row(editing: TurfRow | "new", key: keyof TurfRow) {
  if (editing === "new") return "";
  const value = editing[key];
  return value === null || value === undefined ? "" : String(value);
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue || undefined}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}