"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInitData, getTelegramWebApp } from "@/lib/telegramClient";

export default function EditListingPage() {
  const router = useRouter();
  const [listingId, setListingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    instagram: "",
    website: "",
    description: "",
    imageUrl: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const tg = getTelegramWebApp();
    tg?.ready();
    tg?.BackButton?.show();
    tg?.BackButton?.onClick(() => router.push("/profile"));

    (async () => {
      const initData = getInitData();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const d = await res.json();
      if (d.listing) {
        setListingId(d.listing.id);
        setForm({
          name: d.listing.name || "",
          instagram: d.listing.instagram?.replace("https://instagram.com/", "") || "",
          website: d.listing.website || "",
          description: d.listing.description || "",
          imageUrl: d.listing.imageUrl || "",
        });
        if (d.listing.imageUrl) setPreview(d.listing.imageUrl);
      }
    })();

    return () => tg?.BackButton?.hide();
  }, []);

  function handleFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSave() {
    if (!listingId) return;
    setSaving(true);
    setMessage(null);

    try {
      const initData = getInitData();
      let imageUrl = form.imageUrl;

      // Upload new image if selected
      if (file) {
        const fd = new FormData();
        fd.append("initData", initData);
        fd.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);
        imageUrl = uploadData.url;
      }

      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, ...form, imageUrl }),
      });
      const d = await res.json();

      if (res.ok) {
        setMessage("✅ Saved successfully!");
        setTimeout(() => router.push("/profile"), 1500);
      } else {
        setMessage(d.error || "Failed to save");
      }
    } catch (err: any) {
      setMessage(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <h1 className="font-display text-2xl font-extrabold mb-6">✏️ Edit Listing</h1>

      {/* Image Upload */}
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-black/50 mb-1.5">
          Photo / Logo
        </label>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center">
            {preview ? (
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

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-black/50 block mb-1.5">Name / Brand</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm outline-none"
            placeholder="Your name or brand"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-black/50 block mb-1.5">Instagram</label>
          <div className="flex">
            <span className="border border-r-0 border-black/10 rounded-l-xl px-3 flex items-center text-black/40 text-sm">@</span>
            <input
              value={form.instagram.replace("https://instagram.com/", "")}
              onChange={(e) => setForm({ ...form, instagram: e.target.value.replace("@", "") })}
              className="flex-1 border border-black/10 rounded-r-xl px-4 py-3 text-sm outline-none"
              placeholder="yourhandle"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-black/50 block mb-1.5">Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm outline-none"
            placeholder="https://yoursite.com"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-black/50 block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={200}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm outline-none resize-none"
            placeholder="Tell people who you are..."
          />
        </div>
      </div>

      {message && (
        <p className="text-center text-sm mt-4 font-semibold">{message}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full gold-gradient text-white font-bold py-4 rounded-full shadow-lg text-lg mt-6 disabled:opacity-50"
      >
        {saving ? "Saving…" : "💾 Save Changes"}
      </button>
    </main>
  );
}
