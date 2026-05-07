import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";

// ============= CONFIG =============
const SUPABASE_URL = "http://vsaps2026-pre0225supabase-8e734b-72-61-123-73.traefik.me";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

// ============= SUPABASE CLIENTS =============
let supabaseAnon: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

function getClients() {
  if (!supabaseAnon) {
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return { anon: supabaseAnon, admin: supabaseAdmin };
}

// ============= HELPER =============
function makeError(msg: string, detail?: string): object {
  return { error: msg, detail: detail || null };
}

function makeSuccess(data: unknown, message?: string): object {
  return { success: true, data, message: message || null };
}

function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return JSON.stringify(err);
}

// ============= TOOLS =============
const tools: Tool[] = [
  // --- Auth ---
  {
    name: "supabase_auth_signup",
    description: "Đăng ký user mới với email/password",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address" },
        password: { type: "string", description: "Password (min 6 chars)" },
        metadata: { type: "object", description: "Optional user metadata", additionalProperties: true }
      },
      required: ["email", "password"]
    }
  },
  {
    name: "supabase_auth_signin",
    description: "Đăng nhập với email/password",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        password: { type: "string" }
      },
      required: ["email", "password"]
    }
  },
  {
    name: "supabase_auth_signout",
    description: "Đăng xuất user hiện tại",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" }
      },
      required: ["access_token"]
    }
  },
  {
    name: "supabase_auth_get_session",
    description: "Lấy session hiện tại (dùng access_token)",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" }
      },
      required: ["access_token"]
    }
  },
  {
    name: "supabase_auth_list_users",
    description: "Liệt kê tất cả users (cần service role key)",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number", default: 1 },
        per_page: { type: "number", description: "Items per page", default: 50 }
      }
    }
  },

  // --- Database CRUD ---
  {
    name: "supabase_db_query",
    description: "Chạy query SELECT trên Supabase (đọc dữ liệu)",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Tên bảng" },
        select: { type: "string", description: "Các cột cần select (mặc định: *)" },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is", "cs", "cd"] },
              value: {}
            }
          },
          description: "Array of filters"
        },
        order: { type: "object", description: "{ column: 'name', ascending: true }", properties: { column: { type: "string" }, ascending: { type: "boolean" } } },
        limit: { type: "number" },
        range: { type: "object", description: "{ from: 0, to: 10 } pagination" }
      },
      required: ["table"]
    }
  },
  {
    name: "supabase_db_insert",
    description: "Chèn row(s) mới vào bảng",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        rows: {
          type: "array",
          items: { type: "object" },
          description: "Array of rows to insert"
        },
        returning: { type: "boolean", description: "Trả về rows đã insert", default: true }
      },
      required: ["table", "rows"]
    }
  },
  {
    name: "supabase_db_update",
    description: "Cập nhật row(s) trong bảng",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        updates: { type: "object", description: "Fields to update" },
        filters: { type: "array", items: { type: "object" } }
      },
      required: ["table", "updates"]
    }
  },
  {
    name: "supabase_db_delete",
    description: "Xóa row(s) trong bảng",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        filters: { type: "array", items: { type: "object" } }
      },
      required: ["table", "filters"]
    }
  },

  // --- Storage ---
  {
    name: "supabase_storage_upload",
    description: "Upload file lên Supabase Storage",
    inputSchema: {
      type: "object",
      properties: {
        bucket: { type: "string", description: "Tên bucket" },
        path: { type: "string", description: "Đường dẫn file (VD: avatars/user123.png)" },
        file_data: { type: "string", description: "Base64 encoded file content" },
        content_type: { type: "string", description: "MIME type (VD: image/png)" }
      },
      required: ["bucket", "path", "file_data"]
    }
  },
  {
    name: "supabase_storage_download",
    description: "Download file từ Supabase Storage (trả về base64)",
    inputSchema: {
      type: "object",
      properties: {
        bucket: { type: "string" },
        path: { type: "string" }
      },
      required: ["bucket", "path"]
    }
  },
  {
    name: "supabase_storage_list",
    description: "Liệt kê files trong một folder",
    inputSchema: {
      type: "object",
      properties: {
        bucket: { type: "string" },
        prefix: { type: "string", description: "Folder prefix" },
        limit: { type: "number", default: 100 },
        search: { type: "string", description: "Tìm kiếm theo tên" }
      },
      required: ["bucket"]
    }
  },
  {
    name: "supabase_storage_delete",
    description: "Xóa file(s) từ Supabase Storage",
    inputSchema: {
      type: "object",
      properties: {
        bucket: { type: "string" },
        paths: { type: "array", items: { type: "string" }, description: "Array of file paths" }
      },
      required: ["bucket", "paths"]
    }
  },
  {
    name: "supabase_storage_create_bucket",
    description: "Tạo bucket mới trong Storage",
    inputSchema: {
      type: "object",
      properties: {
        bucket_name: { type: "string" },
        public: { type: "boolean", description: "Bucket có public không", default: false },
        allowed_mime_types: { type: "array", items: { type: "string" } },
        max_storage_mb: { type: "number" }
      },
      required: ["bucket_name"]
    }
  },
  {
    name: "supabase_storage_list_buckets",
    description: "Liệt kê tất cả buckets",
    inputSchema: { type: "object", properties: {} }
  },

  // --- Edge Functions ---
  {
    name: "supabase_edge_function",
    description: "Gọi Supabase Edge Function",
    inputSchema: {
      type: "object",
      properties: {
        function_name: { type: "string" },
        body: { type: "object", description: "Request body" },
        method: { type: "string", enum: ["POST", "GET", "PUT", "PATCH", "DELETE"], default: "POST" }
      },
      required: ["function_name"]
    }
  },

  // --- Utility ---
  {
    name: "supabase_ping",
    description: "Kiểm tra kết nối Supabase",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "supabase_db_list_tables",
    description: "Liệt kê tất cả tables trong public schema",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "supabase_health_check",
    description: "Kiểm tra health status của Supabase services",
    inputSchema: { type: "object", properties: {} }
  }
];

