// js/modules/search-handler.js
// Client-side search handler — fetches lists from API and searches locally.
// Simple tokenizer: quoted phrases or single words. No filters, no server-side search.

import apiClient from '../api-client.js';

/** ========== Keep high-level method wrappers (unchanged behavior) ========== */
const methods = {
    duenos: {
        all: async () => {
            try {
                const { duenos: res } = await apiClient.listarDuenos();
                return res;
            } catch (e) { console.error(`Error fetching all owners: ${e}`); return null; }
        },
        byId: async id => {
            try {
                const { dueno: res } = await apiClient.obtenerDueno(id);
                return res;
            } catch (e) { console.error(`Error fetching owner by ID ${id}: ${e}`); return null; }
        },
        byName: async name => {
            try {
                const { results: res } = await apiClient.buscarDueno(name);
                return res;
            } catch (e) { console.error(`Error fetching owner by name ${name}: ${e}`); return null; }
        }
    },
    mascotas: {
        all: async () => {
            try {
                const { mascotas: res } = await apiClient.obtenerTodasMascotas();
                return res;
            } catch (e) { console.error(`Error fetching all pets: ${e}`); return null; }
        },
        listAll: async () => {
            try {
                const { mascotas: res } = await apiClient.listarMascotas();
                return res;
            } catch (e) { console.error(`Error fetching list of all pets: ${e}`); return null; }
        },
        byId: async id => {
            try {
                const { mascota: res } = await apiClient.obtenerMascota(id);
                return res;
            } catch (e) { console.error(`Error fetching pet by ID ${id}: ${e}`); return null; }
        },
        byEspecie: async especie => {
            try {
                const { mascotas: res } = await apiClient.mascotasPorEspecie(especie);
                return res;
            } catch (e) { console.error(`Error fetching pets by species ${especie}: ${e}`); return null; }
        },
        byDueno: async id => {
            try {
                const { mascotas: res } = await apiClient.mascotasPorDueno(id);
                return res;
            } catch (e) { console.error(`Error fetching pets by owner ID ${id}: ${e}`); return null; }
        },
        byDuenoFull: async dueno_id => {
            try {
                const { results: res } = await apiClient.api('mascotas_por_dueno_full', { method: 'GET', params: { dueno_id } });
                return res;
            } catch (e) { console.error(`Error fetching full pets for owner ${dueno_id}: ${e}`); return null; }
        }
    },
    visitas: {
        all: async () => {
            try {
                const { visitas: res } = await apiClient.obtenerTodasVisitas();
                return res;
            } catch (e) { console.error(`Error fetching all visits: ${e}`); return null; }
        },
        byId: async id => {
            try {
                const { visita: res } = await apiClient.obtenerVisita(id);
                return res;
            } catch (e) { console.error(`Error fetching visit by ID ${id}: ${e}`); return null; }
        },
        byMascota: async id => {
            try {
                const { visitas: res } = await apiClient.visitasPorMascota(id);
                return res;
            } catch (e) { console.error(`Error fetching visits by pet ID ${id}: ${e}`); return null; }
        },
        byMascotaLite: async id => {
            try {
                const { visitas: res } = await apiClient.visitasPorMascotaLite(id);
                return res;
            } catch (e) { console.error(`Error fetching lite visits by pet ID ${id}: ${e}`); return null; }
        },
        byDate: async (mascota_id, date) => {
            try {
                const { visitas: res } = await apiClient.visitasPorFecha(mascota_id, date);
                return res;
            } catch (e) { console.error(`Error fetching visits by date ${date}: ${e}`); return null; }
        }
    },
    relaciones: {
        duenosPorMascota: async mascota_id => {
            try {
                const { duenos: res } = await apiClient.duenosPorMascota(mascota_id);
                return res;
            } catch (e) { console.error(`Error fetching owners by pet ID ${mascota_id}: ${e}`); return null; }
        },
        duenoMascota: async (dueno_id, mascota_id) => {
            try {
                const res = await apiClient.relacionDuenoMascota(mascota_id, dueno_id);
                return { dueno: res.dueno, mascota: res.mascota };
            } catch (e) { console.error(`Error fetching owner-pet relation for owner ID ${dueno_id} and pet ID ${mascota_id}: ${e}`); return null; }
        }
    }
};

/** ========== Simple tokenizer + parser ==========
 * - quoted phrases (double or single) become single terms
 * - unquoted words are separate terms
 * - '#123' or plain numeric token becomes id
 * - returns minimal payload: { raw, tokens, terms, id, q, page, per_page, domain }
 */
function tokenizeSimple(str) {
    if (!str) return [];
    const re = /"([^"]+)"|'([^']+)'|[^\s]+/g;
    const tokens = [];
    let m;
    while ((m = re.exec(str)) !== null) {
        if (m[1] !== undefined) tokens.push(m[1]);
        else if (m[2] !== undefined) tokens.push(m[2]);
        else tokens.push(m[0]);
    }
    return tokens;
}

