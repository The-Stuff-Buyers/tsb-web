// =============================================================================
// SEO CONSTANTS & KEYWORD MAP
// =============================================================================
// Central reference for all SEO-critical values. Import from here to ensure
// consistency across all pages, structured data, and metadata.
// =============================================================================

export const SITE_CONFIG = {
  url: "https://thestuffbuyers.com",
  name: "The Stuff Buyers",
  legalName: "The Stuff Buyers LLC",
  parentOrg: "Snowfield Enterprises LLC",
  slogan: "We Buy Stuff. The stuff you can't sell.",
  tagline: "Easy. Simple. Fast.",
  phone: "888-987-2927",
  phoneTel: "+18889872927",
  email: "quotes@thestuffbuyers.com",
  address: {
    street: "448 Cobblestone Way",
    city: "Mt Juliet",
    state: "TN",
    zip: "37122",
    country: "US",
  },
  social: {
    // Add as profiles are created
    linkedin: "",
    facebook: "",
    twitter: "",
    instagram: "",
  },
} as const;

// -- Primary Target Keywords --------------------------------------------------
// Organized by page and intent. Use these in metadata, headings, and body copy.

export const KEYWORD_MAP = {
  homepage: {
    primary: [
      "we buy excess inventory",
      "excess inventory buyer",
      "sell excess inventory",
      "dead stock buyer",
      "overstock liquidation",
    ],
    secondary: [
      "closeout buyer",
      "surplus inventory buyer",
      "inventory recovery",
      "bulk inventory buyer",
      "wholesale liquidation",
    ],
    longTail: [
      "sell excess inventory for cash",
      "who buys excess inventory",
      "how to sell dead stock",
      "excess inventory buyer near me",
      "sell overstock merchandise fast",
      "we buy stuff company",
    ],
  },

  sellExcessInventory: {
    primary: [
      "sell excess inventory",
      "excess inventory buyer",
      "buy excess inventory",
    ],
    secondary: [
      "excess inventory liquidation",
      "overstock buyer",
      "sell overstock",
      "surplus inventory for sale",
    ],
    longTail: [
      "how to sell excess inventory fast",
      "best excess inventory buyer",
      "sell excess inventory online",
      "excess inventory buyer USA",
      "sell warehouse overstock",
      "get rid of excess inventory",
    ],
  },

  sellDeadStock: {
    primary: [
      "sell dead stock",
      "dead stock buyer",
      "buy dead stock",
    ],
    secondary: [
      "obsolete inventory buyer",
      "discontinued merchandise buyer",
      "sell obsolete inventory",
    ],
    longTail: [
      "how to sell dead stock inventory",
      "who buys dead stock",
      "sell discontinued products",
      "dead stock liquidation",
      "get rid of dead stock",
    ],
  },

  inventoryLiquidation: {
    primary: [
      "inventory liquidation services",
      "inventory liquidation company",
      "liquidate inventory",
    ],
    secondary: [
      "inventory liquidation buyer",
      "closeout buyer",
      "surplus inventory buyer",
      "wholesale liquidation company",
    ],
    longTail: [
      "how to liquidate inventory fast",
      "best inventory liquidation company",
      "inventory liquidation services near me",
      "closeout buyer for retail inventory",
      "Amazon FBA inventory liquidation",
    ],
  },

  industries: {
    electronics: [
      "sell excess electronics inventory",
      "electronics liquidation buyer",
      "surplus electronics buyer",
    ],
    toysGames: [
      "sell excess toys inventory",
      "toy liquidation buyer",
      "surplus toys buyer",
    ],
    healthBeauty: [
      "sell excess health beauty inventory",
      "health beauty liquidation",
      "surplus cosmetics buyer",
    ],
    toolsHardware: [
      "sell excess tools inventory",
      "tool liquidation buyer",
      "surplus hardware buyer",
    ],
    foodBeverage: [
      "sell excess food inventory",
      "food liquidation buyer",
      "short dated food buyer",
    ],
    generalMerchandise: [
      "sell general merchandise closeouts",
      "general merchandise liquidation",
      "surplus merchandise buyer",
    ],
  },
} as const;

// -- Competitor Domains (for reference, not for code use) ---------------------
export const COMPETITORS = [
  "webuyexcess.com",
  "surplusinventorybuyer.com",
  "bulkinventorybuyers.com",
  "excessinventorybuyers.com",
  "hjcloseouts.com",
  "sellingexcessinventory.com",
  "totalsurplussolutions.com",
  "overstocktrader.com",
  "merchandiseusa.com",
  "productliquidators.com",
  "inventoryliquidationbuyers.com",
  "liquidatenow.com",
] as const;
