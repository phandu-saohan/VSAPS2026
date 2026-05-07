/**
 * HSAPS 2026 — Database Setup Script
 * Chạy: node setup-database.mjs
 *
 * Kết nối trực tiếp đến Postgres của self-hosted Supabase.
 *
 * Lấy connection info từ:
 *   POSTGRES_HOST=db
 *   POSTGRES_PORT=5434
 *   POSTGRES_PASSWORD=qgagmo3uuwzhygul0pdufth4ab6s8iv3
 */
import pg from "https://deno.land/x/pg@0.17.2/mod.ts";

const config = {
  hostname: "vsaps2026-pre0225supabase-64f45c-72-61-123-73.traefik.me",
  port: 5434,
  username: "postgres",
  password: "qgagmo3uuwzhygul0pdufth4ab6s8iv3",
  database: "postgres",
};

console.log("🔌 Connecting to Supabase Postgres...");
console.log(`   Host: ${config.hostname}:${config.port}`);

const client = new pg.Client(config);

try {
  await client.connect();
  console.log("✅ Connected!\n");

  // Read and split schema file
  const schema = await Deno.readTextFile("./schema.sql");
  const statements = schema
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  console.log(`📦 Running ${statements.length} SQL statements...\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const stmt of statements) {
    const short = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await client.queryObject(stmt);
      console.log(`  ✅ ${short}...`);
      success++;
    } catch (e) {
      const msg = e.message || "";
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate") ||
        msg.includes("does not exist") ||
        msg.includes("syntax error at or near") ||
        msg.includes("cannot drop") ||
        msg.includes("cannot sequence")
      ) {
        console.log(`  ⏭️  SKIP: ${short}...`);
        skipped++;
      } else {
        console.log(`  ❌ ERR: ${short}...`);
        console.log(`     → ${msg.slice(0, 200)}`);
        errors++;
      }
    }
  }

  console.log(`\n📊 Summary: ${success} OK, ${skipped} skipped, ${errors} errors`);

  if (errors > 0) {
    console.log("\n⚠️  Some statements failed. Check errors above.");
  } else {
    console.log("\n✅ Database schema setup COMPLETE!");
    console.log("\n📋 Next steps:");
    console.log("  1. Go to Supabase Dashboard > Storage > New Bucket");
    console.log("     - Name: event_assets");
    console.log("     - ✅ Public bucket");
    console.log("  2. Create admin user in Authentication tab");
    console.log("  3. Update the user's role to 'Quản trị viên' via SQL:");
    console.log("     UPDATE public.profiles SET role='Quản trị viên' WHERE email='your@email.com';");
  }
} catch (err) {
  console.error("❌ Connection failed:", err.message);
  console.error("\n💡 Hint: The Postgres port may be exposed via a different port on the Traefik host.");
  console.error("   Check your docker-compose logs and Kong/PostgREST config.");
} finally {
  await client.end();
}
