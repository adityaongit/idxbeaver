// Demo data seeder for landing-site screenshots.
//
// Populates IndexedDB (multiple databases / object stores), localStorage,
// sessionStorage, and a few cookies with realistic-looking values so the
// IdxBeaver extension shows interesting, on-brand content when DevTools is
// opened on the landing site.
//
// Behavior:
//   - Auto-seeds once per browser (guarded by SEED_FLAG in localStorage).
//   - Append `?reseed=1` to the URL to wipe and reseed.
//   - Append `?noseed=1` to skip seeding entirely on this visit.

const SEED_FLAG = "__idxbeaver_demo_seed_v3";

const FIRST_NAMES = [
  "Ada", "Alan", "Grace", "Linus", "Margaret", "Donald", "Barbara", "Tim",
  "Sundar", "Satya", "Sheryl", "Marissa", "Larry", "Sergey", "Jeff", "Ginni",
  "Susan", "Reshma", "Anita", "Radia", "Megan", "Jensen", "Elon", "Shantanu",
  "Parag", "Arvind", "Kiran", "Indra", "Lisa", "Brian",
];
const LAST_NAMES = [
  "Lovelace", "Turing", "Hopper", "Torvalds", "Hamilton", "Knuth", "Liskov",
  "Berners-Lee", "Pichai", "Nadella", "Sandberg", "Mayer", "Page", "Brin",
  "Bezos", "Rometty", "Wojcicki", "Saujani", "Borg", "Perlman", "Smith",
  "Huang", "Musk", "Narayen", "Agrawal", "Krishna", "Mazumdar", "Nooyi",
  "Su", "Chesky",
];
const ROLES = ["owner", "admin", "editor", "viewer", "billing"] as const;
const PLANS = ["free", "starter", "pro", "team", "enterprise"] as const;
const PRODUCTS = [
  { sku: "BVR-001", name: "Beaver Tee",        price:  2400 },
  { sku: "BVR-002", name: "Field Notebook",    price:  1800 },
  { sku: "BVR-003", name: "Enamel Pin",        price:   900 },
  { sku: "BVR-004", name: "Hardcover Manual",  price:  4900 },
  { sku: "BVR-005", name: "Sticker Pack",      price:   500 },
  { sku: "BVR-006", name: "Hoodie",            price:  6800 },
  { sku: "BVR-007", name: "Mug",               price:  1500 },
  { sku: "BVR-008", name: "Cap",               price:  2200 },
];
const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "refunded", "cancelled"] as const;
const EVENT_NAMES = [
  "page_view", "signup_started", "signup_completed", "login", "logout",
  "query_run", "export_clicked", "import_clicked", "row_edited", "snapshot_taken",
  "tab_opened", "tab_closed", "shortcut_used", "filter_applied", "schema_inferred",
];
const ROUTES = [
  "/", "/pricing", "/docs", "/docs/queries", "/docs/shortcuts",
  "/blog", "/blog/why-indexeddb-is-hard", "/changelog", "/download",
];
const REFERRERS = [
  "https://news.ycombinator.com/", "https://x.com/", "https://github.com/",
  "https://www.google.com/", "", "https://reddit.com/r/webdev",
  "https://lobste.rs/", "https://producthunt.com/",
];

// Simple seedable PRNG so the same browser gets the same demo data every reseed.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xbeaf);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const id = (() => { let n = 1000; return () => ++n; })();

function isoDaysAgo(days: number, jitterHours = 24): string {
  const ms = Date.now() - days * 86_400_000 - Math.floor(rand() * jitterHours * 3_600_000);
  return new Date(ms).toISOString();
}

function buildUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const handle = (first + last).toLowerCase().replace(/[^a-z]/g, "");
    users.push({
      id: id(),
      name: `${first} ${last}`,
      email: `${handle}@${pick(["acme.co", "globex.io", "hooli.com", "initech.dev", "umbrella.app"])}`,
      role: pick(ROLES),
      plan: pick(PLANS),
      verified: rand() > 0.15,
      createdAt: isoDaysAgo(between(0, 720)),
      lastSeenAt: isoDaysAgo(between(0, 30)),
      orgId: between(1, 8),
      tags: Array.from({ length: between(0, 3) }, () => pick(["beta", "vip", "trial", "internal", "design-partner", "self-serve"])),
    });
  }
  return users;
}

function buildOrders(count: number, userIds: number[]) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    const lineCount = between(1, 4);
    const items = Array.from({ length: lineCount }, () => {
      const p = pick(PRODUCTS);
      const qty = between(1, 3);
      return { sku: p.sku, name: p.name, qty, price: p.price, subtotal: p.price * qty };
    });
    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const tax = Math.round(subtotal * 0.08);
    orders.push({
      id: id(),
      userId: pick(userIds),
      status: pick(ORDER_STATUSES),
      currency: "USD",
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      createdAt: isoDaysAgo(between(0, 180)),
      shippingCity: pick(["Austin", "Berlin", "Bangalore", "Tokyo", "Toronto", "Lagos", "Lisbon", "São Paulo"]),
    });
  }
  return orders;
}

function buildSessions(count: number, userIds: number[]) {
  const sessions = [];
  for (let i = 0; i < count; i++) {
    const created = Date.now() - between(0, 7) * 86_400_000;
    sessions.push({
      id: crypto.randomUUID(),
      userId: pick(userIds),
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + 14 * 86_400_000).toISOString(),
      ip: `${between(1, 223)}.${between(0, 255)}.${between(0, 255)}.${between(1, 254)}`,
      userAgent: pick([
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
        "Mozilla/5.0 (X11; Linux x86_64) Firefox/127.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      ]),
      device: pick(["desktop", "mobile", "tablet"]),
    });
  }
  return sessions;
}

function buildFlags() {
  return [
    { key: "dark_mode",          enabled: true,  rolloutPct: 100, updatedAt: isoDaysAgo(40) },
    { key: "schema_autocomplete",enabled: true,  rolloutPct: 100, updatedAt: isoDaysAgo(12) },
    { key: "ai_query_assistant", enabled: false, rolloutPct: 25,  updatedAt: isoDaysAgo(3)  },
    { key: "snapshot_diff",      enabled: true,  rolloutPct: 50,  updatedAt: isoDaysAgo(8)  },
    { key: "redact_pii",         enabled: false, rolloutPct: 0,   updatedAt: isoDaysAgo(60) },
    { key: "beta_grid_v2",       enabled: true,  rolloutPct: 10,  updatedAt: isoDaysAgo(1)  },
  ];
}

function buildEvents(count: number, userIds: number[]) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: id(),
      name: pick(EVENT_NAMES),
      userId: pick(userIds),
      ts: isoDaysAgo(between(0, 30), 0),
      props: {
        path: pick(ROUTES),
        ms: between(20, 1800),
        ok: rand() > 0.05,
      },
    });
  }
  return events;
}

function buildPageviews(count: number) {
  const views = [];
  for (let i = 0; i < count; i++) {
    views.push({
      id: id(),
      path: pick(ROUTES),
      referrer: pick(REFERRERS),
      ts: isoDaysAgo(between(0, 30), 0),
      sessionId: crypto.randomUUID(),
      durationMs: between(800, 90_000),
    });
  }
  return views;
}

function buildConversations() {
  const titles = [
    "Onboarding flow tweaks",
    "Q3 pricing experiment",
    "Beaver mascot revisions",
    "DevTools panel polish",
    "Schema export bug",
    "Marketing site copy",
  ];
  return titles.map((title, i) => ({
    id: `conv_${i + 1}`,
    title,
    participantIds: Array.from({ length: between(2, 4) }, () => between(1001, 1050)),
    createdAt: isoDaysAgo(between(1, 60)),
    pinned: rand() > 0.7,
  }));
}

