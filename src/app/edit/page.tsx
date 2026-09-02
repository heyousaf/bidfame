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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getTelegramWebApp()?.ready();
    const tg = getTelegramWebApp();
    tg?.BackButton?.show();
    tg?.BackButton?.onClick(() => router.push("/profile"));

    // Load current listing
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
      }
    })();

    return () => {
      tg?.BackButton?.hide();
    };
  }, []);

  async function handleSave() {
    if (!listingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const initData = getInitData();
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, ...form }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage("✅ Saved successfully!");
        setTimeout(() => router.push("/profile"), 1500);
      } else {
        setMessage(d.error || "Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <h1 className="font-display text-2xl font-extrabold mb-6">✏️ Edit Listing</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-black/60 block mb-1">Name / Brand</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-base outline-none focus:border-black/30"
            placeholder="Your name or brand"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-black/60 block mb-1">Instagram Username</label>
          <div className="flex">
            <span className="border border-r-0 border-black/10 rounded-l-xl px-3 flex items-center text-black/40">@</span>
            <input
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value.replace("@", "") })}
              className="flex-1 border border-black/10 rounded-r-xl px-4 py-3 text-base outline-none focus:border-black/30"
              placeholder="yourhandle"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-black/60 block mb-1">Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-base outline-none focus:border-black/30"
            placeholder="https://yoursite.com"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-black/60 block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-base outline-none focus:border-black/30 resize-none"
            placeholder="Tell people who you are..."
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-black/60 block mb-1">Profile Image URL</label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-base outline-none focus:border-black/30"
            placeholder="https://example.com/photo.jpg"
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
