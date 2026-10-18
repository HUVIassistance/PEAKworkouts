/**
 * PEAK workouts — API Worker (Cloudflare)
 *
 * Deux routes, un seul secret côté serveur (le token Notion ne touche jamais le navigateur) :
 *   GET  /program  → programme actif Notion (le plus récent si plusieurs « Actif ? »),
 *                    ses workouts, leurs exercices (ordre, supersets), + le planning.
 *   POST /session  → crée une page dans « Calendrier d'entrainement (Séances) ».
 *                    Idempotent : dédup par « Session ID ».
 *   GET  /health   → ping.
 *
 * Source de vérité des exercices et de leur ORDRE = le CONTENU de la page du workout
 * (paragraphes « Superset N : » puis lignes « Nom 3x12-15 »). Les charges, elles,
 * viennent de la base « Exercices » liée au workout (colonnes Série N en Lbs → converties en kg).
 */

const NOTION_VERSION = '2022-06-28';
const DB_PROGRAMMES = '3fd084dd-a9d6-808b-b97f-ea072ea52322';
const DB_WORKOUTS = '1113d4e3-6c03-49b5-8c48-b3e743c76841';
const DB_SESSIONS = 'ba7adb2f-de0f-4545-b933-07262983b1f8';

const ALLOWED_ORIGINS = ['https://train.huvioptimisation.com', 'https://huviassistance.github.io'];
// Les charges Notion sont en KILOGRAMMES (validé par Hugo le 2026-10-18).
// Aucune conversion n'est appliquée — ne pas réintroduire de lbs→kg.

const json = (body, status, origin) =>
  new Response(JSON.stringify(body, null, 2), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });

function corsHeaders(origin) {
  const allowed =
    ALLOWED_ORIGINS.indexOf(origin) >= 0 || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,x-peak-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function notion(env, path, payload, method) {
  const res = await fetch('https://api.notion.com' + path, {
    method: method || (payload ? 'POST' : 'GET'),
    headers: {
      Authorization: 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': NOTION_VERSION,
      'content-type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new Error('Notion ' + res.status + ' ' + path + ' :: ' + JSON.stringify(data).slice(0, 300));
  return data;
}

const rt = (v) => (Array.isArray(v) ? v.map((x) => x.plain_text || '').join('') : '');
const num = (v) => (typeof v === 'number' ? v : null);

// ---------------------------------------------------------------- parsing

const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** alias d'un nom d'exercice : nom complet, sans parenthèses, et contenu des parenthèses. */
function aliases(title) {
  const out = new Set([norm(title)]);
  const noParen = title.replace(/\([^)]*\)/g, ' ');
  out.add(norm(noParen));
  const inside = title.match(/\(([^)]*)\)/g) || [];
  inside.forEach((p) => out.add(norm(p.replace(/[()]/g, ' '))));
  return [...out].filter((a) => a.length > 1);
}

async function blockLines(env, blockId, depth) {
  const d = depth || 0;
  if (d > 2) return [];
  const res = await notion(env, '/v1/blocks/' + blockId + '/children?page_size=100');
  const lines = [];
  for (const b of res.results || []) {
    const type = b.type;
    const body = b[type] || {};
    const text = rt(body.rich_text).trim();
    if (text && ['paragraph', 'bulleted_list_item', 'numbered_list_item', 'heading_1', 'heading_2', 'heading_3', 'quote', 'toggle'].indexOf(type) >= 0) {
      lines.push({ text, type });
    }
    if (b.has_children) {
      const kids = await blockLines(env, b.id, d + 1);
      kids.forEach((k) => lines.push(k));
    }
  }
  return lines;
}

const SECTION_RE = /^s[ée]ance\s+([a-z0-9]+)\s*[:：]?/i;
const SUPERSET_RE = /^superset\s*(\d+)/i;
// « Push-ups 3x12-15 » ou « RDL 3x15 @ 10 » ou « RDL 3x15 @ 10/10/12 kg »
const EXO_RE =
  /^(.+?)\s+(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?(?:\s*@\s*([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+(?:[.,][0-9]+)?)*)\s*(?:kgs?|lbs?)?)?\s*$/i;

/** Découpe le contenu de page en sections « Séance X » puis en exercices ordonnés. */
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
      superset = 'SS' + ss[1];
      continue;
    }
    const ex = t.match(EXO_RE);
    if (ex && current) {
      order += 1;
      const loads = ex[5]
        ? ex[5]
            .split('/')
            .map((s) => parseFloat(s.replace(',', '.')))
            .filter((n) => !isNaN(n))
        : [];
      current.exercises.push({
        name: ex[1].trim().replace(/[-–,:;]+$/, ''),
        sets: parseInt(ex[2], 10),
        reps: parseInt(ex[3], 10),
        repsMax: ex[4] ? parseInt(ex[4], 10) : null,
        superset: superset,
        order: order,
        weights: loads, // charges écrites dans le contenu, en kg
        weightKg: loads.length ? loads[0] : null,
      });
    }
  }
  return sections;
}

