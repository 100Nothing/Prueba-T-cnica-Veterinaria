// js/modules/view-loader.js

/**
 * Loads content into the content panel.
 * 
 * @param {string|HTMLElement} view - The view to load.
 * 
 * @returns {void}
*/
const loadView = view => {
    if (window.mountedView) window.mountedView.unload();

    view.load();

    window.mountedView = view;
}

export { loadView };
export default loadView;