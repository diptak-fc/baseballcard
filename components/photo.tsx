"use client";

import { useRef, useState } from "react";

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Circular avatar: shows the photo if present, otherwise initials.
export function Avatar({
  name,
  photo,
  size = 48,
  className = "",
}: {
  name: string;
  photo?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.34) };
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        style={style}
        className={`shrink-0 rounded-full border border-surface-line object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
}

// Reads a chosen image file, shrinks it to a small square, returns a data URL.
async function fileToDataUrl(file: File, maxSize = 384): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read the image"));
      i.src = url;
    });
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    const out = Math.min(maxSize, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A small "Upload photo / Remove" control that saves via /api/photo.
export function PhotoControl({
  userId,
  hasPhoto,
  onChanged,
}: {
  userId?: number; // omit = the signed-in user themself
  hasPhoto: boolean;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dataUrl }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error || "Could not save the photo");
      else onChanged();
    } catch {
      setError("Could not read that image — try a JPG or PNG file.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dataUrl: null }),
    });
    setBusy(false);
    onChanged();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        className="text-xs font-semibold text-accent hover:text-accent-soft disabled:opacity-50"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Saving…" : hasPhoto ? "Change photo" : "Upload photo"}
      </button>
      {hasPhoto && !busy && (
        <button
          type="button"
          className="text-xs font-semibold text-ink-muted hover:text-band-critical"
          onClick={remove}
        >
          Remove
        </button>
      )}
      {error && <span className="text-xs text-band-critical">{error}</span>}
    </span>
  );
}
