CREATE TABLE IF NOT EXISTS form_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source          TEXT DEFAULT 'web_form',
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  description     TEXT NOT NULL,
  condition       TEXT NOT NULL,
  location        TEXT NOT NULL,
  upc             TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  product_category TEXT NOT NULL,
  processed       BOOLEAN DEFAULT FALSE,
  deal_id         TEXT  -- filled in by Cyclops when deal is created
);