/** Charges déclarées dans la base « Exercices » liée au workout.
 *  Les colonnes s'appellent encore « Série N (Lbs) » mais les valeurs sont en KG. */
async function weightMap(env, workoutPage) {
  const rel = (workoutPage.properties.Exercices && workoutPage.properties.Exercices.relation) || [];
  const map = new Map();
  const readKg = (p, i) => {
    for (const key of ['Série ' + i + ' (kg)', 'Série ' + i + ' (Lbs)']) {
      const prop = p[key];
      const v = num(prop && prop.number);
      if (v != null && v > 0) return v;
    }
    return null;
  };
  for (const r of rel) {
    const page = await notion(env, '/v1/pages/' + r.id);
    const p = page.properties;
    const name = rt(p.Exercice && p.Exercice.title);
    if (!name) continue;
    const sets = [1, 2, 3].map((i) => readKg(p, i)).filter((v) => v != null);
    const kg = sets.length ? sets[0] : null;
    for (const a of aliases(name)) {
      if (!map.has(a) || (map.get(a) == null && kg != null)) map.set(a, kg);
    }
  }
  return map;
}

function lookupWeight(map, name) {
  for (const a of aliases(name)) {
    if (map.has(a) && map.get(a) != null) return map.get(a);
  }
  // repli : inclusion partielle (ex. « rdl » vs « romanian deadlifts »)
  for (const a of aliases(name)) {
    for (const [k, v] of map) {
      if (v == null) continue;
      if (k.indexOf(a) >= 0 || a.indexOf(k) >= 0) return v;
    }
  }
  return null;
}

// ---------------------------------------------------------------- /program

async function buildProgram(env) {
  const q = await notion(env, '/v1/databases/' + DB_PROGRAMMES + '/query', {
    page_size: 50,
    filter: { property: 'Actif ?', checkbox: { equals: true } },
  });

  const actifs = (q.results || []).slice().sort((a, b) => {
    const da = (a.properties.Date && a.properties.Date.date && a.properties.Date.date.start) || '';
    const db = (b.properties.Date && b.properties.Date.date && b.properties.Date.date.start) || '';
    if (da !== db) return db.localeCompare(da); // plus récent d'abord
    return (b.created_time || '').localeCompare(a.created_time || '');
  });

  if (!actifs.length) {
    return { program: null, warning: 'Aucun programme avec « Actif ? » coché dans Notion.' };
  }

  const prog = actifs[0];
  const props = prog.properties;
  const planning = {
    muscu: num(props['Séances muscu/sem.'] && props['Séances muscu/sem.'].number),
    cardio: num(props['Cardio/sem.'] && props['Cardio/sem.'].number),
    repos: num(props['Repos/sem.'] && props['Repos/sem.'].number),
  };

  const workoutIds = (props['Workouts liés'] && props['Workouts liés'].relation) || [];
  const workouts = [];

  for (const rel of workoutIds) {
    const page = await notion(env, '/v1/pages/' + rel.id);
    const title = rt(page.properties.Workouts && page.properties.Workouts.title);

    // « (Séance 1) » dans le titre → on prend la 1re section du contenu ; sinon la 1re aussi.
    const m = title.match(/s[ée]ance\s*(\d+)/i);
    const wanted = m ? parseInt(m[1], 10) : 1;

    const lines = await blockLines(env, rel.id, 0);
    const sections = parseSections(lines);
    const section = sections[wanted - 1] || sections[0] || { label: null, exercises: [] };

    const wmap = await weightMap(env, page);
    const exercises = section.exercises.map((e) => {
      const dbKg = lookupWeight(wmap, e.name);
      const fromContent = e.weights && e.weights.length ? e.weights : [];
      const weights = fromContent.length ? fromContent : dbKg != null ? [dbKg] : [];
      return {
        ...e,
        weights,
        weightKg: weights.length ? weights[0] : null,
        hasWeight: weights.length > 0,
        weightSource: fromContent.length ? 'contenu' : dbKg != null ? 'base Exercices' : null,
      };
    });

    workouts.push({
      notionId: rel.id,
      name: title,
      sectionLabel: section.label,
      sectionsFound: sections.map((s) => s.label),
      exercises,
    });
  }

  return {
    program: {
      notionId: prog.id,
      name: rt(props['Nom du programme'] && props['Nom du programme'].title),
      planning,
      workouts,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      activeCount: actifs.length,
      note: 'Exercices et ordre = contenu de la page du workout. Charges en kg (contenu « @ 10 » ou base Exercices).',
    },
  };
}

