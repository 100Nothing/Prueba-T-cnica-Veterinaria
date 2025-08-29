// js/utils/debounce.js

/**
 * Devuelve una versión "debounce" de una función.
 * La función sólo se ejecutará cuando haya pasado el tiempo de espera
 * sin recibir nuevas llamadas.
 *
 * @param {Function} fn - Función original a envolver.
 * @param {number} delay - Tiempo de espera en milisegundos.
 * @returns {(...args: Parameters<F>) => void}
 */
export function debounce(fn, delay = 300) {
    let timer = null;

    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Devuelve una versión "debounce" de una función async.
 * La función sólo se ejecutará cuando haya pasado el tiempo de espera
 * sin recibir nuevas llamadas.
 *
 * @param {Function} fn - Función original a envolver.
 * @param {number} delay - Tiempo de espera en milisegundos.
 * @returns {(...args: Parameters<F>) => Promise<ReturnType<F>>}
 */
export function debounceAsync(fn, delay = 300) {
    let timer = null;

    return async function (...args) {
        clearTimeout(timer);
        return new Promise(async (resolve) => {
            timer = setTimeout(async () => {
                resolve(await fn.apply(this, args));
            }, delay);
        });
    };
}

export default { debounce, debounceAsync };