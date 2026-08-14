/**
 * Applies SQL migrations to a Supabase project.
 *
 * Requires the Supabase CLI and a linked project:
 *   npx supabase link --project-ref <ref>
 * then:
 *   npm run db:migrate
 *
 * Alternatively run locally:
 *   npx supabase db push
 */
import { execSync } from "node:child_process";

try {
  console.log("Applying migrations with supabase db push...");
  execSync("npx supabase db push", { stdio: "inherit" });
  console.log("Migrations applied.");
} catch {
  console.error("Migration failed. Ensure the Supabase CLI is installed and the project is linked.");
  process.exit(1);
}
