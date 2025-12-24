/**
 * List of companies using Lever for job postings
 * Each company has a name and a Lever subdomain (slug)
 * Job board URL format: https://jobs.lever.co/{slug}
 */

export interface LeverCompany {
  name: string;
  slug: string;
}

export const LEVER_COMPANIES: LeverCompany[] = [
  // Popular tech companies using Lever
  { name: "Spotify", slug: "spotify" },
  { name: "Plaid", slug: "plaid" },
  { name: "Deel", slug: "deel" },
  { name: "Miro", slug: "miro" },
  { name: "Binance", slug: "binance" },
  { name: "BTSE", slug: "BTSE" },
  { name: "Wintermute", slug: "wintermute-trading" },
  { name: "Mistral AI", slug: "mistral" },
  { name: "Gate", slug: "gate" },
  { name: "Paytm", slug: "paytm" },
  { name: "PicCollage", slug: "piccollage" },
  { name: "Pinkoi", slug: "pinkoi" },
  { name: "Palantir", slug: "palantir" },
  { name: "Ethena", slug: "ethenalabs" },
  { name: "Quizlet", slug: "quizlet-2" },
  { name: "Gogolook", slug: "Gogolook" },
  

];