function parseSearchInput(input, opts = {}) {
    const raw = (input == null ? '' : String(input));
    const tokens = tokenizeSimple(raw.trim());
    const result = {
        raw,
        tokens,
        terms: [],
        id: null,
        q: null,
        page: opts.page || 1,
        per_page: opts.per_page || 10,
        domain: opts.domain || 'any' // allow override
    };

    for (const t of tokens) {
        if (!t) continue;
        const numeric = t.match(/^#?(\d+)$/);
        if (numeric) {
            // if user typed id, capture it (exact ID search)
            result.id = Number(numeric[1]);
            continue;
        }
        // otherwise collect as search term (lowercased)
        const term = String(t).trim().toLowerCase();
        if (term) result.terms.push(term);
    }

    result.q = result.terms.length ? result.terms.join(' ') : null;
    return result;
}

/** ========== Client-side search engine ========== */
/* Caches to avoid repeated network calls for interactive search */
let _cache = {
    duenos: null,
    mascotas: null,
    visitas: null,
    lastFetchedAt: { duenos: 0, mascotas: 0, visitas: 0 }
};
const CACHE_TTL_MS = 10 * 1000; // 10 seconds TTL

/* Safe fetchers that use the wrappers above and normalize results to arrays */
async function fetchOwners(force = false) {
    if (!force && _cache.duenos && (Date.now() - _cache.lastFetchedAt.duenos) < CACHE_TTL_MS) return _cache.duenos;
    const res = await methods.duenos.all();
    _cache.duenos = Array.isArray(res) ? res : [];
    _cache.lastFetchedAt.duenos = Date.now();
    return _cache.duenos;
}
async function fetchPets(force = false) {
    if (!force && _cache.mascotas && (Date.now() - _cache.lastFetchedAt.mascotas) < CACHE_TTL_MS) return _cache.mascotas;
    const res = await methods.mascotas.all();
    _cache.mascotas = Array.isArray(res) ? res : [];
    _cache.lastFetchedAt.mascotas = Date.now();
    return _cache.mascotas;
}
async function fetchVisits(force = false) {
    if (!force && _cache.visitas && (Date.now() - _cache.lastFetchedAt.visitas) < CACHE_TTL_MS) return _cache.visitas;
    const res = await methods.visitas.all();
    _cache.visitas = Array.isArray(res) ? res : [];
    _cache.lastFetchedAt.visitas = Date.now();
    return _cache.visitas;
}

/** Helper: check if a row matches ALL terms (AND semantics).
 * Each term must be present as substring in at least one of the searchable fields.
 */
function rowMatchesTerms(row, fields, terms) {
    if (!terms || terms.length === 0) return false; // no terms -> caller decides behavior (we don't auto-match)
    for (const t of terms) {
        let found = false;
        for (const f of fields) {
            // skip if field missing
            if (!(f in row)) continue;
            const v = row[f];
            if (v == null) continue;
            const hay = String(v).toLowerCase();
            if (hay.indexOf(t) !== -1) { found = true; break; }
        }
        if (!found) return false;
    }
    return true;
}

/**
 * Perform search locally (client-side).
 *
 * @param {Object} parsedInput - from parseSearchInput()
 * @param {string} [type] - one of 'mascotas'|'duenos'|'visitas'|'any'
 * @returns {Promise<{ results: Array }>}
 */
async function performSearch(parsedInput, type = null) {
    const allowed = new Set(['mascotas', 'duenos', 'visitas', 'any']);
    let domain = (typeof type === 'string') ? type.toLowerCase() : parsedInput && parsedInput.domain ? parsedInput.domain : 'any';
    if (!allowed.has(domain)) domain = 'any';

    const { terms = [], id = null, page = 1, per_page = 10 } = parsedInput || {};

    const results = [];

    // helper to slice/paginate and return shape
    const makePage = (domainName, items) => {
        const total = items.length;
        const start = Math.max(0, (page - 1) * per_page);
        const data = items.slice(start, start + per_page);
        return { domain: domainName, page, per_page, total, data };
    };

    // owners search
    const runOwners = async () => {
        const rows = await fetchOwners();
        let matched = [];
        if (id) {
            matched = rows.filter(r => Number(r.id) === Number(id));
        } else if (!terms || terms.length === 0) {
            matched = [];
        } else {
            const searchable = ['id', 'nombre', 'apellido'];
            matched = rows.filter(r => rowMatchesTerms(r, searchable, terms));
        }
        return makePage('duenos', matched);
    };

    // pets search
    const runPets = async () => {
        const rows = await fetchPets();
        let matched = [];
        if (id) {
            matched = rows.filter(r => Number(r.id) === Number(id));
        } else if (!terms || terms.length === 0) {
            matched = [];
        } else {
            const searchable = ['id', 'nombre', 'especie', 'condicion'];
            matched = rows.filter(r => rowMatchesTerms(r, searchable, terms));
        }
        return makePage('mascotas', matched);
    };

    // visits search
    const runVisits = async () => {
        const rows = await fetchVisits();
        let matched = [];
        if (id) {
            // match either visita id or mascota_id
            matched = rows.filter(r => Number(r.id) === Number(id) || Number(r.mascota_id) === Number(id));
        } else if (!terms || terms.length === 0) {
            matched = [];
        } else {
            const searchable = ['id', 'fecha', 'diagnostico'];
            matched = rows.filter(r => rowMatchesTerms(r, searchable, terms));
        }
        return makePage('visitas', matched);
    };

    if (domain === 'duenos') {
        const r = await runOwners();
        results.push(r);
        return { results };
    }

    if (domain === 'mascotas') {
        const r = await runPets();
        results.push(r);
        return { results };
    }

    if (domain === 'visitas') {
        const r = await runVisits();
        results.push(r);
        return { results };
    }

    // domain === 'any' => run all three in parallel
    const [rOwners, rPets, rVisits] = await Promise.all([runOwners(), runPets(), runVisits()]);
    results.push(rOwners, rPets, rVisits);
    return { results };
}

/* Export API */
export { methods, parseSearchInput, performSearch };
export default { methods, parseSearchInput, performSearch };