function buildMessages(convIds: string[]) {
  const samples = [
    "Pushed a fix — can you re-pull?",
    "Looks good. Shipping it.",
    "Reviewers wanted darker contrast on the grid.",
    "I left a comment on the PR.",
    "Renamed the column, schema export still works.",
    "Snapshot diff is gorgeous.",
    "Filed a follow-up issue.",
    "Let's defer the AI assistant flag to next week.",
  ];
  const out = [];
  for (const conv of convIds) {
    const n = between(3, 8);
    for (let i = 0; i < n; i++) {
      out.push({
        id: id(),
        conversationId: conv,
        senderId: between(1001, 1050),
        body: pick(samples),
        ts: isoDaysAgo(between(0, 30), 0),
        edited: rand() > 0.85,
      });
    }
  }
  return out;
}

// ---- IndexedDB helpers ------------------------------------------------------

type StoreDef = {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string | string[]; unique?: boolean; multiEntry?: boolean }[];
  rows: Record<string, unknown>[];
};

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

function createDb(name: string, version: number, stores: StoreDef[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of stores) {
        const opts: IDBObjectStoreParameters = {};
        if (s.keyPath) opts.keyPath = s.keyPath;
        if (s.autoIncrement) opts.autoIncrement = true;
        const store = db.createObjectStore(s.name, opts);
        for (const idx of s.indexes ?? []) {
          store.createIndex(idx.name, idx.keyPath, {
            unique: idx.unique ?? false,
            multiEntry: idx.multiEntry ?? false,
          });
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(stores.map((s) => s.name), "readwrite");
      for (const s of stores) {
        const store = tx.objectStore(s.name);
        for (const row of s.rows) store.put(row);
      }
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

// ---- Public entry -----------------------------------------------------------

export async function seedDemoData(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(SEED_FLAG)) return;

  const users = buildUsers(50);
  const userIds = users.map((u) => u.id);
  const orders = buildOrders(120, userIds);
  const sessions = buildSessions(35, userIds);
  const flags = buildFlags();
  const events = buildEvents(220, userIds);
  const pageviews = buildPageviews(160);
  const conversations = buildConversations();
  const messages = buildMessages(conversations.map((c) => c.id));

  const dbs: { name: string; version: number; stores: StoreDef[] }[] = [
    {
      name: "acme_app",
      version: 4,
      stores: [
        {
          name: "users",
          keyPath: "id",
          rows: users,
          indexes: [
            { name: "email", keyPath: "email", unique: true },
            { name: "plan", keyPath: "plan" },
            { name: "role", keyPath: "role" },
            { name: "lastSeenAt", keyPath: "lastSeenAt" },
          ],
        },
        {
          name: "orders",
          keyPath: "id",
          rows: orders,
          indexes: [
            { name: "userId", keyPath: "userId" },
            { name: "status", keyPath: "status" },
            { name: "createdAt", keyPath: "createdAt" },
            { name: "total", keyPath: "total" },
          ],
        },
        {
          name: "sessions",
          keyPath: "id",
          rows: sessions,
          indexes: [
            { name: "userId", keyPath: "userId" },
            { name: "expiresAt", keyPath: "expiresAt" },
          ],
        },
        {
          name: "feature_flags",
          keyPath: "key",
          rows: flags,
        },
      ],
    },
    {
      name: "analytics",
      version: 2,
      stores: [
        {
          name: "events",
          keyPath: "id",
          rows: events,
          indexes: [
            { name: "name", keyPath: "name" },
            { name: "userId", keyPath: "userId" },
            { name: "ts", keyPath: "ts" },
          ],
        },
        {
          name: "pageviews",
          keyPath: "id",
          rows: pageviews,
          indexes: [
            { name: "path", keyPath: "path" },
            { name: "ts", keyPath: "ts" },
          ],
        },
      ],
    },
    {
      name: "chat_history",
      version: 1,
      stores: [
        {
          name: "conversations",
          keyPath: "id",
          rows: conversations,
          indexes: [{ name: "createdAt", keyPath: "createdAt" }],
        },
        {
          name: "messages",
          keyPath: "id",
          rows: messages,
          indexes: [
            { name: "conversationId", keyPath: "conversationId" },
            { name: "ts", keyPath: "ts" },
          ],
        },
      ],
    },
    {
      name: "media_cache",
      version: 1,
      stores: [
        {
          name: "assets",
          keyPath: "url",
          rows: [
            { url: "/assets/hero-beaver.png",   bytes: 184_320, contentType: "image/png",  cachedAt: isoDaysAgo(2) },
            { url: "/assets/grid-demo.webp",    bytes:  92_430, contentType: "image/webp", cachedAt: isoDaysAgo(1) },
            { url: "/assets/icon-192.png",      bytes:  14_988, contentType: "image/png",  cachedAt: isoDaysAgo(7) },
            { url: "/assets/font-geist.woff2",  bytes:  61_204, contentType: "font/woff2", cachedAt: isoDaysAgo(14) },
            { url: "/api/manifest.json",        bytes:   2_104, contentType: "application/json", cachedAt: isoDaysAgo(0) },
          ],
        },
        {
          name: "manifests",
          keyPath: "id",
          rows: [
            { id: "v1", build: "0.2.0", generatedAt: isoDaysAgo(3), entries: 42 },
            { id: "v2", build: "0.2.1", generatedAt: isoDaysAgo(0), entries: 47 },
          ],
        },
      ],
    },
  ];

  // Wipe first when reseeding so schema/version changes apply cleanly.
  if (force) await Promise.all(dbs.map((d) => deleteDb(d.name)));

  for (const d of dbs) await createDb(d.name, d.version, d.stores);

  // localStorage — typical app keys
  const ls: Record<string, unknown> = {
    "auth.token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-token",
    "auth.userId": userIds[0],
    "theme": "dark",
    "prefs.v1": {
      density: "compact",
      defaultStore: "users",
      shortcuts: { run: "mod+enter", save: "mod+s" },
      recentDatabases: ["acme_app", "analytics"],
    },
    "i18n.locale": "en-US",
    "lastRoute": "/orders",
    "draft.query": '{ "store": "orders", "filter": { "status": "paid", "total": { "$gt": 5000 } }, "sort": { "createdAt": -1 }, "limit": 50 }',
    "feature.flags.cache": flags.reduce((acc, f) => ({ ...acc, [f.key]: f.enabled }), {}),
    "tour.completed": true,
  };
  for (const [k, v] of Object.entries(ls)) {
    localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  }

  // sessionStorage — ephemeral per-tab values
  const ss: Record<string, string> = {
    "csrf": crypto.randomUUID(),
    "tab.id": crypto.randomUUID(),
    "scroll./": "0",
    "scroll./pricing": "320",
    "panel.activeTab": "orders",
    "panel.splitRatio": "0.62",
  };
  for (const [k, v] of Object.entries(ss)) sessionStorage.setItem(k, v);

  // Cookies — non-HttpOnly, visible to the panel
  const cookieAttrs = "; path=/; SameSite=Lax; max-age=" + 60 * 60 * 24 * 30;
  document.cookie = "ab_variant=B" + cookieAttrs;
  document.cookie = "consent=accepted" + cookieAttrs;
  document.cookie = "ref=hn" + cookieAttrs;
  document.cookie = "uid=" + userIds[0] + cookieAttrs;

  localStorage.setItem(SEED_FLAG, new Date().toISOString());
}

export function shouldAutoSeed(): { run: boolean; force: boolean } {
  if (typeof window === "undefined") return { run: false, force: false };
  const params = new URLSearchParams(window.location.search);
  if (params.has("noseed")) return { run: false, force: false };
  if (params.has("reseed")) return { run: true, force: true };
  return { run: !localStorage.getItem(SEED_FLAG), force: false };
}
