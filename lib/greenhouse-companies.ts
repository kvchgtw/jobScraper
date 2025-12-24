// List of known companies using Greenhouse for their job boards
// Greenhouse boards are typically at: boards.greenhouse.io/{slug}
// This list can be extended as you discover more companies

export interface GreenhouseCompany {
  name: string;
  slug: string;
}

export const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  // Tech Companies
  { name: "Anthropic", slug: "anthropic" },
  { name: "Stripe", slug: "stripe" },
  { name: "Figma", slug: "figma" },
  { name: "Dropbox", slug: "dropbox" },
  { name: "Cloudflare", slug: "cloudflare" },
  { name: "Databricks", slug: "databricks" },
  { name: "GitLab", slug: "gitlab" },
  { name: "DoorDash", slug: "doordash" },
  { name: "Instacart", slug: "instacart" },
  { name: "Robinhood", slug: "robinhood" },
  { name: "Affirm", slug: "affirm" },
  { name: "Reddit", slug: "reddit" },
  { name: "Discord", slug: "discord" },
  { name: "Brex", slug: "brex" },
  { name: "Airtable", slug: "airtable" },
  { name: "Miro", slug: "miro" },
  { name: "Canva", slug: "canva" },
  { name: "Amplitude", slug: "amplitude" },
  { name: "Gusto", slug: "gusto" },
  { name: "Anduril", slug: "andurilindustries" },


  // AI & Data Companies
  { name: "Hugging Face", slug: "huggingface" },
  { name: "Weights & Biases", slug: "wandb" },
  { name: "Snowflake", slug: "snowflake" },
  { name: "Observe", slug: "observe" },
  { name: "Modal", slug: "modal" },

  // Crypto & Web3
  { name: "Coinbase", slug: "coinbase" },
  { name: "Circle", slug: "circle" },
  { name: "Uniswap", slug: "uniswaplabs" },
  { name: "dYdX", slug: "dydx" },
  { name: "Alchemy", slug: "alchemy" },
  { name: "Jumio", slug: "jumio" },

  // Developer Tools
  { name: "PlanetScale", slug: "planetscale" },
  { name: "Render", slug: "render" },
  { name: "Fly.io", slug: "fly" },
  { name: "Railway", slug: "railway" },
  { name: "Supabase", slug: "supabase" },
  { name: "Neon", slug: "neon" },

  // Startups & Growth Companies
  { name: "Lattice", slug: "lattice" },
  { name: "Chime", slug: "chime" },
  { name: "Flexport", slug: "flexport" },
  { name: "Toast", slug: "toast" },
  { name: "Webflow", slug: "webflow" },
  { name: "Retool", slug: "retool" },
  { name: "Postman", slug: "postman" },
  { name: "LaunchDarkly", slug: "launchdarkly" },
  { name: "Sourcegraph", slug: "sourcegraph" },

  // Enterprise
  { name: "Snyk", slug: "snyk" },
  { name: "HashiCorp", slug: "hashicorp" },
  { name: "Confluent", slug: "confluent" },
  { name: "Elastic", slug: "elastic" },
  { name: "MongoDB", slug: "mongodb" },

  // Add more companies here as you discover them
];
