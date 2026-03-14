"use client";

import { useState, useRef } from "react";
import {
  validateSubmission,
  CONDITIONS,
  INDUSTRY_TYPES,
  MAX_LENGTHS,
} from "@/lib/validation";

// Display name → slug mapping per Appendix B
const CATEGORIES: { label: string; slug: string }[] = [
  { label: "Electronics", slug: "electronics" },
  { label: "Furniture & Home", slug: "furniture" },
  { label: "Apparel & Accessories", slug: "apparel" },
  { label: "Toys & Games", slug: "toys_games" },
  { label: "Sporting Goods", slug: "sporting_goods" },
  { label: "Tools & Hardware", slug: "tools_hardware" },
  { label: "Health & Beauty", slug: "health_beauty" },
  { label: "Food & Beverage", slug: "food_beverage" },
  { label: "Automotive", slug: "automotive" },
  { label: "Industrial & Commercial", slug: "industrial" },
  { label: "General Merchandise", slug: "general_merchandise" },
  { label: "Other / Uncategorized", slug: "other" },
];

type FormState = {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
  website: string;
  industry_type: string;
  item_name: string;
  description: string;
  condition: string;
  quantity: string;
  product_category: string;
  location: string;
  upc: string;
  no_upc: boolean;
  seller_estimated_value: string;
};

type FieldErrors = Record<string, string>;
type FieldWarnings = Record<string, string>;