// ============= HANDLER =============
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<object> {
  const { anon, admin } = getClients();

  try {
    switch (name) {
      // --- Auth ---
      case "supabase_auth_signup": {
        const { email, password, metadata } = args as { email: string; password: string; metadata?: Record<string, unknown> };
        const { data, error } = await anon.auth.signUp({
          email, password,
          options: { data: metadata }
        });
        if (error) return makeError(error.message);
        return makeSuccess(data, "Signup successful");
      }
      case "supabase_auth_signin": {
        const { email, password } = args as { email: string; password: string };
        const { data, error } = await anon.auth.signInWithPassword({ email, password });
        if (error) return makeError(error.message);
        return makeSuccess(data, "Signin successful");
      }
      case "supabase_auth_signout": {
        const { access_token } = args as { access_token: string };
        const { error } = await anon.auth.signOut();
        if (error) return makeError(error.message);
        return makeSuccess(null, "Signout successful");
      }
      case "supabase_auth_get_session": {
        const { data, error } = await anon.auth.getSession();
        if (error) return makeError(error.message);
        return makeSuccess(data, "Session retrieved");
      }
      case "supabase_auth_list_users": {
        const page = (args.page as number) || 1;
        const per_page = (args.per_page as number) || 50;
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: per_page });
        if (error) return makeError(error.message);
        return makeSuccess(data, `Listed ${data.users.length} users`);
      }

      // --- Database ---
      case "supabase_db_query": {
        const { table, select = "*", filters, order, limit, range } = args as {
          table: string; select?: string; filters?: Array<{column: string; operator: string; value: unknown}>;
          order?: {column: string; ascending: boolean}; limit?: number;
          range?: {from: number; to: number}
        };
        let q = admin.from(table).select(select);
        if (filters) {
          for (const f of filters) {
            const op = f.operator as keyof typeof q;
            const filteredQ = (q as any)[op](f.column, f.value);
            if (filteredQ) q = filteredQ;
          }
        }
        if (order) q = q.order(order.column, { ascending: order.ascending });
        if (limit) q = q.limit(limit);
        if (range) q = q.range(range.from, range.to);
        const { data, error, count } = await q;
        if (error) return makeError(error.message);
        return makeSuccess({ rows: data, count }, `Query returned ${data?.length || 0} rows`);
      }
      case "supabase_db_insert": {
        const { table, rows, returning = true } = args as { table: string; rows: object[]; returning?: boolean };
        const q = admin.from(table).insert(rows as any);
        if (returning) {
          const { data, error } = await q.select();
          if (error) return makeError(error.message);
          return makeSuccess(data, `Inserted ${data?.length || 0} rows`);
        } else {
          const { error } = await q;
          if (error) return makeError(error.message);
          return makeSuccess(null, "Insert completed");
        }
      }
      case "supabase_db_update": {
        const { table, updates, filters } = args as { table: string; updates: object; filters?: Array<{column: string; operator: string; value: unknown}> };
        if (!filters || filters.length === 0) return makeError("At least one filter is required for update");
        let q = admin.from(table).update(updates as any);
        for (const f of filters) {
          const op = f.operator as "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
          q = (q[op] as Function).call(q, f.column, f.value);
        }
        const { data, error } = await q;
        if (error) return makeError(error.message);
        return makeSuccess(data, "Updated successfully");
      }
      case "supabase_db_delete": {
        const { table, filters } = args as { table: string; filters: Array<{column: string; operator: string; value: unknown}> };
        if (!filters || filters.length === 0) return makeError("At least one filter is required for delete");
        let q = admin.from(table).delete();
        for (const f of filters) {
          const op = f.operator as "eq" | "neq";
          q = (q[op] as Function).call(q, f.column, f.value);
        }
        const { error } = await q;
        if (error) return makeError(error.message);
        return makeSuccess(null, "Deleted successfully");
      }

      // --- Storage ---
      case "supabase_storage_list_buckets": {
        const { data, error } = await admin.storage.listBuckets();
        if (error) return makeError(error.message);
        return makeSuccess(data, `Found ${data?.length || 0} buckets`);
      }
      case "supabase_storage_create_bucket": {
        const { bucket_name, public: isPublic = false, allowed_mime_types, max_storage_mb } = args as {
          bucket_name: string; public?: boolean; allowed_mime_types?: string[]; max_storage_mb?: number
        };
        const { data, error } = await admin.storage.createBucket(bucket_name, {
          public: isPublic,
          allowedMimeTypes: allowed_mime_types,
          fileSizeLimit: max_storage_mb ? max_storage_mb * 1024 * 1024 : undefined
        });
        if (error) return makeError(error.message);
        return makeSuccess(data, "Bucket created");
      }
      case "supabase_storage_list": {
        const { bucket, prefix = "", limit = 100, search } = args as { bucket: string; prefix?: string; limit?: number; search?: string };
        const { data, error } = await admin.storage.from(bucket).list(prefix, { limit, search });
        if (error) return makeError(error.message);
        return makeSuccess(data, `Listed ${data?.length || 0} files`);
      }
      case "supabase_storage_upload": {
        const { bucket, path, file_data, content_type = "application/octet-stream" } = args as {
          bucket: string; path: string; file_data: string; content_type: string
        };
        const binary = Uint8Array.from(atob(file_data), c => c.charCodeAt(0));
        const { data, error } = await admin.storage.from(bucket).upload(path, binary, { contentType: content_type });
        if (error) return makeError(error.message);
        return makeSuccess(data, "File uploaded");
      }
      case "supabase_storage_download": {
        const { bucket, path } = args as { bucket: string; path: string };
        const { data, error } = await admin.storage.from(bucket).download(path);
        if (error) return makeError(error.message);
        const buffer = await data.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return makeSuccess({ file_data: base64, content_length: buffer.byteLength }, "Downloaded");
      }
      case "supabase_storage_delete": {
        const { bucket, paths } = args as { bucket: string; paths: string[] };
        const { data, error } = await admin.storage.from(bucket).remove(paths);
        if (error) return makeError(error.message);
        return makeSuccess(data, `Deleted ${paths.length} files`);
      }

      // --- Edge Functions ---
      case "supabase_edge_function": {
        const { function_name, body, method = "POST" } = args as {
          function_name: string; body?: object; method?: string
        };
        const { data, error } = await admin.functions.invoke(function_name, { body, method: method as any });
        if (error) return makeError(normalizeError(error), JSON.stringify(error));
        return makeSuccess(data, `Function invoked`);
      }

      // --- Utility ---
      case "supabase_ping": {
        const start = Date.now();
        const { error } = await anon.from("profiles").select("id").limit(1);
        const latency = Date.now() - start;
        if (error && error.code !== "PGRST116") return makeError("Ping failed", error.message);
        return makeSuccess({ latency_ms: latency, url: SUPABASE_URL, status: "ok" }, "Connected");
      }
      case "supabase_db_list_tables": {
        // Try via information_schema first (more compatible)
        const { data, error } = await admin.from("information_schema.tables")
          .select("table_name")
          .eq("table_schema", "public")
          .limit(100);
        if (error) return makeError("Cannot list tables", error.message);
        const tableNames = (data || []).map((t: any) => t.table_name);
        return makeSuccess(tableNames, `Found ${tableNames.length} tables`);
      }
      case "supabase_health_check": {
        const checks: Record<string, string> = {};
        try {
          const { error: dbErr } = await anon.from("profiles").select("id").limit(1);
          checks.db = dbErr ? `Error: ${dbErr.message}` : "ok";
        } catch (e) { checks.db = normalizeError(e); }
        try {
          const buckets = await admin.storage.listBuckets();
          checks.storage = buckets.error ? `Error: ${buckets.error.message}` : "ok";
        } catch (e) { checks.storage = normalizeError(e); }
        try {
          const auth = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
          checks.auth = auth.error ? `Error: ${auth.error.message}` : "ok";
        } catch (e) { checks.auth = normalizeError(e); }
        const allOk = Object.values(checks).every(v => v === "ok");
        return makeSuccess({ status: allOk ? "healthy" : "degraded", checks });
      }

      default:
        return makeError(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return makeError(normalizeError(err));
  }
}

// ============= SERVER =============
const server = new Server(
  {
    name: "supabase-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: normalizeError(err) }, null, 2)
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP Supabase] Server started on stdio");
}

main().catch((err) => {
  console.error("[MCP Supabase] Fatal error:", err);
  process.exit(1);
});
