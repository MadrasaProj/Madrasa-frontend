// ── Multi-Tier Persistent Slug & Tenant Preferences Storage ─────────────────
// Ensures the madrasa slug survives aggressive mobile eviction (iOS ITP 7-day cap,
// Android storage/battery optimizers), offline periods, and app restarts.

const LS_SLUG_KEY = "madrasa_active_slug";
const LS_ROLE_KEY = "madrasa_last_role";
const TWA_PREFS_KEY = "twa-landing-prefs";
const COOKIE_SLUG_KEY = "madrasa_slug";
const COOKIE_ROLE_KEY = "madrasa_role";
const IDB_NAME = "smart_madrasa_store";
const IDB_STORE = "meta";
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

export type StoredTenantPrefs = {
  slug: string;
  role: "admin" | "teacher" | "parent" | "committee" | null;
};

// ── Cookie Helpers ──────────────────────────────────────────────────────────
function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

// ── IndexedDB Helpers ───────────────────────────────────────────────────────
function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIdb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

// ── Persistent Storage Registration ─────────────────────────────────────────
export function initPersistentStorage() {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    navigator.storage
      .persist()
      .then((persistent) => {
        if (persistent) {
          console.log("[Storage] Persistent storage granted (exempt from eviction)");
        }
      })
      .catch(() => {
        // Silently tolerate
      });
  }
}

// ── Synchronous Read (localStorage + Cookie Fallback) ───────────────────────
export function getTenantSlugSync(): StoredTenantPrefs {
  let slug = "";
  let role: StoredTenantPrefs["role"] = null;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      slug = localStorage.getItem(LS_SLUG_KEY) || "";
      const rawRole = localStorage.getItem(LS_ROLE_KEY);
      if (rawRole === "admin" || rawRole === "teacher" || rawRole === "parent" || rawRole === "committee") {
        role = rawRole;
      }

      // Legacy twa-landing-prefs fallback
      if (!slug) {
        const rawPrefs = localStorage.getItem(TWA_PREFS_KEY);
        if (rawPrefs) {
          const parsed = JSON.parse(rawPrefs);
          if (typeof parsed?.slug === "string" && parsed.slug) {
            slug = parsed.slug;
          }
          if (!role && (parsed?.role === "parent" || parsed?.role === "teacher")) {
            role = parsed.role;
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // Fallback to cookie if localStorage had no slug
  if (!slug) {
    slug = getCookie(COOKIE_SLUG_KEY) || "";
  }
  if (!role) {
    const cRole = getCookie(COOKIE_ROLE_KEY);
    if (cRole === "admin" || cRole === "teacher" || cRole === "parent" || cRole === "committee") {
      role = cRole;
    }
  }

  return { slug: slug.trim().toLowerCase(), role };
}

// ── Asynchronous Read (LocalStorage + Cookie + IndexedDB Full Fallback) ──────
export async function getTenantSlugAsync(): Promise<StoredTenantPrefs> {
  const syncPrefs = getTenantSlugSync();
  if (syncPrefs.slug) {
    return syncPrefs;
  }

  // If sync read was empty, check IndexedDB
  try {
    const idbSlug = await idbGet<string>("tenant_slug");
    const idbRole = await idbGet<StoredTenantPrefs["role"]>("tenant_role");

    if (idbSlug) {
      const normalizedSlug = idbSlug.trim().toLowerCase();
      // Restore back to localStorage and cookie
      saveTenantSlug(normalizedSlug, idbRole);
      return { slug: normalizedSlug, role: idbRole ?? null };
    }
  } catch {
    // Ignore
  }

  return { slug: "", role: null };
}

// ── Save across all 3 tiers ─────────────────────────────────────────────────
export function saveTenantSlug(
  slug: string,
  role?: string | null,
) {
  if (!slug || typeof slug !== "string") return;
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return;

  const validRole =
    role === "admin" || role === "teacher" || role === "parent" || role === "committee"
      ? role
      : null;

  // Tier 1: localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LS_SLUG_KEY, cleanSlug);
      if (validRole) {
        localStorage.setItem(LS_ROLE_KEY, validRole);
        localStorage.setItem(
          TWA_PREFS_KEY,
          JSON.stringify({ role: validRole === "parent" || validRole === "teacher" ? validRole : null, slug: cleanSlug }),
        );
      } else {
        // If role not passed, update twa-landing-prefs preserving existing role
        const raw = localStorage.getItem(TWA_PREFS_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          TWA_PREFS_KEY,
          JSON.stringify({ ...existing, slug: cleanSlug }),
        );
      }
    } catch {
      // Ignore quota errors
    }
  }

  // Tier 2: 1-Year Persistent Cookie
  setCookie(COOKIE_SLUG_KEY, cleanSlug);
  if (validRole) {
    setCookie(COOKIE_ROLE_KEY, validRole);
  }

  // Tier 3: IndexedDB
  void idbSet("tenant_slug", cleanSlug);
  if (validRole) {
    void idbSet("tenant_role", validRole);
  }
}

// ── Explicit Clear (used when user manually chooses "Switch Madrasa") ───────
export function clearTenantSlug() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(LS_SLUG_KEY);
      localStorage.removeItem(LS_ROLE_KEY);
      localStorage.removeItem(TWA_PREFS_KEY);
    } catch {
      // Ignore
    }
  }
  removeCookie(COOKIE_SLUG_KEY);
  removeCookie(COOKIE_ROLE_KEY);
  void idbDelete("tenant_slug");
  void idbDelete("tenant_role");
}
