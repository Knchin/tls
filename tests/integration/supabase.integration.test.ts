import { afterAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseConfig } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const configured = Boolean(url && serviceRoleKey && anonKey);

let admin: SupabaseClient | null = null;
let userClient: SupabaseClient | null = null;
let createdUserId: string | null = null;
const createdRequestIds: string[] = [];

describe.skipIf(!configured)("Supabase integration", () => {
  afterAll(async () => {
    for (const id of createdRequestIds) {
      await admin?.from("monitoring_requests").delete().eq("id", id);
    }
    if (createdUserId && admin) {
      await admin.auth.admin.deleteUser(createdUserId);
    }
  });

  it("catalogue is seeded and readable", async () => {
    admin = createAdminClient();

    const { data: destinations, error: destError } = await admin
      .from("destinations")
      .select("code")
      .order("sort_order");

    expect(destError).toBeNull();
    const codes = (destinations ?? []).map((d) => d.code);
    expect(codes).toEqual(expect.arrayContaining(["FR", "DE", "BE"]));

    const { data: centres, error: centresError } = await admin
      .from("centres")
      .select("code");

    expect(centresError).toBeNull();
    expect((centres ?? []).map((c) => c.code)).toEqual(
      expect.arrayContaining(["TUNIS", "SFAX"])
    );

    const { data: categories, error: categoriesError } = await admin
      .from("visa_categories")
      .select("destination");

    expect(categoriesError).toBeNull();
    expect((categories ?? []).map((c) => c.destination)).toEqual(
      expect.arrayContaining(["FR", "DE", "BE"])
    );
  });

  it("catalogue requires authentication (not readable by anon)", async () => {
    const publicClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await publicClient
      .from("destinations")
      .select("code")
      .limit(10);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("app_config contains monitoring limits", async () => {
    admin = createAdminClient();

    const { data, error } = await admin.from("app_config").select("key, value");
    expect(error).toBeNull();

    const config = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
    expect(config.max_active_per_user).toBe(5);
    expect(config.max_total_per_user).toBe(20);
  });

  it("user tables are protected from anon access", async () => {
    const publicClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await publicClient
      .from("monitoring_requests")
      .select("id")
      .limit(10);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("a signed-in user can create and read their own monitoring request", async () => {
    admin = createAdminClient();
    requireSupabaseConfig();

    const email = `tls-radar-test-${Date.now()}@example.com`;
    const password = "tls-radar-test-password-2026";

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    expect(createError).toBeNull();
    expect(created.user).toBeDefined();
    createdUserId = created.user!.id;

    userClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    });
    expect(signInError).toBeNull();
    expect(signInData.session).toBeDefined();

    const { data: insertData, error: insertError } = await userClient
      .from("monitoring_requests")
      .insert({
        user_id: createdUserId,
        country: "TN",
        destination: "FR",
        centre: "TUNIS",
        visa_category: "FR_TOURIST_SHORT_STAY",
        check_interval_minutes: 60,
      })
      .select("id")
      .single();

    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();
    createdRequestIds.push(insertData!.id);

    const { data: own, error: ownError } = await userClient
      .from("monitoring_requests")
      .select("id, centre, destination, status")
      .eq("id", insertData!.id);

    expect(ownError).toBeNull();
    expect(own).toHaveLength(1);
    expect(own![0].centre).toBe("TUNIS");
    expect(own![0].status).toBe("ACTIVE");

    const { data: catalogue, error: catalogueError } = await userClient
      .from("destinations")
      .select("code");
    expect(catalogueError).toBeNull();
    expect((catalogue ?? []).map((d) => d.code)).toEqual(
      expect.arrayContaining(["FR", "DE", "BE"])
    );
  });

  it("a user cannot read another user's monitoring request", async () => {
    admin = createAdminClient();

    const emailA = `tls-radar-a-${Date.now()}@example.com`;
    const emailB = `tls-radar-b-${Date.now()}@example.com`;
    const password = "tls-radar-test-password-2026";

    const { data: userA, error: errorA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    expect(errorA).toBeNull();
    const { data: userB, error: errorB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    expect(errorB).toBeNull();

    const aId = userA!.user!.id;
    const bId = userB!.user!.id;

    const { data: requestRow, error: insertError } = await admin
      .from("monitoring_requests")
      .insert({
        user_id: aId,
        country: "TN",
        destination: "DE",
        centre: "SFAX",
        visa_category: "DE_SHORT_STAY",
        check_interval_minutes: 60,
      })
      .select("id")
      .single();

    expect(insertError).toBeNull();
    createdRequestIds.push(requestRow!.id);

    const clientB = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await clientB.auth.signInWithPassword({ email: emailB, password });

    const { data: others, error: othersError } = await clientB
      .from("monitoring_requests")
      .select("id")
      .eq("id", requestRow!.id);

    expect(othersError).toBeNull();
    expect(others ?? []).toHaveLength(0);

    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });
});
