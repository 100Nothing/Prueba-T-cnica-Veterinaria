// js/components/button.js

/**
 * Creates a button component.
 * 
 * @param {string} text - The text of the button.
 * @param {{classes?: string|string[], onClick?: (e: MouseEvent) => void, listenerOptions?: {once?: boolean, capture?: boolean, passive?: boolean}|boolean}} opts - A set of options for the button.
 * 
 * @returns {{element: HTMLButtonElement, mount: (target?: string | HTMLElement) => void, unmount: () => void, addClass: (classes: string[]) => void, removeClass: (classes: string[]) => void, toggleClass: (classes: string[]) => void, replaceClass: (oldClass: string, newClass: string) => void, replaceClickHandler: (callback: (e: MouseEvent) => void, listenerOptions?: {once?: boolean, capture?: boolean, passive?: boolean}|boolean) => void, unbindClickHandler: () => void, rebindClickHandler: () => void}} The button element and a set of helper methods.
*/
function Button(text, opts = {}) {
    if (typeof text !== 'string') text = 'Button';

    if (typeof opts !== 'object' || opts === null) opts = {};

    if (typeof opts.classes === 'string') opts.classes = [opts.classes];
    else if (Array.isArray(opts.classes)) opts.classes = opts.classes.flat().filter(c => typeof c === 'string');
    else opts.classes = [];

    if (typeof opts.onClick !== 'function') opts.onClick = null;
    if (typeof opts.listenerOptions !== 'object' && typeof opts.listenerOptions !== 'boolean') opts.listenerOptions = {};

    const button = document.createElement('button');

    button.textContent = text;
    if (opts.classes.length > 0) button.classList.add(...opts.classes);
    if (opts.onClick) button.addEventListener('click', opts.onClick, opts.listenerOptions);

    const final = {
        element: button,
        addClass: (...classes) => classes.forEach(c => button.classList.add(c)),
        removeClass: (...classes) => classes.forEach(c => button.classList.remove(c)),
        toggleClass: (...classes) => classes.forEach(c => button.classList.toggle(c)),
        replaceClass: (oldClass, newClass) => button.classList.replace(oldClass, newClass),
        replaceClickHandler: (callback, listenerOptions) => {
            if (opts.onClick) button.removeEventListener('click', opts.onClick, opts.listenerOptions);
            opts.onClick = callback;
            opts.listenerOptions = (typeof listenerOptions !== 'undefined') ? listenerOptions : opts.listenerOptions;
            if (opts.onClick) button.addEventListener('click', opts.onClick, opts.listenerOptions);
        },
        unbindClickHandler: () => button.removeEventListener('click', opts.onClick, opts.listenerOptions),
        rebindClickHandler: () => button.addEventListener('click', opts.onClick, opts.listenerOptions),
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(button);
                    else document.body.appendChild(button);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(button);
                    return;
                }
                document.body.appendChild(button);
            } catch (e) {
                console.error(`Error mounting button component to ${target}: ${e}`);
            }
        }
        ,
        unmount: () => {
            try { button.remove() }
            catch (e) { console.error(`Error unmounting button component: ${e}`); }
        }
    }

    return final;
}

export { Button };
export default Button;