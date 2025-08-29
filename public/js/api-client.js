/**
 * api-client.js (many-to-many aware)
 *
 * ES module client for api.php.
 */

/**
 * ApiError
 */
export class ApiError extends Error {
    constructor(message, status = 0, payload = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

function buildQueryString(params = {}) {
    const parts = [];
    for (const key of Object.keys(params)) {
        const value = params[key];
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
            for (const v of value) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

function toFormData(obj = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        if (v instanceof File || v instanceof Blob) {
            fd.append(k, v);
        } else if (typeof v === 'object' && !Array.isArray(v)) {
            fd.append(k, JSON.stringify(v));
        } else if (Array.isArray(v)) {
            for (const i of v) fd.append(`${k}[]`, i);
        } else {
            fd.append(k, String(v));
        }
    }
    return fd;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const DEFAULT_TIMEOUT = 10000;
let AUTH_TOKEN = null;
let CSRF_TOKEN = null;

export function setAuthToken(token) { AUTH_TOKEN = token; }
export function getAuthToken() { return AUTH_TOKEN; }
export function setCsrfToken(token) { CSRF_TOKEN = token; }

/**
 * api()
 */
export async function api(action, opts = {}, basePath = './api.php') {
    const {
        method = 'GET',
        body = null,
        params = {},
        timeout = DEFAULT_TIMEOUT,
        retries = 0,
        asForm = false,
        headers = {},
    } = opts;

    const isUrlLike = /^(?:https?:\/\/|\/)/i.test(action);
    let url;
    if (isUrlLike) {
        url = action;
    } else {
        const allParams = Object.assign({}, params, { action });
        url = `${basePath}${buildQueryString(allParams)}`;
    }

    const hdrs = Object.assign({}, headers);
    if (AUTH_TOKEN) hdrs['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    if (CSRF_TOKEN) hdrs['X-CSRF-Token'] = CSRF_TOKEN;

    let payload = null;
    if (method.toUpperCase() !== 'GET' && body != null) {
        if (asForm) {
            payload = body instanceof FormData ? body : toFormData(body);
            delete hdrs['Content-Type'];
        } else {
            hdrs['Content-Type'] = hdrs['Content-Type'] ?? 'application/json; charset=utf-8';
            payload = JSON.stringify(body);
        }
    }

    let attempt = 0;
    const maxAttempts = Math.max(1, retries + 1);

    while (attempt < maxAttempts) {
        attempt += 1;
        const controller = timeout > 0 ? new AbortController() : null;
        let timer = null;
        try {
            if (controller && timeout > 0) timer = setTimeout(() => controller.abort(), timeout);

            const res = await fetch(url, {
                method,
                headers: hdrs,
                body: payload,
                signal: controller ? controller.signal : undefined,
                credentials: 'same-origin'
            });

            if (timer) clearTimeout(timer);

            const resHeaders = res.headers;
            const contentType = resHeaders.get('content-type') || '';

            if (!contentType.includes('application/json')) {
                if (!res.ok) {
                    const txt = await res.text().catch(() => null);
                    throw new ApiError(txt || `HTTP error ${res.status}`, res.status, null);
                }
                const blob = await res.blob();
                return { ok: true, status: res.status, data: null, headers: resHeaders, blob };
            }

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const message = json && json.error ? json.error : `HTTP error ${res.status}`;
                throw new ApiError(message, res.status, json);
            }

            return { ok: true, status: res.status, data: json, headers: resHeaders, blob: null };
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                const abortErr = new ApiError('Request timed out', 0, null);
                if (attempt >= maxAttempts) throw abortErr;
            } else if (err instanceof ApiError) {
                throw err;
            } else {
                if (attempt >= maxAttempts) {
                    const msg = err && err.message ? err.message : 'Network error';
                    throw new ApiError(msg, 0, null);
                }
                const backoff = 200 * Math.pow(2, attempt - 1);
                await sleep(backoff);
                continue;
            }
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    throw new ApiError('Request failed after retries', 0, null);
}

/* Dueños */
export async function crearDueno(payload, opts = {}) {
    const r = await api('crear_dueno', Object.assign({ method: 'POST', body: payload }, opts));
    return r.data;
}
export async function listarDuenos(opts = {}) {
    const r = await api('listar_duenos', Object.assign({ method: 'GET' }, opts));
    return r.data;
}
export async function obtenerDueno(id, opts = {}) {
    const r = await api('obtener_dueno', Object.assign({ method: 'GET', params: { id } }, opts));
    return r.data;
}
export async function buscarDueno(q, opts = {}) {
    const r = await api('buscar_dueno', Object.assign({ method: 'GET', params: { q } }, opts));
    return r.data;
}
export async function editarDueno(payload, opts = {}) {
    // payload may include mascota_ids: array or csv string
    const r = await api('editar_dueno', Object.assign({ method: 'PUT', body: payload }, opts));
    return r.data;
}
export async function eliminarDueno(id, opts = {}) {
    const r = await api('eliminar_dueno', Object.assign({ method: 'DELETE', params: { id } }, opts));
    return r.data;
}

/* Mascotas */
export async function crearMascota(payload, opts = {}) {
    // payload may include dueno_ids (array or csv)
    const r = await api('crear_mascota', Object.assign({ method: 'POST', body: payload }, opts));
    return r.data;
}
export async function editarMascota(payload, opts = {}) {
    // payload must include id; may include dueno_ids to set relations (empty array to remove)
    const r = await api('editar_mascota', Object.assign({ method: 'PUT', body: payload }, opts));
    return r.data;
}
export async function eliminarMascota(id, opts = {}) {
    const r = await api('eliminar_mascota', Object.assign({ method: 'DELETE', params: { id } }, opts));
    return r.data;
}
export async function obtenerMascota(id, opts = {}) {
    const r = await api('obtener_mascota', Object.assign({ method: 'GET', params: { id } }, opts));
    return r.data;
}
export async function obtenerTodasMascotas(opts = {}) {
    const r = await api('obtener_todas_mascotas', Object.assign({ method: 'GET' }, opts));
    return r.data;
}
export async function listarMascotas(opts = {}) {
    const r = await api('listar_mascotas', Object.assign({ method: 'GET' }, opts));
    return r.data;
}
export async function mascotasPorEspecie(especie, opts = {}) {
    const r = await api('mascotas_por_especie', Object.assign({ method: 'GET', params: { especie } }, opts));
    return r.data;
}
export async function mascotasPorDueno(dueno_id, opts = {}) {
    const r = await api('mascotas_por_dueno', Object.assign({ method: 'GET', params: { dueno_id } }, opts));
    return r.data;
}
export async function mascotasPorDuenoFull(dueno_id, opts = {}) {
    const r = await api('mascotas_por_dueno_full', Object.assign({ method: 'GET', params: { dueno_id } }, opts));
    return r.data;
}
export async function duenoPorMascotaFull(mascota_id, opts = {}) {
    const r = await api('dueno_por_mascota_full', Object.assign({ method: 'GET', params: { mascota_id } }, opts));
    return r.data;
}

export async function buscarMascota(nombre, opts = {}) {
    const r = await api('buscar_mascota', Object.assign({ method: 'GET', params: { nombre } }, opts));
    return r.data;
}

/* Visitas */
export async function crearVisita(payload, opts = {}) {
    const r = await api('crear_visita', Object.assign({ method: 'POST', body: payload }, opts));
    return r.data;
}
export async function editarVisita(payload, opts = {}) {
    const r = await api('editar_visita', Object.assign({ method: 'PUT', body: payload }, opts));
    return r.data;
}
export async function eliminarVisita(id, opts = {}) {
    const r = await api('eliminar_visita', Object.assign({ method: 'DELETE', params: { id } }, opts));
    return r.data;
}
export async function obtenerTodasVisitas(opts = {}) {
    const r = await api('obtener_todas_visitas', Object.assign({ method: 'GET' }, opts));
    return r.data;
}
export async function visitasPorMascota(mascota_id, opts = {}) {
    const r = await api('visitas_por_mascota', Object.assign({ method: 'GET', params: { mascota_id } }, opts));
    return r.data;
}
export async function visitasPorMascotaLite(mascota_id, opts = {}) {
    const r = await api('visitas_por_mascota_lite', Object.assign({ method: 'GET', params: { mascota_id } }, opts));
    return r.data;
}
export async function obtenerMascotaFull(nombre, opts = {}) {
    const r = await api('buscar_mascota_exact', Object.assign({ method: 'GET', params: { nombre } }, opts));
    return r.data;
}
export async function obtenerVisita(id, opts = {}) {
    const r = await api('obtener_visita', Object.assign({ method: 'GET', params: { id } }, opts));
    return r.data;
}
export async function visitasPorFecha(mascota_id, fecha, opts = {}) {
    const r = await api('visitas_por_fecha', Object.assign({ method: 'GET', params: { mascota_id, fecha } }, opts));
    return r.data;
}

/* Relaciones y helpers */
export async function duenosPorMascota(mascota_id, opts = {}) {
    const r = await api('duenos_por_mascota', Object.assign({ method: 'GET', params: { mascota_id } }, opts));
    return r.data;
}
export async function relacionDuenoMascota(mascota_id, dueno_id, opts = {}) {
    const r = await api('relacion_dueno_mascota', Object.assign({ method: 'GET', params: { mascota_id, dueno_id } }, opts));
    return r.data;
}

/* Export & download */
export async function exportCsv(opts = {}) {
    const res = await api('export_csv', Object.assign({ method: 'GET' }, opts));
    if (res.blob) return res.blob;
    return null;
}
export function downloadBlob(blob, filename = 'download.bin') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* autocomplete (legacy) */
export async function autocomplete(field, q, opts = {}) {
    const r = await api('autocomplete', Object.assign({ method: 'GET', params: { field, q, limit: opts.limit || 10 } }, opts));
    return r.data;
}

const defaultExport = {
    api,
    setAuthToken,
    getAuthToken,
    setCsrfToken,
    crearDueno,
    listarDuenos,
    obtenerDueno,
    buscarDueno,
    editarDueno,
    eliminarDueno,
    crearMascota,
    editarMascota,
    eliminarMascota,
    obtenerMascota,
    obtenerTodasMascotas,
    listarMascotas,
    mascotasPorEspecie,
    mascotasPorDueno,
    mascotasPorDuenoFull,
    duenoPorMascotaFull,
    buscarMascota,
    crearVisita,
    editarVisita,
    eliminarVisita,
    obtenerTodasVisitas,
    visitasPorMascota,
    visitasPorMascotaLite,
    obtenerMascotaFull,
    obtenerVisita,
    visitasPorFecha,
    duenosPorMascota,
    relacionDuenoMascota,
    exportCsv,
    downloadBlob,
    autocomplete
};

export default defaultExport;