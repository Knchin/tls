/**
 * Seeds the catalogue data directly through the Supabase REST API using the
 * service-role key (server-side only). Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with: npm run db:seed
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run the seed script.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const destinations = [
  { code: "FR", label: "France", official_url: "https://visas-fr.tlscontact.com/en-us/country/tn", enabled: true, sort_order: 1 },
  { code: "DE", label: "Germany", official_url: "https://visas-de.tlscontact.com/en-us/country/tn", enabled: true, sort_order: 2 },
  { code: "BE", label: "Belgium", official_url: "https://visas-be.tlscontact.com/en-us/country/tn", enabled: true, sort_order: 3 },
];

const centres = [
  { code: "TUNIS", label: "Tunis", country: "TN", enabled: true, sort_order: 1 },
  { code: "SFAX", label: "Sfax", country: "TN", enabled: true, sort_order: 2 },
];

const categories = [
  { code: "FR_TOURIST_SHORT_STAY", destination: "FR", label: "Tourist / Short Stay", enabled: true, sort_order: 1 },
  { code: "FR_FAMILY_PRIVATE_VISIT", destination: "FR", label: "Family / Private Visit", enabled: true, sort_order: 2 },
  { code: "FR_BUSINESS", destination: "FR", label: "Business", enabled: true, sort_order: 3 },
  { code: "FR_STUDENT", destination: "FR", label: "Student", enabled: true, sort_order: 4 },
  { code: "FR_WORK", destination: "FR", label: "Work", enabled: true, sort_order: 5 },
  { code: "DE_SHORT_STAY", destination: "DE", label: "Short Stay (Schengen)", enabled: true, sort_order: 1 },
  { code: "DE_LONG_STAY", destination: "DE", label: "Long Stay (National)", enabled: true, sort_order: 2 },
  { code: "BE_SHORT_STAY", destination: "BE", label: "Short Stay (Schengen)", enabled: true, sort_order: 1 },
  { code: "BE_LONG_STAY", destination: "BE", label: "Long Stay (National)", enabled: true, sort_order: 2 },
];

async function upsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw error;
  console.log(`Seeded ${table}: ${rows.length} rows`);
}

try {
  await upsert("destinations", destinations);
  await upsert("centres", centres);
  await upsert("visa_categories", categories);
  console.log("Seed complete.");
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}
