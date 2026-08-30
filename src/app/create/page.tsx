"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getInitData, getTelegramWebApp } from "@/lib/telegramClient";

export default function CreateListingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const initData = getInitData();
      let imageUrl: string | null = null;

      if (file) {
        const fd = new FormData();
        fd.append("initData", initData);
        fd.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);
        imageUrl = uploadData.url;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, name, instagram, website, description, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
      router.push(`/listing/${data.listing.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <h1 className="font-display text-2xl font-extrabold mb-1">🚀 Join BidFame</h1>
      <p className="text-sm text-black/50 mb-6">Create your listing to start competing for #1.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-black/50 mb-1.5">
            Photo / Logo
          </label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-surfacealt overflow-hidden flex items-center justify-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} className="w-full h-full object-cover" alt="preview" />
              ) : (
                <span className="text-2xl">📷</span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
        </div>

        <Field label="Name / Brand Name" value={name} onChange={setName} placeholder="e.g. Acme Coffee Co." required />
        <Field label="Instagram Username" value={instagram} onChange={setInstagram} placeholder="@acmecoffee" required />
        <Field label="Website" value={website} onChange={setWebsite} placeholder="https://acmecoffee.com" />
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-black/50 mb-1.5">
            Short Message
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={200}
            rows={3}
            placeholder="What makes you worth featuring?"
            className="w-full rounded-xl border border-black/10 p-3 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full gold-gradient text-white font-bold py-3.5 rounded-full shadow-lg disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Listing"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-black/50 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-black/10 p-3 text-sm"
      />
    </div>
  );
}
