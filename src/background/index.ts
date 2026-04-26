import type {
  CookieRecord,
  FrameInfo,
  IndexedDbDatabaseInfo,
  PanelMessage,
  PanelReply,
  StorageRequest,
  StorageResponse
} from "../shared/types";
import { isIdempotent } from "../shared/rpcIds";
import { executeStorageRequest } from "../shared/executeStorageRequest";

const SESSION_PREFIX = "rpc:";

function sessionSet(id: string, type: StorageRequest["type"], idempotent: boolean): void {
  if (!chrome.storage?.session) return;
  void chrome.storage.session.set({
    [`${SESSION_PREFIX}${id}`]: { id, type, startedAt: Date.now(), idempotent }
  });
}

function sessionDelete(id: string): void {
  if (!chrome.storage?.session) return;
  void chrome.storage.session.remove(`${SESSION_PREFIX}${id}`);
}

// On worker startup, check for orphaned in-flight entries from a previous
// worker lifetime and notify connected panels so they can reconcile.
chrome.runtime.onInstalled.addListener(() => { void cleanupOrphanedSession(); });
chrome.runtime.onStartup.addListener(() => { void cleanupOrphanedSession(); });

async function cleanupOrphanedSession(): Promise<void> {
  if (!chrome.storage?.session) return;
  const all = await chrome.storage.session.get(null);
  const orphaned = Object.keys(all).filter((k) => k.startsWith(SESSION_PREFIX));
  if (orphaned.length > 0) {
    await chrome.storage.session.remove(orphaned);
    // Broadcast PANEL_RESYNC so any open panels can re-trigger idempotent queries.
    chrome.runtime.sendMessage({ type: "PANEL_RESYNC", orphanCount: orphaned.length }).catch(() => undefined);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (message: PanelMessage) => {
    sessionSet(message.id, message.request.type, isIdempotent(message.request));
    const response = await handleStorageRequest(message.request);
    sessionDelete(message.id);
    const reply: PanelReply = { id: message.id, response };
    port.postMessage(reply);
  });
});

