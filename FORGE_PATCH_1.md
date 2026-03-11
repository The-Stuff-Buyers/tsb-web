# FORGE PATCH 1 — Web Form Contact Fields

Read the existing code before changing anything.

## Add contact fields to the intake form

### app/components/IntakeForm.tsx
Add these fields between the Email field and Item Name field:

- **Company Name** (text input, required) — label: "Company Name"
- **Contact Name** (text input, required) — label: "Your Name"  
- **Phone** (tel input, required) — label: "Phone Number"
- **Website** (url input, optional) — label: "Website (optional)"

### app/api/submit/route.ts
Add company_name, contact_name, phone to required field validation.
Add website to the Supabase insert (optional, may be empty).

### schema.sql
Add to form_submissions table definition:
```sql
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS website TEXT;
```

Keep all existing styling — dark inputs, yellow gold focus border, Poppins font.

When done run:
openclaw system event --text "Forge done: tsb-web contact fields added" --mode now
