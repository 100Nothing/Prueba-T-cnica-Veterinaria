// js/components/card.js

/**
 * Converts the passed data from Card() to usable content.
 * 
 * @param {{icon?: string|HTMLElement, title?:string|HTMLElement, meta?:string|string[]|HTMLElement|HTMLElement[], header?: string|HTMLElement|HTMLElement[], body?:string|HTMLElement|HTMLElement[], footer?:string|HTMLElement|HTMLElement[]}} data - The data to convert.
 * @returns {{header: HTMLElement, body: HTMLElement, footer: HTMLElement}} - The converted data.
*/
function dataToContent(data) {
    // sanitize input
    if (typeof data !== 'object' || Array.isArray(data) || data === null) data = {};

    const {
        icon = null,
        title = null,
        meta = null,
        header = null,
        body = null,
        footer = null
    } = data || {};

    const headerEl = document.createElement('div');
    headerEl.className = '__header';

    const bodyEl = document.createElement('div');
    bodyEl.className = '__body';

    const footerEl = document.createElement('div');
    footerEl.className = '__footer';

    // tiny helper: normalize value into an array (with flat fallback)
    const normalize = (v) => {
        if (v === null || typeof v === 'undefined') return [];
        if (Array.isArray(v)) return v.flat ? v.flat() : v.reduce((acc, x) => acc.concat(x), []);
        return [v];
    };

    // If nothing supplied at all, return default fallback content
    if (!icon && !title && !meta && !header && !body && !footer) {
        const titleEl = document.createElement('h1');
        titleEl.className = '__title';
        titleEl.textContent = 'Title';
        headerEl.appendChild(titleEl);

        const bodyP = document.createElement('p');
        bodyP.className = '__body';
        bodyP.textContent = 'Card Content';
        bodyEl.appendChild(bodyP);

        const footerP = document.createElement('p');
        footerP.className = '__footer';
        footerP.textContent = 'Card Footer';
        footerEl.appendChild(footerP);

        return { header: headerEl, body: bodyEl, footer: footerEl };
    }

    // If a header value was provided, treat it as the full header (override icon/title/meta)
    if (header !== null && typeof header !== 'undefined') {
        const items = normalize(header);
        items.forEach(item => {
            if (item instanceof HTMLElement) headerEl.appendChild(item);
            else {
                const wrapper = document.createElement('div');
                wrapper.textContent = String(item);
                headerEl.appendChild(wrapper);
            }
        });
    } else {
        // Icon
        if (typeof icon === 'string') {
            const iconContainer = document.createElement('div');
            iconContainer.className = '__icon';

            const iconEl = document.createElement('i');
            iconEl.className = `fas fa-${icon}`;

            iconContainer.appendChild(iconEl);
            headerEl.appendChild(iconContainer);
        } else if (icon instanceof HTMLElement) {
            headerEl.appendChild(icon);
        }

        // Title (string or HTMLElement)
        if (typeof title === 'string') {
            const titleEl = document.createElement('h1');
            titleEl.className = '__title';
            titleEl.textContent = title;
            headerEl.appendChild(titleEl);
        } else if (title instanceof HTMLElement) {
            headerEl.appendChild(title);
        }

        // Meta (string | HTMLElement | array)
        if (meta !== null && typeof meta !== 'undefined') {
            const metaItems = normalize(meta);
            // if single string (and only one) keep same behavior as before: single <p class="__meta">
            if (metaItems.length === 1 && typeof metaItems[0] === 'string') {
                const metaEl = document.createElement('p');
                metaEl.className = '__meta';
                metaEl.textContent = metaItems[0];
                headerEl.appendChild(metaEl);
            } else {
                const metaContainer = document.createElement('div');
                metaContainer.className = '__meta';
                metaItems.forEach(m => {
                    if (m instanceof HTMLElement) metaContainer.appendChild(m);
                    else {
                        const metaEl = document.createElement('p');
                        metaEl.textContent = String(m);
                        metaContainer.appendChild(metaEl);
                    }
                });
                headerEl.appendChild(metaContainer);
            }
        }
    }

    // Helper to append body/footer content: accepts string | HTMLElement | array
    const appendSection = (containerEl, value) => {
        const items = normalize(value);
        items.forEach(item => {
            if (item instanceof HTMLElement) {
                containerEl.appendChild(item);
            } else {
                const p = document.createElement('p');
                p.textContent = String(item);
                containerEl.appendChild(p);
            }
        });
    };

    // Body
    if (body !== null && typeof body !== 'undefined') {
        appendSection(bodyEl, body);
    }

    // Footer
    if (footer !== null && typeof footer !== 'undefined') {
        appendSection(footerEl, footer);
    }

    return { header: headerEl, body: bodyEl, footer: footerEl };
}

