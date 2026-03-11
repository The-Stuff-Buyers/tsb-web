"use client";

import { useState } from "react";

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];
const CATEGORIES = [
  "Electronics",
  "Apparel",
  "Home Goods",
  "Tools & Hardware",
  "Furniture",
  "Grocery & Perishables",
  "Automotive",
  "Sporting Goods",
  "Toys & Games",
  "Office & Industrial",
  "Mixed",
  "Other",
];

export default function IntakeForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company_name: "",
    contact_name: "",
    phone: "",
    website: "",
    item_name: "",
    description: "",
    condition: "",
    location: "",
    upc: "",
    no_upc: false,
    quantity: "",
    product_category: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target as HTMLInputElement;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity ? parseInt(form.quantity) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Submission failed. Please try again.");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-16">
        <p className="text-brand-gold text-2xl font-semibold">
          ✅ Received. We&apos;ll be in touch within 24–48 hours.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full bg-brand-input text-brand-white border border-brand-card rounded-lg px-4 py-3 placeholder-brand-gray/50 focus:outline-none focus:border-brand-gold transition-colors text-sm";
  const labelClass = "block text-brand-white text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className={labelClass}>Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="company_name" className={labelClass}>Company Name *</label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            value={form.company_name}
            onChange={handleChange}
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact_name" className={labelClass}>Your Name *</label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            required
            value={form.contact_name}
            onChange={handleChange}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="phone" className={labelClass}>Phone Number *</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={form.phone}
            onChange={handleChange}
            placeholder="(555) 000-0000"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="website" className={labelClass}>Website (optional)</label>
          <input
            id="website"
            name="website"
            type="url"
            value={form.website}
            onChange={handleChange}
            placeholder="https://example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="item_name" className={labelClass}>Item Name *</label>
        <input
          id="item_name"
          name="item_name"
          type="text"
          required
          value={form.item_name}
          onChange={handleChange}
          placeholder="e.g. Samsung 65&quot; 4K TV"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>Description *</label>
        <textarea
          id="description"
          name="description"
          required
          value={form.description}
          onChange={handleChange}
          placeholder="As detailed as possible — model numbers, condition notes, pallet count, storage details..."
          rows={4}
          className={inputClass + " resize-none"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="condition" className={labelClass}>Condition *</label>
          <select
            id="condition"
            name="condition"
            required
            value={form.condition}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="" disabled>Select condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location" className={labelClass}>Location *</label>
          <input
            id="location"
            name="location"
            type="text"
            required
            value={form.location}
            onChange={handleChange}
            placeholder="City, State"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="upc" className={labelClass}>UPC</label>
          <input
            id="upc"
            name="upc"
            type="text"
            value={form.upc}
            onChange={handleChange}
            disabled={form.no_upc}
            placeholder="012345678901"
            className={inputClass + (form.no_upc ? " opacity-40 cursor-not-allowed" : "")}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              name="no_upc"
              checked={form.no_upc}
              onChange={handleChange}
              className="accent-brand-gold w-4 h-4"
            />
            <span className="text-brand-gray text-sm">No UPC / Not applicable</span>
          </label>
        </div>
        <div>
          <label htmlFor="quantity" className={labelClass}>Quantity *</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            required
            min="1"
            value={form.quantity}
            onChange={handleChange}
            placeholder="e.g. 500"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="product_category" className={labelClass}>Product Category *</label>
        <select
          id="product_category"
          name="product_category"
          required
          value={form.product_category}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="" disabled>Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-brand-gold text-brand-bg font-semibold py-4 rounded-lg text-base hover:bg-brand-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Submitting..." : "Submit Your Inventory →"}
      </button>
    </form>
  );
}
