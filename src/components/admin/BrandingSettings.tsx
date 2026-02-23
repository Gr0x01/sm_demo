"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface OrgBranding {
  name: string;
  logo_url: string | null;
  logo_type: "icon" | "wordmark";
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  header_style: "light" | "dark";
  corner_style: "sharp" | "rounded";
}

interface BrandingSettingsProps {
  orgId: string;
  orgSlug: string;
  org: OrgBranding;
}

export function BrandingSettings({ orgId, orgSlug, org }: BrandingSettingsProps) {
  const router = useRouter();
  const [form, setForm] = useState<OrgBranding>(org);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isDirty =
    form.logo_type !== org.logo_type ||
    form.primary_color !== org.primary_color ||
    form.secondary_color !== org.secondary_color ||
    form.accent_color !== org.accent_color ||
    form.header_style !== org.header_style ||
    form.corner_style !== org.corner_style ||
    form.logo_url !== org.logo_url;

  // Track cache-bust timestamp separately from the stored URL
  const [logoBust, setLogoBust] = useState<number | null>(null);
  const logoPreviewUrl = form.logo_url
    ? `${form.logo_url}${logoBust ? `?t=${logoBust}` : ""}`
    : null;

  const handleLogoUpload = async (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setError("Logo must be PNG, JPG, WebP, or SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5MB.");
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowser();
      const ext = file.name.split(".").pop() || "png";
      const newPath = `${orgId}/logo.${ext}`;

      // Delete old logo if extension changed (e.g. switching from .png to .svg)
      if (form.logo_url) {
        const oldPathMatch = form.logo_url.match(/\/rooms\/(.+?)(?:\?|$)/);
        const oldPath = oldPathMatch?.[1];
        if (oldPath && oldPath !== newPath) {
          await supabase.storage.from("rooms").remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("rooms")
        .upload(newPath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("rooms").getPublicUrl(newPath);
      // Store clean URL (no cache-bust param) — bust only for local preview
      setForm((prev) => ({ ...prev, logo_url: publicUrl }));
      setLogoBust(Date.now());
    } catch {
      setError("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          logo_url: form.logo_url,
          logo_type: form.logo_type,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color,
          header_style: form.header_style,
          corner_style: form.corner_style,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="w-32 h-16 border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo" className="max-h-12 max-w-28 object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploadingLogo ? "Uploading..." : "Upload Logo"}
            </button>
          </div>
        </div>
      </section>

      {/* Logo Type */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Logo Type</h3>
        <p className="text-xs text-slate-500 mb-3">
          Wordmark logos include the company name in the image. Icon logos show the name as text.
        </p>
        <div className="flex gap-2">
          {(["icon", "wordmark"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setForm((prev) => ({ ...prev, logo_type: val }))}
              className={`px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                form.logo_type === val
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {val === "icon" ? "Icon + Name" : "Wordmark"}
            </button>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          {([
            { key: "primary_color", label: "Primary" },
            { key: "secondary_color", label: "Secondary" },
            { key: "accent_color", label: "Accent" },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-8 h-8 border border-slate-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      setForm((prev) => ({ ...prev, [key]: v }));
                    }
                  }}
                  className="w-24 px-2 py-1.5 text-xs font-mono border border-slate-300 text-slate-700 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Header Style */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Header Style</h3>
        <p className="text-xs text-slate-500 mb-3">
          Controls the navigation bar appearance on the org landing page.
        </p>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setForm((prev) => ({ ...prev, header_style: val }))}
              className={`px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                form.header_style === val
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {val === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </section>

      {/* Corner Style */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Corner Style</h3>
        <p className="text-xs text-slate-500 mb-3">
          Sharp corners give a clean, editorial look. Rounded softens the interface.
        </p>
        <div className="flex gap-2">
          {(["sharp", "rounded"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setForm((prev) => ({ ...prev, corner_style: val }))}
              className={`px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                form.corner_style === val
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {val === "sharp" ? "Sharp" : "Rounded"}
            </button>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="px-5 py-2.5 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {success && <span className="text-sm text-green-600">Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
