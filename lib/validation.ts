// lib/validation.ts

// ── Constants ──────────────────────────────────────────────────────

export const CONDITIONS = [
  'New', 'Like New', 'Open Box', 'Damaged', 'Mixed', 'Unknown'
] as const;

// Populated at build time from: SELECT slug FROM categories WHERE active = TRUE ORDER BY sort_order
// Fallback hardcoded list for safety (must stay in sync with DB)
export const CATEGORY_SLUGS = [
  'electronics', 'furniture', 'apparel', 'toys_games', 'sporting_goods',
  'tools_hardware', 'health_beauty', 'food_beverage', 'automotive',
  'industrial', 'general_merchandise', 'other'
] as const;

export const INDUSTRY_TYPES = [
  'Retail', 'Wholesale', 'Manufacturing', 'Distribution', 'Other'
] as const;

export const MAX_LENGTHS = {
  contact_name: 200,
  company_name: 500,
  item_name: 500,
  description: 5000,
} as const;

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Strip extension markers and non-digit characters from a phone number.
 * Handles: "555-123-4567 ext 200", "(555) 123-4567 x200", "555.123.4567 #200"
 */
export function normalizePhone(raw: string): string {
  const beforeExt = raw.replace(/\s*(ext\.?|x|#|extension)\s*\d*$/i, '');
  return beforeExt.replace(/\D/g, '');
}

/**
 * Strip spaces and dashes from a UPC string.
 */
export function normalizeUpc(raw: string): string {
  return raw.replace(/[\s\-]/g, '');
}

/**
 * Auto-prefix https:// if no protocol is present on a URL string.
 */
export function normalizeWebsite(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ── Validation Rules ───────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
  warnings: FieldError[];  // non-blocking (e.g., UPC length outside 8-14)
}

/**
 * Validate a complete form submission payload.
 * Returns all errors/warnings — does not short-circuit on first failure.
 *
 * @param data - The raw form data object
 * @param options.requirePhone - Whether phone is required (default: false for web_form)
 */
export function validateSubmission(
  data: Record<string, unknown>,
  options: { requirePhone?: boolean } = {}
): ValidationResult {
  const errors: FieldError[] = [];
  const warnings: FieldError[] = [];

  // ── Required fields (truthy + format) ──

  // email — required, lightweight format check
  const email = String(data.email || '').trim();
  if (!email) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }

  // contact_name — required, min 2 chars
  const contactName = String(data.contact_name || '').trim();
  if (!contactName || contactName.length < 2) {
    errors.push({ field: 'contact_name', message: 'Please enter your name.' });
  } else if (contactName.length > MAX_LENGTHS.contact_name) {
    errors.push({ field: 'contact_name', message: `Name is too long (max ${MAX_LENGTHS.contact_name} characters).` });
  }

  // item_name — required, min 3 chars
  const itemName = String(data.item_name || '').trim();
  if (!itemName || itemName.length < 3) {
    errors.push({ field: 'item_name', message: "Please tell us what you're selling (at least 3 characters)." });
  } else if (itemName.length > MAX_LENGTHS.item_name) {
    errors.push({ field: 'item_name', message: `Item name is too long (max ${MAX_LENGTHS.item_name} characters).` });
  }

  // condition — required, must match allowlist
  const condition = String(data.condition || '').trim();
  if (!condition || !CONDITIONS.includes(condition as (typeof CONDITIONS)[number])) {
    errors.push({ field: 'condition', message: 'Please select a condition.' });
  }

  // quantity — required, positive integer
  const quantityRaw = data.quantity;
  const quantity = typeof quantityRaw === 'number' ? quantityRaw : parseInt(String(quantityRaw), 10);
  if (isNaN(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
    errors.push({ field: 'quantity', message: 'Quantity must be a whole number (1 or more).' });
  }

  // product_category — required, must match known slugs
  const category = String(data.product_category || '').trim();
  if (!category) {
    errors.push({ field: 'product_category', message: 'Please select a product category.' });
  }
  // Note: Server-side allowlist check against CATEGORY_SLUGS is P2.
  // The form dropdown constrains values for web submissions.

  // location — required, must contain comma + 2-letter state
  const location = String(data.location || '').trim();
  if (!location) {
    errors.push({ field: 'location', message: 'Please include your city and state (e.g., Dallas, TX).' });
  } else if (!/.+,\s*[A-Za-z]{2}\b/.test(location)) {
    errors.push({ field: 'location', message: 'Please include your city and state (e.g., Dallas, TX).' });
  }

  // ── Optional fields (validate format only if provided) ──

  // phone — optional on web, validated if provided
  const phoneRaw = String(data.phone || '').trim();
  if (phoneRaw) {
    const phoneDigits = normalizePhone(phoneRaw);
    const isIntl = phoneRaw.startsWith('+');
    if (isIntl) {
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        errors.push({ field: 'phone', message: 'Please enter a valid phone number (e.g., 555-123-4567).' });
      }
    } else {
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        errors.push({ field: 'phone', message: 'Please enter a valid phone number (e.g., 555-123-4567).' });
      }
    }
  } else if (options.requirePhone) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number (e.g., 555-123-4567).' });
  }

  // company_name — optional, maxLength only
  const companyName = String(data.company_name || '').trim();
  if (companyName && companyName.length > MAX_LENGTHS.company_name) {
    errors.push({ field: 'company_name', message: `Company name is too long (max ${MAX_LENGTHS.company_name} characters).` });
  }

  // description — optional, maxLength only
  const description = String(data.description || '').trim();
  if (description && description.length > MAX_LENGTHS.description) {
    errors.push({ field: 'description', message: `Description is too long (max ${MAX_LENGTHS.description} characters).` });
  }

  // upc — conditional (only validated if no_upc is false/absent)
  const noUpc = Boolean(data.no_upc);
  if (!noUpc) {
    const upcRaw = String(data.upc || '').trim();
    if (upcRaw) {
      const upcClean = normalizeUpc(upcRaw);
      if (!/^\d+$/.test(upcClean)) {
        errors.push({ field: 'upc', message: 'UPC codes are numeric only (e.g., 012345678901).' });
      } else if (upcClean.length < 8 || upcClean.length > 14) {
        // Soft warn — non-blocking
        warnings.push({ field: 'upc', message: 'UPC codes are typically 8-14 digits. Double-check if this looks correct.' });
      }
    }
  }

  // seller_estimated_value — optional, must be numeric > 0 if provided
  const estimatedValue = data.seller_estimated_value;
  if (estimatedValue !== undefined && estimatedValue !== null && estimatedValue !== '') {
    const cleanValue = String(estimatedValue).replace(/[$,\s]/g, '');
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue) || numValue <= 0) {
      errors.push({ field: 'seller_estimated_value', message: 'Please enter a valid dollar amount.' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