// ---------------------------------------------------------------- /session

async function pushSession(env, body) {
  const sessionId = String(body.sessionId || '').trim();
  if (!sessionId) throw new Error('sessionId requis');
  if (!body.title) throw new Error('title requis');

  const existing = await notion(env, '/v1/databases/' + DB_SESSIONS + '/query', {
    page_size: 1,
    filter: { property: 'Session ID', rich_text: { equals: sessionId } },
  });
  if ((existing.results || []).length) {
    return { ok: true, deduped: true, pageId: existing.results[0].id, url: existing.results[0].url };
  }

  const props = {
    Titre: { title: [{ text: { content: String(body.title).slice(0, 180) } }] },
    'Session ID': { rich_text: [{ text: { content: sessionId } }] },
    Source: { select: { name: 'PEAK app' } },
  };
  if (body.date) props.Date = { date: { start: body.date } };
  if (body.durationMin != null) props['Durée (min)'] = { number: Math.round(body.durationMin) };
  if (body.setsDone != null) props['Séries faites'] = { number: body.setsDone };
  if (body.setsPlanned != null) props['Séries prévues'] = { number: body.setsPlanned };
  if (body.volumeKg != null) props['Volume (kg)'] = { number: Math.round(body.volumeKg) };
  if (body.notes) props.Notes = { rich_text: [{ text: { content: String(body.notes).slice(0, 1900) } }] };
  if (body.feeling) props.Feeling = { select: { name: body.feeling } };
  if (body.workoutNotionId) props['Workout lié'] = { relation: [{ id: body.workoutNotionId }] };

  const children = [{ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Exercices réalisés' } }] } }];
  for (const ex of body.exercises || []) {
    const sets = (ex.sets || [])
      .filter((s) => s && (s.reps != null || s.weight != null))
      .map((s) => (s.weight ? s.weight + ' kg × ' : '') + (s.reps != null ? s.reps : '?') + ' reps')
      .join(' · ');
    const tag = ex.superset ? '[' + ex.superset + '] ' : '';
    children.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: [{ text: { content: (tag + ex.name + (sets ? ' — ' + sets : '')).slice(0, 1900) } }] },
    });
  }

  const page = await notion(env, '/v1/pages', {
    parent: { database_id: DB_SESSIONS },
    properties: props,
    children: children.slice(0, 100),
  });

  return { ok: true, deduped: false, pageId: page.id, url: page.url, exercises: (body.exercises || []).length };
}

// ---------------------------------------------------------------- router

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      if (url.pathname === '/health') {
        return json({ ok: true, service: 'peak-api', hasNotionToken: !!env.NOTION_TOKEN, at: new Date().toISOString() }, 200, origin);
      }

      if (env.PEAK_KEY && request.headers.get('x-peak-key') !== env.PEAK_KEY) {
        return json({ ok: false, error: 'cle invalide' }, 401, origin);
      }

      if (url.pathname === '/program' && request.method === 'GET') {
        return json(await buildProgram(env), 200, origin);
      }

      if (url.pathname === '/session' && request.method === 'POST') {
        const body = await request.json();
        return json(await pushSession(env, body), 200, origin);
      }

      return json({ ok: false, error: 'route inconnue: ' + url.pathname }, 404, origin);
    } catch (err) {
      return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500, origin);
    }
  },
};