/**
 * Creates a card component.
 * 
 * @param {({icon?: string|HTMLElement, title?:string|HTMLElement, meta?:string|string[]|HTMLElement|HTMLElement[], header?: string|HTMLElement|HTMLElement[], body?:string|HTMLElement|HTMLElement[], footer?:string|HTMLElement|HTMLElement[]}|Array<HTMLElement>)} dataOrItems - The data to display in the card.
 * @param {{classes?: string|string[], onClick?: (e: MouseEvent) => void, listenerOptions?: {once?: boolean, capture?: boolean, passive?: boolean}|boolean}} opts - The options for the card.
 * @returns {{element: HTMLElement, mount: (target?: string|HTMLElement) => void, unmount: () => void, addClass: (classes: string|string[]) => void, removeClass: (classes: string|string[]) => void, toggleClass: (classes: string|string[]) => void, replaceClass: (oldClass: string, newClass: string) => void, replaceClickHandler: (callback: (e: MouseEvent) => void, ?: {once?: boolean, capture?: boolean, passive?: boolean}|boolean) => void, unbindClickHandler: () => void, rebindClickHandler: () => void}} The card component and a collection of helper functions.
*/
function Card(dataOrItems = null, opts = {}) {
    if (Array.isArray(dataOrItems) && dataOrItems.length === 0) dataOrItems = null;
    else if (typeof dataOrItems !== 'object' || dataOrItems === null) dataOrItems = null;

    if (Array.isArray(dataOrItems)) dataOrItems = dataOrItems.flat().filter(i => i instanceof HTMLElement);

    if (typeof opts !== 'object' || opts === null) opts = {};

    if (typeof opts.classes === 'string') opts.classes = [opts.classes];
    else if (Array.isArray(opts.classes)) opts.classes = opts.classes.flat().filter(c => typeof c === 'string');
    else opts.classes = [];

    if (typeof opts.onClick !== 'function') opts.onClick = null;
    if (typeof opts.listenerOptions !== 'object' && typeof opts.listenerOptions !== 'boolean') opts.listenerOptions = {};

    const card = document.createElement('div');

    card.className = 'card';
    if (opts.classes.length > 0) card.classList.add(...opts.classes);
    if (opts.onClick) card.addEventListener('click', opts.onClick, opts.listenerOptions);

    if (dataOrItems) {
        if (Array.isArray(dataOrItems)) dataOrItems.forEach(i => card.appendChild(i));
        else {
            const { header, body, footer } = dataToContent(dataOrItems);
            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(footer);
        }
    }

    const final = {
        element: card,
        addClass: (...classes) => classes.forEach(c => card.classList.add(c)),
        removeClass: (...classes) => classes.forEach(c => card.classList.remove(c)),
        toggleClass: (...classes) => classes.forEach(c => card.classList.toggle(c)),
        replaceClass: (oldClass, newClass) => card.classList.replace(oldClass, newClass),
        replaceClickHandler: (callback, listenerOptions) => {
            if (opts.onClick) card.removeEventListener('click', opts.onClick, opts.listenerOptions);
            opts.onClick = callback;
            opts.listenerOptions = (typeof listenerOptions !== 'undefined') ? listenerOptions : opts.listenerOptions;
            if (opts.onClick) card.addEventListener('click', opts.onClick, opts.listenerOptions);
        },

        unbindClickHandler: () => card.removeEventListener('click', opts.onClick, opts.listenerOptions),
        rebindClickHandler: () => card.addEventListener('click', opts.onClick, opts.listenerOptions),
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
                console.error(`Error mounting card component to ${target}: ${e}`);
            }
        }
        ,
        unmount: () => {
            try { card.remove() }
            catch (e) { console.error(`Error unmounting card component: ${e}`); }
        }
    }

    return final;
};

export { Card };
export default Card;