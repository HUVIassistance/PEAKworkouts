var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var NOTION_VERSION = "2022-06-28";
var DB_PROGRAMMES = "3fd084dd-a9d6-808b-b97f-ea072ea52322";
var DB_SESSIONS = "ba7adb2f-de0f-4545-b933-07262983b1f8";
var ALLOWED_ORIGINS = ["https://train.huvioptimisation.com", "https://huviassistance.github.io"];
var LB_TO_KG = 0.45359237;
var json = /* @__PURE__ */ __name((body, status, origin) => new Response(JSON.stringify(body, null, 2), {
  status: status || 200,
  headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) }
}), "json");
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.indexOf(origin) >= 0 || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-peak-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
async function notion(env, path, payload, method) {
  const res = await fetch("https://api.notion.com" + path, {
    method: method || (payload ? "POST" : "GET"),
    headers: {
      Authorization: "Bearer " + env.NOTION_TOKEN,
      "Notion-Version": NOTION_VERSION,
      "content-type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : void 0
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new Error("Notion " + res.status + " " + path + " :: " + JSON.stringify(data).slice(0, 300));
  return data;
}
__name(notion, "notion");
var rt = /* @__PURE__ */ __name((v) => Array.isArray(v) ? v.map((x) => x.plain_text || "").join("") : "", "rt");
var num = /* @__PURE__ */ __name((v) => typeof v === "number" ? v : null, "num");
var norm = /* @__PURE__ */ __name((s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), "norm");
function aliases(title) {
  const out = /* @__PURE__ */ new Set([norm(title)]);
  const noParen = title.replace(/\([^)]*\)/g, " ");
  out.add(norm(noParen));
  const inside = title.match(/\(([^)]*)\)/g) || [];
  inside.forEach((p) => out.add(norm(p.replace(/[()]/g, " "))));
  return [...out].filter((a) => a.length > 1);
}
__name(aliases, "aliases");
async function blockLines(env, blockId, depth) {
  const d = depth || 0;
  if (d > 2) return [];
  const res = await notion(env, "/v1/blocks/" + blockId + "/children?page_size=100");
  const lines = [];
  for (const b of res.results || []) {
    const type = b.type;
    const body = b[type] || {};
    const text = rt(body.rich_text).trim();
    if (text && ["paragraph", "bulleted_list_item", "numbered_list_item", "heading_1", "heading_2", "heading_3", "quote", "toggle"].indexOf(type) >= 0) {
      lines.push({ text, type });
    }
    if (b.has_children) {
      const kids = await blockLines(env, b.id, d + 1);
      kids.forEach((k) => lines.push(k));
    }
  }
  return lines;
}
__name(blockLines, "blockLines");
var SECTION_RE = /^s[ée]ance\s+([a-z0-9]+)\s*[:：]?/i;
var SUPERSET_RE = /^superset\s*(\d+)/i;
var EXO_RE = /^(.+?)\s+(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/i;
function parseSections(lines) {
  const sections = [];
  let current = null;
  let superset = null;
  let order = 0;
  for (const { text } of lines) {
    const t = text.trim();
    if (!t) continue;
    const sec = t.match(SECTION_RE);
    if (sec) {
      current = { label: sec[1].toUpperCase(), exercises: [] };
      sections.push(current);
      superset = null;
      order = 0;
      continue;
    }
    if (/^fin\b/i.test(t) && current) {
      superset = null;
      continue;
    }
    const ss = t.match(SUPERSET_RE);
    if (ss && current) {
      superset = "SS" + ss[1];
      continue;
    }
    const ex = t.match(EXO_RE);
    if (ex && current) {
      order += 1;
      current.exercises.push({
        name: ex[1].trim().replace(/[-–,:;]+$/, ""),
        sets: parseInt(ex[2], 10),
        reps: parseInt(ex[3], 10),
        repsMax: ex[4] ? parseInt(ex[4], 10) : null,
        superset,
        order,
        weightKg: null
      });
    }
  }
  return sections;
}
__name(parseSections, "parseSections");
async function weightMap(env, workoutPage) {
  const rel = workoutPage.properties.Exercices && workoutPage.properties.Exercices.relation || [];
  const map = /* @__PURE__ */ new Map();
  for (const r of rel) {
    const page = await notion(env, "/v1/pages/" + r.id);
    const p = page.properties;
    const name = rt(p.Exercice && p.Exercice.title);
    const lbs = num(p["S\xE9rie 1 (Lbs)"] && p["S\xE9rie 1 (Lbs)"].number);
    if (!name) continue;
    const weightKg = lbs != null && lbs > 0 ? Math.round(lbs * LB_TO_KG * 2) / 2 : null;
    for (const a of aliases(name)) {
      if (!map.has(a) || map.get(a) == null && weightKg != null) map.set(a, weightKg);
    }
  }
  return map;
}
__name(weightMap, "weightMap");
function lookupWeight(map, name) {
  for (const a of aliases(name)) {
    if (map.has(a) && map.get(a) != null) return map.get(a);
  }
  for (const a of aliases(name)) {
    for (const [k, v] of map) {
      if (v == null) continue;
      if (k.indexOf(a) >= 0 || a.indexOf(k) >= 0) return v;
    }
  }
  return null;
}
__name(lookupWeight, "lookupWeight");
async function buildProgram(env) {
  const q = await notion(env, "/v1/databases/" + DB_PROGRAMMES + "/query", {
    page_size: 50,
    filter: { property: "Actif ?", checkbox: { equals: true } }
  });
  const actifs = (q.results || []).slice().sort((a, b) => {
    const da = a.properties.Date && a.properties.Date.date && a.properties.Date.date.start || "";
    const db = b.properties.Date && b.properties.Date.date && b.properties.Date.date.start || "";
    if (da !== db) return db.localeCompare(da);
    return (b.created_time || "").localeCompare(a.created_time || "");
  });
  if (!actifs.length) {
    return { program: null, warning: "Aucun programme avec \xAB Actif ? \xBB coch\xE9 dans Notion." };
  }
  const prog = actifs[0];
  const props = prog.properties;
  const planning = {
    muscu: num(props["S\xE9ances muscu/sem."] && props["S\xE9ances muscu/sem."].number),
    cardio: num(props["Cardio/sem."] && props["Cardio/sem."].number),
    repos: num(props["Repos/sem."] && props["Repos/sem."].number)
  };
  const workoutIds = props["Workouts li\xE9s"] && props["Workouts li\xE9s"].relation || [];
  const workouts = [];
  for (const rel of workoutIds) {
    const page = await notion(env, "/v1/pages/" + rel.id);
    const title = rt(page.properties.Workouts && page.properties.Workouts.title);
    const m = title.match(/s[ée]ance\s*(\d+)/i);
    const wanted = m ? parseInt(m[1], 10) : 1;
    const lines = await blockLines(env, rel.id, 0);
    const sections = parseSections(lines);
    const section = sections[wanted - 1] || sections[0] || { label: null, exercises: [] };
    const wmap = await weightMap(env, page);
    const exercises = section.exercises.map((e) => {
      const kg = lookupWeight(wmap, e.name);
      return { ...e, weightKg: kg, hasWeight: kg != null };
    });
    workouts.push({
      notionId: rel.id,
      name: title,
      sectionLabel: section.label,
      sectionsFound: sections.map((s) => s.label),
      exercises
    });
  }
  return {
    program: {
      notionId: prog.id,
      name: rt(props["Nom du programme"] && props["Nom du programme"].title),
      planning,
      workouts
    },
    meta: {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      activeCount: actifs.length,
      note: "Exercices et ordre = contenu de la page du workout. Charges = base Exercices (Lbs \u2192 kg)."
    }
  };
}
__name(buildProgram, "buildProgram");
async function pushSession(env, body) {
  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) throw new Error("sessionId requis");
  if (!body.title) throw new Error("title requis");
  const existing = await notion(env, "/v1/databases/" + DB_SESSIONS + "/query", {
    page_size: 1,
    filter: { property: "Session ID", rich_text: { equals: sessionId } }
  });
  if ((existing.results || []).length) {
    return { ok: true, deduped: true, pageId: existing.results[0].id, url: existing.results[0].url };
  }
  const props = {
    Titre: { title: [{ text: { content: String(body.title).slice(0, 180) } }] },
    "Session ID": { rich_text: [{ text: { content: sessionId } }] },
    Source: { select: { name: "PEAK app" } }
  };
  if (body.date) props.Date = { date: { start: body.date } };
  if (body.durationMin != null) props["Dur\xE9e (min)"] = { number: Math.round(body.durationMin) };
  if (body.setsDone != null) props["S\xE9ries faites"] = { number: body.setsDone };
  if (body.setsPlanned != null) props["S\xE9ries pr\xE9vues"] = { number: body.setsPlanned };
  if (body.volumeKg != null) props["Volume (kg)"] = { number: Math.round(body.volumeKg) };
  if (body.notes) props.Notes = { rich_text: [{ text: { content: String(body.notes).slice(0, 1900) } }] };
  if (body.feeling) props.Feeling = { select: { name: body.feeling } };
  if (body.workoutNotionId) props["Workout li\xE9"] = { relation: [{ id: body.workoutNotionId }] };
  const children = [{ object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Exercices r\xE9alis\xE9s" } }] } }];
  for (const ex of body.exercises || []) {
    const sets = (ex.sets || []).filter((s) => s && (s.reps != null || s.weight != null)).map((s) => (s.weight ? s.weight + " kg \xD7 " : "") + (s.reps != null ? s.reps : "?") + " reps").join(" \xB7 ");
    const tag = ex.superset ? "[" + ex.superset + "] " : "";
    children.push({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: (tag + ex.name + (sets ? " \u2014 " + sets : "")).slice(0, 1900) } }] }
    });
  }
  const page = await notion(env, "/v1/pages", {
    parent: { database_id: DB_SESSIONS },
    properties: props,
    children: children.slice(0, 100)
  });
  return { ok: true, deduped: false, pageId: page.id, url: page.url, exercises: (body.exercises || []).length };
}
__name(pushSession, "pushSession");
var index_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    try {
      if (url.pathname === "/health") {
        return json({ ok: true, service: "peak-api", hasNotionToken: !!env.NOTION_TOKEN, at: (/* @__PURE__ */ new Date()).toISOString() }, 200, origin);
      }
      if (env.PEAK_KEY && request.headers.get("x-peak-key") !== env.PEAK_KEY) {
        return json({ ok: false, error: "cle invalide" }, 401, origin);
      }
      if (url.pathname === "/program" && request.method === "GET") {
        return json(await buildProgram(env), 200, origin);
      }
      if (url.pathname === "/session" && request.method === "POST") {
        const body = await request.json();
        return json(await pushSession(env, body), 200, origin);
      }
      return json({ ok: false, error: "route inconnue: " + url.pathname }, 404, origin);
    } catch (err) {
      return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500, origin);
    }
  }
};

// ../../profiles/coda/home/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../profiles/coda/home/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-aixQiz/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../profiles/coda/home/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-aixQiz/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
