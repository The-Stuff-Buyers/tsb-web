"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  validateSubmission,
  CONDITIONS,
  INDUSTRY_TYPES,
  MAX_LENGTHS,
} from "@/lib/validation";
import { enqueue, getQueueStatus, retryAll, discardRecord } from "@/lib/offlineQueue";
import { purgeOldFailed } from "@/lib/offlineDb";
import { isOnline } from "@/lib/connectivity";
import QueueStatusBanner from "./QueueStatusBanner";

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

type UploadedFile = {
  file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  /** local preview URL (for images, from URL.createObjectURL) */
  preview_url?: string;
  /** upload progress 0–100, or 'done' | 'error' */
  progress: number | "done" | "error";
  error?: string;
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
  const [bannerStatus, setBannerStatus] = useState<
    "queued" | "retrying" | "success" | "partial" | "failed" | "pending" | null
  >(null);
  const [bannerCounts, setBannerCounts] = useState({
    itemCount: 0,
    sentCount: 0,
    failedCount: 0,
  });

  // ── File upload state ──────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionItemNumber, setSessionItemNumber] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // ── Session init ────────────────────────────────────────────────

  useEffect(() => {
    let sid = sessionStorage.getItem("tsb_session");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("tsb_session", sid);
    }
    setSessionId(sid);

    const itemNum = parseInt(sessionStorage.getItem("tsb_session_item_number") || "1", 10);
    setSessionItemNumber(isNaN(itemNum) ? 1 : itemNum);

    // Fetch previously uploaded files for this session
    if (sid) {
      fetch(`/api/submit/session-files?session_id=${encodeURIComponent(sid)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data: { files?: { file_id: string; file_name: string; file_type: string; file_size: number }[] } | null) => {
          if (data?.files && data.files.length > 0) {
            const restored: UploadedFile[] = data.files.map((f) => ({
              file_id: f.file_id,
              file_name: f.file_name,
              file_type: f.file_type,
              file_size: f.file_size,
              storage_path: "",
              progress: "done",
            }));
            setUploadedFiles(restored);
          }
        })
        .catch(() => {});
    }
  }, []);

  // ── File upload helpers ─────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    const tempId = crypto.randomUUID();
    const previewUrl = IMAGE_TYPES.has(file.type) ? URL.createObjectURL(file) : undefined;

    // Add placeholder entry with progress 0
    setUploadedFiles((prev) => [
      ...prev,
      {
        file_id: tempId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: "",
        preview_url: previewUrl,
        progress: 0,
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) formData.append("session_id", sessionId);

    try {
      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<{ file_id: string; file_name: string; storage_path: string; file_size: number; file_type: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/submit/upload");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadedFiles((prev) =>
              prev.map((f) => (f.file_id === tempId ? { ...f, progress: pct } : f))
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid server response"));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.send(formData);
      });

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file_id === tempId
            ? {
                ...f,
                file_id: result.file_id,
                storage_path: result.storage_path,
                progress: "done",
              }
            : f
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file_id === tempId ? { ...f, progress: "error", error: msg } : f
        )
      );
    }
  }, [sessionId]);

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      for (const file of arr) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFilesSelected(e.target.files);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function removeFile(fileId: string) {
    setUploadedFiles((prev) => {
      const f = prev.find((x) => x.file_id === fileId);
      if (f?.preview_url) URL.revokeObjectURL(f.preview_url);
      return prev.filter((x) => x.file_id !== fileId);
    });
  }

  // Collect file_ids that finished uploading successfully
  const doneFileIds = uploadedFiles
    .filter((f) => f.progress === "done")
    .map((f) => f.file_id);

  // ── Form reset ─────────────────────────────────────────────────

  function resetItemFields() {
    setItems((prev) => ({ ...prev, [0]: emptyItem(true) }));
    for (let i = 1; i < 10; i++) {
      setItems((prev) => ({ ...prev, [i]: emptyItem(false) }));
    }
    setActiveTab(0);
    setErrors({});
    setWarnings({});
    setGlobalError("");
    setStatus("idle");
    // Keep files for session reuse — don't clear uploadedFiles
  }

  function resetForm() {
    setContact({ contact_name: "", email: "", phone: "", company_name: "", website: "", industry_type: "" });
    resetItemFields();
    setUploadedFiles([]);
    sessionStorage.removeItem("tsb_session");
    sessionStorage.removeItem("tsb_session_item_number");
    const newSid = crypto.randomUUID();
    sessionStorage.setItem("tsb_session", newSid);
    setSessionId(newSid);
    setSessionItemNumber(1);
  }

  // ── Queue banner helpers ────────────────────────────────────────

  async function applyRetryResult(sent: number, failed: number) {
    const qs = await getQueueStatus();
    const activePending = qs.pending + qs.retrying;
    if (sent > 0 && failed === 0 && activePending === 0) {
      setBannerStatus("success");
      setBannerCounts({ itemCount: sent, sentCount: sent, failedCount: 0 });
    } else if (sent > 0 && failed > 0) {
      setBannerStatus("partial");
      setBannerCounts({ itemCount: sent + failed, sentCount: sent, failedCount: failed });
    } else if (failed > 0) {
      setBannerStatus("failed");
      setBannerCounts({ itemCount: failed, sentCount: 0, failedCount: failed });
    } else if (activePending > 0) {
      setBannerStatus("pending");
      setBannerCounts({ itemCount: activePending, sentCount: 0, failedCount: 0 });
    } else {
      setBannerStatus(null);
    }
  }

  async function tryRetry() {
    const qs = await getQueueStatus();
    if (qs.pending === 0 && qs.retrying === 0) return;
    const online = await isOnline();
    if (!online) return;
    setBannerStatus("retrying");
    const result = await retryAll();
    await applyRetryResult(result.sent, result.failed);
  }

  // ── Mount effect ────────────────────────────────────────────────

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      purgeOldFailed().catch(() => {});

      const qs = await getQueueStatus();
      if (qs.total > 0) {
        if (qs.failed > 0 && qs.pending === 0 && qs.retrying === 0) {
          setBannerStatus("failed");
          setBannerCounts({ itemCount: qs.failed, sentCount: 0, failedCount: qs.failed });
        } else if (qs.pending > 0 || qs.retrying > 0) {
          setBannerStatus("pending");
          setBannerCounts({ itemCount: qs.pending + qs.retrying, sentCount: 0, failedCount: 0 });
        }
      }

      await tryRetry();

      intervalId = setInterval(async () => {
        if (document.visibilityState !== "visible") return;
        const current = await getQueueStatus();
        if (current.pending === 0 && current.retrying === 0) return;
        await tryRetry();
      }, 30_000);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        tryRetry();
      }
    }

    init();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const activeTabs = Object.keys(items)
      .map(Number)
      .filter((i) => items[i].active)
      .sort((a, b) => a - b);

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

    let payload: Record<string, unknown>;
    if (activeTabs.length === 1) {
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
        file_ids: doneFileIds,
        session_id: sessionId,
        session_item_number: sessionItemNumber,
      };
    } else {
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
            file_ids: doneFileIds,
          };
        }),
        session_id: sessionId,
      };
    }

    async function registerSync() {
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (reg as any).sync.register("sync-tsb-submissions");
        } catch {}
      }
    }

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
        if (res.status === 503) {
          await enqueue(payload);
          setBannerStatus("queued");
          resetForm();
          if (submitBtnRef.current) submitBtnRef.current.disabled = false;
          await registerSync();
          return;
        }

        if (data.itemErrors) {
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

      // Success — advance session item number
      const nextItemNumber = sessionItemNumber + 1;
      sessionStorage.setItem("tsb_session_item_number", String(nextItemNumber));
      setSessionItemNumber(nextItemNumber);

      setStatus("success");
    } catch {
      await enqueue(payload);
      setBannerStatus("queued");
      resetForm();
      if (submitBtnRef.current) submitBtnRef.current.disabled = false;
      await registerSync();
    }
  }

  // ── Submit another item handler ──────────────────────────────────

  function handleSubmitAnother() {
    resetItemFields();
    setStatus("idle");
    // Keep uploadedFiles and contact — seller can reuse
  }

  function handleDone() {
    resetForm();
    setStatus("idle");
  }

  // ── Success screen ─────────────────────────────────────────────

  if (status === "success") {
    return (
      <div className="py-12">
        <p className="text-brand-gold text-2xl font-bold mb-2">Received.</p>
        <p className="text-brand-gray text-base mb-6">
          We&apos;ll be in touch within 2 business days.
        </p>
        <div className="flex gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleSubmitAnother}
            className="bg-brand-gold text-brand-bg font-bold px-8 py-3 rounded-lg text-base hover:bg-brand-gold/90 transition-colors"
          >
            Submit Another Item →
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="bg-brand-card text-brand-gray font-bold px-8 py-3 rounded-lg text-base hover:bg-brand-card/80 transition-colors border border-brand-card"
          >
            Done
          </button>
        </div>
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

      {/* ── Queue status banner ── */}
      <QueueStatusBanner
        status={bannerStatus}
        itemCount={bannerCounts.itemCount}
        sentCount={bannerCounts.sentCount}
        failedCount={bannerCounts.failedCount}
        onRetry={async () => {
          setBannerStatus("retrying");
          const result = await retryAll();
          await applyRetryResult(result.sent, result.failed);
        }}
        onDiscard={async () => {
          const qs = await getQueueStatus();
          await Promise.all(
            qs.records.filter((r) => r.status === "failed").map((r) => discardRecord(r.id))
          );
          const updated = await getQueueStatus();
          if (updated.total === 0) {
            setBannerStatus(null);
          } else if (updated.pending > 0 || updated.retrying > 0) {
            setBannerStatus("pending");
            setBannerCounts({ itemCount: updated.pending + updated.retrying, sentCount: 0, failedCount: 0 });
          }
        }}
      />

      {/* ── YOUR INFO ── */}
      <div className="mb-8">
        <p className={sectionLabel}>Your Info</p>

        {isLocked ? (
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

        {/* ── File Upload Zone ── */}
        <div className="mt-4">
          <label className={labelClass}>Product Photos &amp; Documents (Optional)</label>
          <p className="text-brand-gray/60 text-xs mb-2">
            Photos of the product, packaging, or spec sheets help us get you a faster, more accurate quote. Including images significantly reduces back-and-forth.
          </p>

          {/* Drag-and-drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragOver
                ? "border-brand-gold bg-brand-gold/10"
                : "border-brand-gold/30 hover:border-brand-gold/70 bg-brand-input",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.xlsx,.xls,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
              tabIndex={-1}
            />
            <div className="text-4xl mb-2 opacity-40">📎</div>
            <div className="text-brand-gray text-sm">
              <span className="text-brand-gold font-semibold">Click to browse</span> or drag &amp; drop files here
            </div>
            <div className="text-brand-gray/40 text-xs mt-1">
              JPEG, PNG, HEIC, PDF, Excel, CSV · Max 25 MB per file
            </div>
          </div>

          {/* File list */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {uploadedFiles.map((f) => (
                <div
                  key={f.file_id}
                  className="flex items-center gap-3 bg-brand-input border border-brand-card rounded-lg px-3 py-2"
                >
                  {/* Thumbnail or icon */}
                  {f.preview_url ? (
                    <img
                      src={f.preview_url}
                      alt={f.file_name}
                      className="w-10 h-10 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-brand-card rounded flex-shrink-0 text-brand-gray text-xs font-bold uppercase">
                      {f.file_type.includes("pdf") ? "PDF" : f.file_type.includes("csv") ? "CSV" : "XLS"}
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-brand-white text-sm font-medium truncate">{f.file_name}</div>
                    <div className="text-brand-gray/60 text-xs">{formatBytes(f.file_size)}</div>
                  </div>

                  {/* Progress / status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.progress === "done" && (
                      <span className="text-green-400 text-sm">✓</span>
                    )}
                    {f.progress === "error" && (
                      <span className="text-brand-error text-xs" title={f.error}>✕ Failed</span>
                    )}
                    {typeof f.progress === "number" && (
                      <div className="w-16 h-1.5 bg-brand-card rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-gold transition-all duration-200"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(f.file_id); }}
                      className="text-brand-gray/50 hover:text-brand-error text-sm ml-1"
                      aria-label={`Remove ${f.file_name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