async function handleStorageRequest(request: StorageRequest): Promise<StorageResponse> {
  try {
    if (request.type === "discover") {
      return await discoverAcrossFrames(request.tabId);
    }

    // Cookie RPCs — handled directly in the service worker via chrome.cookies API.
    if (request.type === "readCookies") {
      const cookies = await chrome.cookies.getAll({ url: request.url });
      const rows: CookieRecord[] = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expirationDate: c.expirationDate,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite ?? "unspecified",
        session: c.session,
      }));
      return { ok: true, data: { rows } };
    }

    if (request.type === "setCookie") {
      await chrome.cookies.set(request.details);
      return { ok: true, data: { success: true } };
    }

    if (request.type === "removeCookie") {
      await chrome.cookies.remove({ url: request.url, name: request.name });
      return { ok: true, data: { success: true } };
    }

    if (request.type === "clearCookies") {
      const cookies = await chrome.cookies.getAll({ url: request.url });
      for (const cookie of cookies) {
        const cookieUrl = `${cookie.secure ? "https" : "http"}://${cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
        await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
      }
      return { ok: true, data: { success: true } };
    }

    // RPCs that target a specific frame (IndexedDB per-origin partition).
    if ("frameId" in request) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: request.tabId, frameIds: [request.frameId] },
        world: "MAIN",
        args: [request],
        func: executeStorageRequest
      });
      return result as StorageResponse;
    }

    // KV RPCs run in the top frame.
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      world: "MAIN",
      args: [request],
      func: executeStorageRequest
    });
    return result as StorageResponse;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function discoverAcrossFrames(tabId: number): Promise<StorageResponse> {
  let frames: chrome.webNavigation.GetAllFrameResultDetails[] | null = null;
  try {
    frames = (await chrome.webNavigation.getAllFrames({ tabId })) ?? null;
  } catch {
    frames = null;
  }

  // Skip frames we can never script into (about:srcdoc, chrome-extension://,
  // chrome://, data URIs, blob: — webNavigation returns them but executeScript
  // with world:"MAIN" will reject).
  const scriptable = (frames ?? []).filter((f) => {
    if (f.errorOccurred) return false;
    const url = f.url ?? "";
    if (!url) return f.frameId === 0;
    return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
  });

  const targetFrames: { frameId: number; url?: string }[] = scriptable.length > 0
    ? scriptable.map((f) => ({ frameId: f.frameId, url: f.url }))
    : [{ frameId: 0 }];

  const indexedDb: IndexedDbDatabaseInfo[] = [];
  const seen = new Set<string>();
  const frameInfos: FrameInfo[] = [];
  const frameErrors: string[] = [];
  let topOrigin = "";
  let topUrl = "";
  let topLocalStorage = { count: 0, bytes: 0 };
  let topSessionStorage = { count: 0, bytes: 0 };

  // Scan frames in parallel — serial scanning on a tab with 20+ frames is slow.
  const results = await Promise.all(targetFrames.map(async (frame) => {
    try {
      const [execution] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frame.frameId] },
        world: "MAIN",
        args: [{ type: "discover", tabId } as StorageRequest],
        func: executeStorageRequest
      });
      return { frame, result: execution?.result, error: null as string | null };
    } catch (error) {
      return { frame, result: null, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  for (const { frame, result, error } of results) {
    if (error) {
      frameErrors.push(`frame ${frame.frameId} (${frame.url ?? "?"}): ${error}`);
      continue;
    }
    if (!result || typeof result !== "object" || !("ok" in result) || !(result as { ok: boolean }).ok) {
      const errMsg = (result as { error?: string } | null)?.error ?? "no result";
      frameErrors.push(`frame ${frame.frameId} (${frame.url ?? "?"}): ${errMsg}`);
      continue;
    }
    const payload = (result as unknown as { data: {
      origin: string;
      indexedDb: Array<Omit<IndexedDbDatabaseInfo, "origin" | "frameId" | "bucketName"> & { bucketName?: string }>;
      localStorage: { count: number; bytes: number };
      sessionStorage: { count: number; bytes: number };
    } }).data;

    frameInfos.push({ frameId: frame.frameId, origin: payload.origin, url: frame.url ?? payload.origin });

    if (frame.frameId === 0) {
      topOrigin = payload.origin;
      topUrl = frame.url ?? payload.origin;
      topLocalStorage = payload.localStorage;
      topSessionStorage = payload.sessionStorage;
    }

    for (const db of payload.indexedDb) {
      const bucketName = db.bucketName ?? "default";
      const key = `${payload.origin}::${bucketName}::${db.name}::v${db.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      indexedDb.push({
        name: db.name,
        version: db.version,
        stores: db.stores,
        origin: payload.origin,
        frameId: frame.frameId,
        bucketName
      });
    }
  }

  // Log per-frame errors to the service worker console so users can inspect via
  // chrome://extensions → service worker.
  if (frameErrors.length > 0) {
    console.warn("[idxbeaver] discovery errors:", frameErrors);
  }

  // Get cookie count for the top frame URL.
  let topCookies = { count: 0, bytes: 0 };
  if (topUrl) {
    try {
      const cookies = await chrome.cookies.getAll({ url: topUrl });
      const bytes = cookies.reduce((sum, c) => sum + c.name.length + c.value.length, 0);
      topCookies = { count: cookies.length, bytes };
    } catch {
      // cookies permission may not be available
    }
  }

  // Get cache storage names for the top frame.
  let topCacheStorage: { caches: { name: string; entryCount: number | null }[] } = { caches: [] };
  if (targetFrames.length > 0) {
    try {
      const topFrame = targetFrames.find((f) => f.frameId === 0) ?? targetFrames[0];
      const [cacheExec] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [topFrame.frameId] },
        world: "MAIN",
        func: async () => {
          try {
            if (typeof caches === "undefined") return { caches: [] };
            const names = await caches.keys();
            return { caches: names.map((n: string) => ({ name: n, entryCount: null })) };
          } catch {
            return { caches: [] };
          }
        }
      });
      if (cacheExec?.result) {
        topCacheStorage = cacheExec.result as { caches: { name: string; entryCount: number | null }[] };
      }
    } catch {
      // Cache API not available
    }
  }

  return {
    ok: true,
    data: {
      origin: topOrigin,
      url: topUrl,
      indexedDb,
      localStorage: topLocalStorage,
      sessionStorage: topSessionStorage,
      cookies: topCookies,
      cacheStorage: topCacheStorage,
      frames: frameInfos
    }
  };
}


