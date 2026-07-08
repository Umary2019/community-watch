import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImgIcon, Video } from "lucide-react";
import { toast } from "sonner";

export interface UploadedFile {
  url: string;
  path: string;
  type: "image" | "video" | "document";
  name: string;
}

interface Props {
  userId: string;
  value: UploadedFile[];
  onChange: (v: UploadedFile[]) => void;
  max?: number;
}

function detectType(f: File): "image" | "video" | "document" {
  if (f.type.startsWith("image/")) return "image";
  if (f.type.startsWith("video/")) return "video";
  return "document";
}

export function EvidenceUpload({ userId, value, onChange, max = 8 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || !files.length) return;
    if (value.length + files.length > max)
      return toast.error(`Maximum ${max} files`);
    setBusy(true);
    const out: UploadedFile[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 25MB`);
        continue;
      }
      const path = `${userId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("evidence").upload(path, f, {
        upsert: false,
        contentType: f.type,
      });
      if (error) {
        toast.error(`Failed: ${f.name} — ${error.message}`);
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("evidence")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      out.push({
        url: signed?.signedUrl ?? "",
        path,
        type: detectType(f),
        name: f.name,
      });
    }
    onChange([...value, ...out]);
    setBusy(false);
    if (out.length) toast.success(`${out.length} file(s) uploaded`);
  }

  async function remove(idx: number) {
    const item = value[idx];
    await supabase.storage.from("evidence").remove([item.path]);
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*"
        onChange={(e) => handle(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy || value.length >= max}
        className="gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload evidence
      </Button>
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {value.map((f, i) => (
            <div
              key={f.path}
              className="relative aspect-square rounded-md border border-border overflow-hidden bg-muted"
            >
              {f.type === "image" ? (
                <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
              ) : f.type === "video" ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs p-2">
                  <Video className="h-6 w-6 mb-1" />
                  {f.name}
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs p-2">
                  <ImgIcon className="h-6 w-6 mb-1" />
                  {f.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}