export default function IntakeForm() {
  const [form, setForm] = useState<FormState>({
    contact_name: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    industry_type: "",
    item_name: "",
    description: "",
    condition: "",
    quantity: "",
    product_category: "",
    location: "",
    upc: "",
    no_upc: false,
    seller_estimated_value: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fieldWarnings, setFieldWarnings] = useState<FieldWarnings>({});

  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target as HTMLInputElement;
    const name = target.name;

    if (target.type === "checkbox") {
      const checked = target.checked;
      setForm((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === "no_upc" && checked ? { upc: "" } : {}),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: target.value }));
    }

    clearFieldError(name);
  }

  function scrollToFirstError(errors: FieldErrors) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  async function handleSubmit() {
    if (submitBtnRef.current) submitBtnRef.current.disabled = true;

    setGlobalError("");
    setFieldErrors({});
    setFieldWarnings({});

    // Honeypot check — if populated, silently succeed
    if (honeypotRef.current?.value) {
      setStatus("success");
      return;
    }

    const quantityInt = form.quantity ? parseInt(form.quantity, 10) : NaN;

    const payload: Record<string, unknown> = {
      ...form,
      quantity: isNaN(quantityInt) ? form.quantity : quantityInt,
    };

    const result = validateSubmission(payload);

    if (!result.valid) {
      const errors: FieldErrors = {};
      for (const err of result.errors) {
        errors[err.field] = err.message;
      }
      const warnings: FieldWarnings = {};
      for (const warn of result.warnings) {
        warnings[warn.field] = warn.message;
      }
      setFieldErrors(errors);
      setFieldWarnings(warnings);
      setStatus("idle");
      if (submitBtnRef.current) submitBtnRef.current.disabled = false;
      scrollToFirstError(errors);
      return;
    }

    if (result.warnings.length > 0) {
      const warnings: FieldWarnings = {};
      for (const warn of result.warnings) {
        warnings[warn.field] = warn.message;
      }
      setFieldWarnings(warnings);
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 429) {
        setGlobalError(data.error || "Too many submissions. Please try again later.");
        setStatus("error");
        if (submitBtnRef.current) submitBtnRef.current.disabled = false;
        return;
      }

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors as FieldErrors);
          setStatus("idle");
          if (submitBtnRef.current) submitBtnRef.current.disabled = false;
          scrollToFirstError(data.fieldErrors as FieldErrors);
        } else {
          setGlobalError(data.error || "Submission failed. Please try again.");
          setStatus("error");
          if (submitBtnRef.current) submitBtnRef.current.disabled = false;
        }
        return;
      }

      setStatus("success");
    } catch {
      setGlobalError("Network error. Please check your connection and try again.");
      setStatus("error");
      if (submitBtnRef.current) submitBtnRef.current.disabled = false;
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12">
        <p className="text-brand-gold text-2xl font-bold mb-2">Received.</p>
        <p className="text-brand-gray text-base">
          We&apos;ll be in touch within 24–48 hours.
        </p>
      </div>
    );
  }

  const inputBase =
    "w-full bg-brand-input text-brand-white border rounded-lg px-4 py-3 placeholder:text-brand-gray/50 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-colors text-sm";
  const labelClass = "block text-brand-gray text-sm font-medium mb-1";

  function fieldCls(name: string): string {
    if (fieldErrors[name]) return inputBase + " border-brand-error focus:border-brand-error focus:ring-brand-error";
    if (fieldWarnings[name]) return inputBase + " border-brand-warn";
    return inputBase + " border-brand-card";
  }

  function FieldError({ name }: { name: string }) {
    if (!fieldErrors[name]) return null;
    return (
      <p className="text-brand-error text-xs mt-1" aria-live="polite">
        {fieldErrors[name]}
      </p>
    );
  }

  function FieldWarning({ name }: { name: string }) {
    if (!fieldWarnings[name]) return null;
    return (
      <p className="text-brand-warn text-xs mt-1" aria-live="polite">
        {fieldWarnings[name]}
      </p>
    );
  }

  const sectionLabel = "text-brand-gold font-semibold text-sm uppercase tracking-wider mb-4";

  return (
    <form className="space-y-5">
      {/* Honeypot — hidden from humans, visible to bots */}
      <div style={{ position: "absolute", left: "-9999px", opacity: 0 }}>
        <label htmlFor="company_url">Website URL</label>
        <input
          ref={honeypotRef}
          id="company_url"
          name="company_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* ── YOUR INFO ── */}
      <div className="mb-8">
        <p className={sectionLabel}>Your Info</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_name" className={labelClass}>
              Contact Name <span className="text-brand-gold ml-1">*</span>
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              aria-required="true"
              maxLength={MAX_LENGTHS.contact_name}
              value={form.contact_name}
              onChange={handleChange}
              placeholder="Jane Smith"
              className={fieldCls("contact_name")}
            />
            <FieldError name="contact_name" />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-brand-gold ml-1">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              aria-required="true"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              className={fieldCls("email")}
            />
            <FieldError name="email" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="phone" className={labelClass}>Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="(555) 000-0000"
              className={fieldCls("phone")}
            />
            <FieldError name="phone" />
          </div>
          <div>
            <label htmlFor="company_name" className={labelClass}>Company Name</label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              maxLength={MAX_LENGTHS.company_name}
              value={form.company_name}
              onChange={handleChange}
              placeholder="Acme Corp"
              className={fieldCls("company_name")}
            />
            <FieldError name="company_name" />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="website" className={labelClass}>Company Website</label>
          <input
            id="website"
            name="website"
            type="text"
            value={form.website}
            onChange={handleChange}
            placeholder="example.com"
            className={fieldCls("website")}
          />
          <FieldError name="website" />
        </div>

        <div className="mt-4">
          <label htmlFor="industry_type" className={labelClass}>Your Industry</label>
          <select
            id="industry_type"
            name="industry_type"
            value={form.industry_type}
            onChange={handleChange}
            className={fieldCls("industry_type")}
          >
            <option value="">Select your industry (optional)</option>
            {INDUSTRY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <FieldError name="industry_type" />
        </div>
      </div>

      {/* ── YOUR INVENTORY ── */}
      <div className="mb-8">
        <p className={sectionLabel}>Your Inventory</p>

        <div>
          <label htmlFor="item_name" className={labelClass}>
            What are you selling? <span className="text-brand-gold ml-1">*</span>
          </label>
          <input
            id="item_name"
            name="item_name"
            type="text"
            aria-required="true"
            maxLength={MAX_LENGTHS.item_name}
            value={form.item_name}
            onChange={handleChange}
            placeholder='e.g. Samsung 65" 4K TV'
            className={fieldCls("item_name")}
          />
          <FieldError name="item_name" />
        </div>

        <div className="mt-4">
          <label htmlFor="description" className={labelClass}>Tell us more</label>
          <textarea
            id="description"
            name="description"
            maxLength={MAX_LENGTHS.description}
            value={form.description}
            onChange={handleChange}
            placeholder="Model numbers, condition notes, pallet count, storage details..."
            rows={4}
            className={fieldCls("description") + " resize-none"}
          />
          <FieldError name="description" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="condition" className={labelClass}>
              Condition <span className="text-brand-gold ml-1">*</span>
            </label>
            <select
              id="condition"
              name="condition"
              aria-required="true"
              value={form.condition}
              onChange={handleChange}
              className={fieldCls("condition")}
            >
              <option value="" disabled>Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FieldError name="condition" />
          </div>
          <div>
            <label htmlFor="quantity" className={labelClass}>
              How many? <span className="text-brand-gold ml-1">*</span>
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              aria-required="true"
              min="1"
              step="1"
              value={form.quantity}
              onChange={handleChange}
              placeholder="e.g. 500"
              className={fieldCls("quantity")}
            />
            <FieldError name="quantity" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="product_category" className={labelClass}>
              Product Category <span className="text-brand-gold ml-1">*</span>
            </label>
            <select
              id="product_category"
              name="product_category"
              aria-required="true"
              value={form.product_category}
              onChange={handleChange}
              className={fieldCls("product_category")}
            >
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map(({ label, slug }) => (
                <option key={slug} value={slug}>{label}</option>
              ))}
            </select>
            <FieldError name="product_category" />
          </div>
          <div>
            <label htmlFor="location" className={labelClass}>
              Where is the inventory? <span className="text-brand-gold ml-1">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              aria-required="true"
              value={form.location}
              onChange={handleChange}
              placeholder="City, State ZIP"
              className={fieldCls("location")}
            />
            <FieldError name="location" />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="upc" className={labelClass}>UPC</label>
          <input
            id="upc"
            name="upc"
            type="text"
            value={form.upc}
            onChange={handleChange}
            disabled={form.no_upc}
            placeholder="012345678901"
            className={fieldCls("upc") + (form.no_upc ? " opacity-40 cursor-not-allowed" : "")}
          />
          <p className="text-brand-gray/60 text-xs mt-1">Numbers only — e.g. 012345678901</p>
          <FieldError name="upc" />
          <FieldWarning name="upc" />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              name="no_upc"
              checked={form.no_upc}
              onChange={handleChange}
              className="accent-brand-gold w-4 h-4"
            />
            <span className="text-brand-gray text-sm">I don&apos;t have a UPC</span>
          </label>
        </div>

        <div className="mt-4">
          <label htmlFor="seller_estimated_value" className={labelClass}>
            What do you think it&apos;s worth?
          </label>
          <input
            id="seller_estimated_value"
            name="seller_estimated_value"
            type="text"
            value={form.seller_estimated_value}
            onChange={handleChange}
            placeholder="$0.00"
            className={fieldCls("seller_estimated_value")}
          />
          <FieldError name="seller_estimated_value" />
        </div>

        {/* P3 — File upload placeholder */}
        {/* TODO: Add file upload field here (deal_attachments via Supabase Storage) */}
      </div>

      {status === "error" && globalError && (
        <p className="text-brand-error text-sm" aria-live="polite">{globalError}</p>
      )}

      <button
        ref={submitBtnRef}
        type="button"
        onClick={handleSubmit}
        className="w-full md:w-auto bg-brand-gold text-brand-bg font-bold px-10 py-4 rounded-lg text-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {status === "submitting" ? "Submitting..." : "Get a Quote →"}
      </button>
    </form>
  );
}
