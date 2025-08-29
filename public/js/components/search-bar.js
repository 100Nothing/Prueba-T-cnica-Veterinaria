// js/components/search-bar.js

import { parseSearchInput, performSearch } from '../modules/search-handler.js';
import ResultCard from './result-card.js';
import { debounceAsync } from '../utils/debounce.js';
import Card from './card.js';
import loadOnModal from '../modules/form-loader.js';

/**
 * Hints for each type of search.
 * 
 * @type {Object<string, string>}
*/
export const hints = {
    mascotas: 'Nombre, especie, condición o ID',
    duenos: 'Nombre, apellido o ID',
    visitas: 'Diagnóstico, fecha o ID',
    any: 'Mascota, dueño, visita...'
}

/**
 * Creates a search bar component.
 * 
 * @returns {string} The HTML for the search bar.
*/
export function createSearchContainer(type = 'any') {
    if (!Object.keys(hints).includes(type)) type = 'any';

    return `
    <div class="search-container">
        <form class="search-box" role="search" aria-label="Buscar" data-type="${type}">
            <button class="search-button"><i class="fa fa-search" aria-hidden="true"></i></button>
            <input type="text" name="search" placeholder="Buscar por: ${hints[type]}" aria-label="Buscar" autocomplete="off">
            <button type="button" class="clear-search-button" aria-label="Limpiar búsqueda">
                <i class="fa fa-times" aria-hidden="true"></i>
            </button>
        </form>
        <div class="search-results hidden" role="listbox"></div>
    </div>
    `
};

export async function search(input, type = null) {
    try {
        const parsed = parseSearchInput(input);
        return await performSearch(parsed, type);
    }
    catch (err) {
        console.error('[search] Error searching:', err);
        return null;
    }
}

const debouncedSearch = debounceAsync(search, 100);

