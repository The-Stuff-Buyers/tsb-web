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

// ── Types ──────────────────────────────────────────────────────────

type ContactState = {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
  website: string;
  industry_type: string;
};

type ItemState = {
  active: boolean;
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

const CONTACT_FIELDS = ["email", "contact_name", "phone", "company_name", "website", "industry_type"];

function emptyItem(active = false): ItemState {
  return {
    active,
    item_name: "",
    description: "",
    condition: "",
    quantity: "",
    product_category: "",
    location: "",
    upc: "",
    no_upc: false,
    seller_estimated_value: "",
  };
}

function initialItems(): Record<number, ItemState> {
  const result: Record<number, ItemState> = {};
  for (let i = 0; i < 10; i++) {
    result[i] = emptyItem(i === 0);
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────

export default function IntakeForm() {
  const [contact, setContact] = useState<ContactState>({
    contact_name: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    industry_type: "",
  });
  const [items, setItems] = useState<Record<number, ItemState>>(() => initialItems());
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [warnings, setWarnings] = useState<Record<number, Record<string, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [globalError, setGlobalError] = useState("");

  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // ── Error helpers ──────────────────────────────────────────────

  function clearError(tabIdx: number, field: string) {
    setErrors((prev) => {
      if (!prev[tabIdx]?.[field]) return prev;
      const tabErrors = { ...prev[tabIdx] };
      delete tabErrors[field];
      return { ...prev, [tabIdx]: tabErrors };
    });
  }

  // ── Change handlers ────────────────────────────────────────────

  function handleContactChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setContact((prev) => ({ ...prev, [name]: value }));
    // Contact errors live in errors[0]
    clearError(0, name);
  }

  function handleItemChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target as HTMLInputElement;
    const { name } = target;

    if (target.type === "checkbox") {
      const checked = target.checked;
      setItems((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          [name]: checked,
          ...(name === "no_upc" && checked ? { upc: "" } : {}),
        },
      }));
    } else {
      setItems((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], [name]: target.value },
      }));
    }

    clearError(activeTab, name);
  }

  // ── Tab management ─────────────────────────────────────────────

  function handleTabClick(tabIdx: number) {
    if (!items[tabIdx].active) {
      // Activate: clone ALL editable fields from Tab 0
      setItems((prev) => ({
        ...prev,
        [tabIdx]: { ...prev[0], active: true },
      }));
    }
    setActiveTab(tabIdx);
  }

  function handleDeactivateTab(tabIdx: number) {
    if (tabIdx === 0) return;
    setItems((prev) => ({
      ...prev,
      [tabIdx]: emptyItem(false),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[tabIdx];
      return next;
    });
    if (activeTab === tabIdx) setActiveTab(0);
  }

  // ── Scroll helper ──────────────────────────────────────────────

  function scrollToFirstError(tabErrors: Record<string, string>) {
    const firstField = Object.keys(tabErrors)[0];
    if (!firstField) return;
    const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  // ── Submit ─────────────────────────────────────────────────────

  async function handleSubmit() {
    if (submitBtnRef.current) submitBtnRef.current.disabled = true;
    setGlobalError("");

    if (honeypotRef.current?.value) {
      setStatus("success");
      return;
    }

    // Collect active tabs in order
    const activeTabs = Object.keys(items)
      .map(Number)
      .filter((i) => items[i].active)
      .sort((a, b) => a - b);

    // Validate all active tabs
    const newErrors: Record<number, Record<string, string>> = {};
    const newWarnings: Record<number, Record<string, string>> = {};

    for (const tabIdx of activeTabs) {
      const itemData = items[tabIdx];
      const merged: Record<string, unknown> = {
        ...contact,
        item_name: itemData.item_name,
        description: itemData.description,
        condition: itemData.condition,
        quantity: itemData.quantity ? parseInt(itemData.quantity, 10) : itemData.quantity,
        product_category: itemData.product_category,
        location: itemData.location,
        upc: itemData.upc,
        no_upc: itemData.no_upc,
        seller_estimated_value: itemData.seller_estimated_value,
      };

      const result = validateSubmission(merged);

      if (!result.valid) {
        for (const err of result.errors) {
          if (CONTACT_FIELDS.includes(err.field)) {
            // Contact errors always go into Tab 0 (where they're editable)
            if (!newErrors[0]) newErrors[0] = {};
            newErrors[0][err.field] = err.message;
          } else {
            if (!newErrors[tabIdx]) newErrors[tabIdx] = {};
            newErrors[tabIdx][err.field] = err.message;
          }
        }
      }

      if (result.warnings.length > 0) {
        newWarnings[tabIdx] = {};
        for (const warn of result.warnings) {
          newWarnings[tabIdx][warn.field] = warn.message;
        }
      }
    }

    setWarnings(newWarnings);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatus("idle");
      if (submitBtnRef.current) submitBtnRef.current.disabled = false;
      const firstErroredTab = Math.min(...Object.keys(newErrors).map(Number));
      setActiveTab(firstErroredTab);
      setTimeout(() => scrollToFirstError(newErrors[firstErroredTab] || {}), 50);
      return;
    }

    setStatus("submitting");

    try {
      let payload: Record<string, unknown>;

      if (activeTabs.length === 1) {
        // Single-item flat payload — backward compatible
        const itemData = items[0];
        const quantityInt = itemData.quantity ? parseInt(itemData.quantity, 10) : NaN;
        payload = {
          ...contact,
          item_name: itemData.item_name,
          description: itemData.description,
          condition: itemData.condition,
          quantity: isNaN(quantityInt) ? itemData.quantity : quantityInt,
          product_category: itemData.product_category,
          location: itemData.location,
          upc: itemData.upc,
          no_upc: itemData.no_upc,
          seller_estimated_value: itemData.seller_estimated_value,
        };
      } else {
        // Multi-item payload
        payload = {
          ...contact,
          items: activeTabs.map((tabIdx) => {
            const d = items[tabIdx];
            return {
              item_name: d.item_name,
              description: d.description,
              condition: d.condition,
              quantity: parseInt(d.quantity, 10) || 0,
              product_category: d.product_category,
              location: d.location,
              upc: d.upc,
              no_upc: d.no_upc,
              seller_estimated_value: d.seller_estimated_value,
            };
          }),
        };
      }

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
        if (data.itemErrors) {
          // Multi-item server errors — map item indices back to tab indices
          const serverErrors: Record<number, Record<string, string>> = {};
          for (const [itemIdxStr, errs] of Object.entries(
            data.itemErrors as Record<string, Record<string, string>>
          )) {
            const itemIdx = parseInt(itemIdxStr);
            const tabIdx = activeTabs[itemIdx];
            if (tabIdx !== undefined) {
              serverErrors[tabIdx] = errs as Record<string, string>;
            }
          }
          setErrors(serverErrors);
          setStatus("idle");
          if (submitBtnRef.current) submitBtnRef.current.disabled = false;
          const firstErroredTab = Math.min(...Object.keys(serverErrors).map(Number));
          setActiveTab(firstErroredTab);
          scrollToFirstError(serverErrors[firstErroredTab] || {});
        } else if (data.fieldErrors) {
          setErrors({ 0: data.fieldErrors as Record<string, string> });
          setStatus("idle");
          if (submitBtnRef.current) submitBtnRef.current.disabled = false;
          setActiveTab(0);
          scrollToFirstError(data.fieldErrors as Record<string, string>);
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

  // ── Success screen ─────────────────────────────────────────────

  if (status === "success") {
    return (
      <div className="py-12">
        <p className="text-brand-gold text-2xl font-bold mb-2">Received.</p>
        <p className="text-brand-gray text-base">
          We&apos;ll be in touch within 24–48 hours.
        </p>
      </div>
    );
  }

  // ── Style helpers ──────────────────────────────────────────────

  const inputBase =
    "w-full bg-brand-input text-brand-white border rounded-lg px-4 py-3 placeholder:text-brand-gray/50 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-colors text-sm";
  const labelClass = "block text-brand-gray text-sm font-medium mb-1";
  const readonlyInputCls =
    "w-full bg-brand-input text-brand-gray border border-brand-card rounded-lg px-4 py-3 text-sm opacity-50 cursor-not-allowed";
  const sectionLabel =
    "text-brand-gold font-semibold text-sm uppercase tracking-wider mb-4";

  const currentErrors = errors[activeTab] || {};
  const currentWarnings = warnings[activeTab] || {};
  // Contact errors always live in errors[0]
  const contactErrors = errors[0] || {};
  const isLocked = activeTab > 0;

  function fieldCls(name: string, isContact = false): string {
    const errs = isContact ? contactErrors : currentErrors;
    if (errs[name]) return inputBase + " border-brand-error focus:border-brand-error focus:ring-brand-error";
    if (currentWarnings[name]) return inputBase + " border-brand-warn";
    return inputBase + " border-brand-card";
  }

  function FieldError({ name, isContact = false }: { name: string; isContact?: boolean }) {
    const errs = isContact ? contactErrors : currentErrors;
    if (!errs[name]) return null;
    return (
      <p className="text-brand-error text-xs mt-1" aria-live="polite">
        {errs[name]}
      </p>
    );
  }

  function FieldWarning({ name }: { name: string }) {
    if (!currentWarnings[name]) return null;
    return (
      <p className="text-brand-warn text-xs mt-1" aria-live="polite">
        {currentWarnings[name]}
      </p>
    );
  }

  const currentItem = items[activeTab];

  // ── Render ─────────────────────────────────────────────────────

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

        {isLocked ? (
          // Readonly contact fields on Tabs 2–10
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Contact Name <span className="text-brand-gold ml-1">*</span>
                </label>
                <input type="text" value={contact.contact_name} readOnly className={readonlyInputCls} />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-brand-gold ml-1">*</span>
                </label>
                <input type="text" value={contact.email} readOnly className={readonlyInputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="text" value={contact.phone} readOnly className={readonlyInputCls} />
              </div>
              <div>
                <label className={labelClass}>Company Name</label>
                <input type="text" value={contact.company_name} readOnly className={readonlyInputCls} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Company Website</label>
              <input type="text" value={contact.website} readOnly className={readonlyInputCls} />
            </div>
            <div className="mt-4">
              <label className={labelClass}>Your Industry</label>
              <input type="text" value={contact.industry_type} readOnly className={readonlyInputCls} />
            </div>
          </div>
        ) : (
          // Editable contact fields on Tab 1
          <div>
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
                  value={contact.contact_name}
                  onChange={handleContactChange}
                  placeholder="Jane Smith"
                  className={fieldCls("contact_name", true)}
                />
                <FieldError name="contact_name" isContact />
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
                  value={contact.email}
                  onChange={handleContactChange}
                  placeholder="you@company.com"
                  className={fieldCls("email", true)}
                />
                <FieldError name="email" isContact />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={contact.phone}
                  onChange={handleContactChange}
                  placeholder="(555) 000-0000"
                  className={fieldCls("phone", true)}
                />
                <FieldError name="phone" isContact />
              </div>
              <div>
                <label htmlFor="company_name" className={labelClass}>Company Name</label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  maxLength={MAX_LENGTHS.company_name}
                  value={contact.company_name}
                  onChange={handleContactChange}
                  placeholder="Acme Corp"
                  className={fieldCls("company_name", true)}
                />
                <FieldError name="company_name" isContact />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="website" className={labelClass}>Company Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={contact.website}
                onChange={handleContactChange}
                placeholder="example.com"
                className={fieldCls("website", true)}
              />
              <FieldError name="website" isContact />
            </div>

            <div className="mt-4">
              <label htmlFor="industry_type" className={labelClass}>Your Industry</label>
              <select
                id="industry_type"
                name="industry_type"
                value={contact.industry_type}
                onChange={handleContactChange}
                className={fieldCls("industry_type", true)}
              >
                <option value="">Select your industry (optional)</option>
                {INDUSTRY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <FieldError name="industry_type" isContact />
            </div>
          </div>
        )}
      </div>

      {/* ── YOUR INVENTORY ── */}
      <div className="mb-2">
        <p className={sectionLabel}>Your Inventory</p>

        {/* Tab strip */}
        <div
          className="flex overflow-x-auto gap-1 py-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const isActivated = items[i].active;
            const isCurrent = activeTab === i;
            const hasTabErrors =
              errors[i] && Object.keys(errors[i]).length > 0;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleTabClick(i)}
                className={[
                  "relative flex items-center gap-1 min-w-[36px] h-9 px-3 rounded-md text-sm font-bold flex-shrink-0 transition-all",
                  isCurrent
                    ? "border-2 border-brand-gold text-brand-gold"
                    : isActivated
                    ? "border border-brand-gold/60 text-brand-gold/80"
                    : "border border-brand-card text-brand-gray opacity-40",
                ].join(" ")}
              >
                {hasTabErrors && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-brand-bg" />
                )}
                <span>{i + 1}</span>
                {isActivated && i > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeactivateTab(i);
                    }}
                    className="text-brand-gray/50 hover:text-brand-error text-xs ml-0.5 leading-none cursor-pointer"
                    aria-label={`Remove item ${i + 1}`}
                  >
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Email helper line */}
        <p className="text-brand-gold text-sm mt-1 mb-6">
          Feel free to email requested items to quotes@thestuffbuyers.com — for
          requests of more than 10 items, please allow additional time for quote
          processing.
        </p>
      </div>

      {/* ── Item fields for current tab ── */}
      <div className="mb-8">
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
            value={currentItem.item_name}
            onChange={handleItemChange}
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
            value={currentItem.description}
            onChange={handleItemChange}
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
              value={currentItem.condition}
              onChange={handleItemChange}
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
              value={currentItem.quantity}
              onChange={handleItemChange}
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
              value={currentItem.product_category}
              onChange={handleItemChange}
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
              value={currentItem.location}
              onChange={handleItemChange}
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
            value={currentItem.upc}
            onChange={handleItemChange}
            disabled={currentItem.no_upc}
            placeholder="012345678901"
            className={
              fieldCls("upc") +
              (currentItem.no_upc ? " opacity-40 cursor-not-allowed" : "")
            }
          />
          <p className="text-brand-gray/60 text-xs mt-1">
            Numbers only — e.g. 012345678901
          </p>
          <FieldError name="upc" />
          <FieldWarning name="upc" />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              name="no_upc"
              checked={currentItem.no_upc}
              onChange={handleItemChange}
              className="accent-brand-gold w-4 h-4"
            />
            <span className="text-brand-gray text-sm">
              I don&apos;t have a UPC
            </span>
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
            value={currentItem.seller_estimated_value}
            onChange={handleItemChange}
            placeholder="$0.00"
            className={fieldCls("seller_estimated_value")}
          />
          <FieldError name="seller_estimated_value" />
        </div>
      </div>

      {status === "error" && globalError && (
        <p className="text-brand-error text-sm" aria-live="polite">
          {globalError}
        </p>
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
