// js/components/result-card.js

/**
 * Creates a result card component.
 * 
 * @param {Object} data - The result data.
 * @param {string} type - The result type.
 * @param { { header?: boolean, listeners?: Array<{ event: string, callback: (e: Event) => void, opts?: { once?: boolean, capture?: boolean, passive?: boolean } }> } } opts - The options for the card. (all listeners apply to the card itself)
 * @returns { { element: HTMLElement, mount: (target: string|HTMLElement) => void, unmount: Function }} The result card component and a collection of helper functions.
*/
export function ResultCard(data, type, opts = {}) {
    if (typeof data !== 'object' || data === null) data = null;
    if (typeof type !== 'string' || type === '') type = 'any';
    if (typeof opts !== 'object' || opts === null) opts = {};

    let html = '';

    if (!data && opts.header) html = `
    <div class="__result __header" role="heading">
        Resultados de ${type}
    </div>
    `;
    else if (!data) html = `
    <div class="__result" role="option">
        <div class="__description">No se encontraron resultados.</div>
    </div>
    `;

    type = type.toLowerCase();
    try {
        type = type.normalize('NFD').replace(/\p{M}/gu, '');
    } catch (e) {
        type = type.replace(/[^\x00-\x7F]/g, '');
    }

    if (type === 'mascotas') {
        html = html || `
        <div class="__result" role="option">
            <div class="__icon"><i class="fa fa-paw"></i></div>
            <div class="__title">${data.nombre}</div>
            <div class="__meta">
                <p>Especie: ${data.especie || ''}</p>
                <p>Condición: ${data.condicion || ''}</p>
                <p>ID: ${data.id || ''}</p>
            </div>
        </div>
        `;
    }
    else if (type === 'duenos' || type === 'dueno') {
        html = html || `
        <div class="__result" role="option">
            <div class="__icon"><i class="fa fa-user-tie"></i></div>
            <div class="__title">${(data.nombre || '') + ' ' + (data.apellido || '')}</div>
            <div class="__meta">ID: ${data.id || ''}</div>
        </div>
        `;
    }
    else if (type === 'visitas' || type === 'visita') {
        html = html || `
        <div class="__result" role="option">
            <div class="__icon"><i class="fa fa-calendar-check"></i></div>
            <div class="__title">${data.diagnostico || ''}</div>
            <div class="__meta">
                <p>Fecha: ${data.fecha || ''}</p>
                <p>ID: ${data.id || ''}</p>
            </div>
        </div>
        `;
    }

    // final fallback
    html = html || `
    <div class="__result" role="option">
        <div class="__title">${data && data.id ? data.id : 'Result'}</div>
        <div class="__meta">ID: ${data && data.id ? data.id : ''}</div>
    </div>
    `;

    const card = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;

    for (const listener of opts.listeners || []) {
        if (typeof listener.callback !== 'function') {
            console.error(`listener.callback is not a function. Listener: ${listener}`);
            continue;
        }
        if (typeof listener.event !== 'string') {
            console.error(`listener.event is not a string. Listener: ${listener}`);
            continue;
        }

        const { callback, event, opts: listenerOpts = {} } = listener;

        const wrapped = ev => {
            try {
                const res = callback(ev);
                if (res && typeof res.then === 'function') {
                    res.catch(e => console.error(`Async callback for ${event} failed: ${e}`));
                }
            }
            catch (e) { console.error(`Callback for ${event} failed: ${e}`); }
        }

        card.addEventListener(event, wrapped, listenerOpts);
    }

    return {
        element: card,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(card);
                    else document.body.appendChild(card);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(card);
                    return;
                }
                document.body.appendChild(card);
            } catch (e) {
                console.error(`Error mounting result card component to ${target}: ${e}`);
            }
        },
        unmount: () => {
            try { card.remove() }
            catch (e) { console.error(`Error unmounting result card component: ${e}`); }
        }
    };
}

export default ResultCard;