/**
 * Creates a search bar component.
 * 
 * @param {'mascotas' | 'duenos' | 'visitas' | 'any'} type - The type of search to perform.
 * @returns {{element: HTMLElement, mount: (target?: string|HTMLElement) => void, unmount: Function, focus: Function, showResultsBox: Function, hideResultsBox: Function, clearResults: Function, search: (input: string) => void}} The search bar component and a collection of helper functions.
*/
export function SearchBar(type = 'any') {
    if (!Object.keys(hints).includes(type)) type = 'any';

    const dedicatedFlag = type !== 'any';

    const searchContainer = new DOMParser().parseFromString(createSearchContainer(type), 'text/html').body.firstElementChild;

    const searchBox = searchContainer.querySelector('.search-box');
    const searchResults = searchContainer.querySelector('.search-results');

    const searchInput = searchBox.querySelector('[name="search"]');
    const searchButton = searchBox.querySelector('.search-button');
    const clearButton = searchBox.querySelector('.clear-search-button');

    const toggleResultsBox = () => {
        if (searchResults.classList.contains('hidden') && searchInput.value !== '') {
            searchResults.classList.remove('hidden');
        } else if (!searchResults.classList.contains('hidden') && searchInput.value === '') {
            searchResults.classList.add('hidden');
        }
    };

    let mountedCards = [];

    function clearResults() {
        // unmount previous cards and clear container
        for (const c of mountedCards) {
            try { if (typeof c.unmount === 'function') c.unmount(); } catch (err) { console.warn('card unmount failed', err); }
        }
        mountedCards = [];
        searchResults.innerHTML = '';
    }

    function renderModalCardFromResult(data, domain) {
        if (!data) return null;

        const icon = () => {
            if (domain === 'mascotas') return 'paw';
            if (domain === 'duenos') return 'user';
            if (domain === 'visitas') return 'calendar';
        }

        const title = () => {
            if (domain === 'mascotas') return data.nombre;
            if (domain === 'duenos') return `${data.nombre} ${data.apellido}`;
            if (domain === 'visitas') return data.diagnostico;
        }

        const meta = () => {
            const metas = [];
            if (domain === 'mascotas') {
                const id = document.createElement('p');
                id.textContent = `ID: ${data.id}`;
                id.classList.add('__meta');
                metas.push(id);
            } else if (domain === 'duenos') {
                const id = document.createElement('p');
                id.textContent = `ID: ${data.id}`;
                id.classList.add('__meta');
                metas.push(id);
            } else if (domain === 'visitas') {
                const id = document.createElement('p');
                id.textContent = `ID: ${data.id}`;
                id.classList.add('__meta');
                metas.push(id);

                const fecha = document.createElement('p');
                fecha.textContent = `Fecha: ${data.fecha}`;
                fecha.classList.add('__meta');
                metas.push(fecha);
            }
            return metas;
        }

        const body = () => {
            if (domain === 'mascotas') {
                const especie = document.createElement('p');
                especie.textContent = `Especie: ${data.especie}`;
                especie.classList.add('__value');

                const edad = document.createElement('p');
                edad.textContent = `Edad: ${data.edad}`;
                edad.classList.add('__value');

                const fecha_nacimiento = document.createElement('p');
                fecha_nacimiento.textContent = `Fecha de nacimiento: ${data.fecha_nacimiento}`;
                fecha_nacimiento.classList.add('__value');

                const condicion = document.createElement('p');
                condicion.textContent = `Condición: ${data.condicion}`;
                condicion.classList.add('__value');

                const duenos = document.createElement('p');
                duenos.textContent = `Dueños (IDs): ${data.dueno_ids.join(', ')}`;
                duenos.classList.add('__value');

                return [especie, edad, fecha_nacimiento, condicion, duenos];
            }
            if (domain === 'duenos') {
                const nombre = document.createElement('p');
                nombre.textContent = `${data.nombre}`;
                nombre.classList.add('__value');

                const apellido = document.createElement('p');
                apellido.textContent = `${data.apellido}`;
                apellido.classList.add('__value');

                const edad = document.createElement('p');
                edad.textContent = `Edad: ${data.edad}`;
                edad.classList.add('__value');

                const telefono = document.createElement('p');
                telefono.textContent = `Tel.: ${data.telefono}`;
                telefono.classList.add('__value');

                return [nombre, apellido, edad, telefono];
            }
            if (domain === 'visitas') {
                const mascota = document.createElement('p');
                mascota.textContent = `Mascota ID: ${data.mascota_id}`;
                mascota.classList.add('__value');

                const fecha = document.createElement('p');
                fecha.textContent = `Fecha: ${data.fecha}`;
                fecha.classList.add('__value');

                const diagnostico = document.createElement('p');
                diagnostico.textContent = `Diagnóstico: ${data.diagnostico}`;
                diagnostico.classList.add('__value');

                const tratamiento = document.createElement('p');
                tratamiento.textContent = `Tratamiento: ${data.tratamiento}`;
                tratamiento.classList.add('__value');

                return [mascota, fecha, diagnostico, tratamiento];
            }
        }

        const header = Card({
            icon: icon(),
            title: title(),
            meta: meta()
        }, {
            classes: ['--title', '--fill-horizontal']
        });

        header.element.querySelector('.__body').remove();
        header.element.querySelector('.__footer').remove();

        const card = Card({
            header: header.element,
            body: body(),
        },
        {
            classes: ['--no-shadow', '--no-border', '--no-transform'],
        });

        card.element.querySelector('.__footer').remove();

        const fillContainer = document.createElement('div');
        fillContainer.classList.add('fill');
        fillContainer.appendChild(card.element);

        loadOnModal(fillContainer);
    }

    function renderResultsFromResponse(res) {
        clearResults();

        // special handling for aggregated "any" results (server returns [{domain, data}, ...])
        if (type === 'any') {
            // if every domain has empty data, show no-results card
            const hasEmptyDataInDomains = res.results.every(r => !(r.data && r.data.length));
            if (hasEmptyDataInDomains) {
                const { element, unmount } = ResultCard(null, type);
                searchResults.appendChild(element);
                mountedCards.push({ element, unmount });
                return;
            }

            for (const result of res.results) {
                let { data, domain } = result;
                if (!data || !data.length) continue;

                // show a small header for the domain
                const headerType = domain[0].toUpperCase() + domain.slice(1).replace(/n/, 'ñ');
                const { element: headerElem, unmount: headerUnmount } = ResultCard(null, headerType, { header: true });
                searchResults.appendChild(headerElem);
                mountedCards.push({ element: headerElem, unmount: headerUnmount });

                for (const dataResult of data) {
                    const { element: cardElement, unmount: cardUnmount } = ResultCard(dataResult, domain, {
                        listeners: [
                            { event: 'click', callback: () => renderModalCardFromResult(dataResult, domain) }
                        ]
                    });
                    searchResults.appendChild(cardElement);
                    mountedCards.push({ element: cardElement, unmount: cardUnmount });
                }
            }
            return;
        }

        if (!res || !Array.isArray(res.results) || res.results[0].data.length === 0) {
            const { element, unmount } = ResultCard(null, type);
            searchResults.appendChild(element);
            mountedCards.push({ element, unmount });
            return;
        }

        for (const result of res.results[0].data) {
            const { element, unmount } = ResultCard(result, type, {
                listeners: [
                    { event: 'click', callback: () => renderModalCardFromResult(result, res.results[0].domain) }
                ]
            });
            searchResults.appendChild(element);
            mountedCards.push({ element, unmount });
        }
    }

    // use renderResultsFromResponse in your handlers
    searchBox.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (searchInput.value.trim() === '') { clearResults(); toggleResultsBox(); return; }
        const res = await debouncedSearch(searchInput.value, type);
        renderResultsFromResponse(res);
        toggleResultsBox();
    });

    searchInput.addEventListener('input', async () => {
        if (searchInput.value.trim() === '') { clearResults(); toggleResultsBox(); return; }
        const res = await debouncedSearch(searchInput.value.trim(), type);
        renderResultsFromResponse(res);
        toggleResultsBox();
    });

    searchButton.addEventListener('click', async () => {
        if (searchInput.value.trim() === '') { clearResults(); toggleResultsBox(); return; }
        const res = await debouncedSearch(searchInput.value, type);
        renderResultsFromResponse(res);
        toggleResultsBox();
    });

    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearResults();
        toggleResultsBox();
    });

    searchInput.addEventListener('click', () => {
        if (searchResults.classList.contains('hidden') && searchInput.value !== '') searchResults.classList.remove('hidden');
    });

    searchInput.addEventListener('focus', () => {
        if (searchResults.classList.contains('hidden') && searchInput.value !== '') searchResults.classList.remove('hidden');
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !searchResults.classList.contains('hidden')) searchResults.classList.add('hidden');
    });

    function hideOnOutside(e) {
        if (!searchContainer.contains(e.target) && !searchBox.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    }

    document.addEventListener('click', hideOnOutside);
    document.addEventListener('focus', hideOnOutside, true);

    const searchBar = {
        element: searchContainer,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(searchContainer);
                    else document.body.appendChild(searchContainer);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(searchContainer);
                    return;
                }
                document.body.appendChild(searchContainer);
            } catch (e) {
                console.error(`Error mounting search card component to ${target}: ${e}`);
            }
        }
        ,
        unmount: () => {
            try {
                document.removeEventListener('click', hideOnOutside);
                document.removeEventListener('focus', hideOnOutside, true);
                clearResults();
                searchContainer.remove();
            }
            catch (e) { console.error(`Error unmounting searchbar component: ${e}`); }
        },
        focus: () => searchInput.focus(),
        showResultsBox: () => searchResults.classList.remove('hidden'),
        hideResultsBox: () => searchResults.classList.add('hidden'),
        clearResults: () => clearResults(),
        search: async (input) => {
            const res = await search(input, type);
            renderResultsFromResponse(res);
            searchResults.classList.remove('hidden');
        }
    };

    return searchBar;
}

export default SearchBar;