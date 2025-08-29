// js/modules/sidebar-select.js

import views from '../../views/views.js';
import loadView from '../view-loader.js';

// Selects a sidebar item and toggles the active class, removes the active class from all other items
try {
    const items = document.querySelectorAll('.nav-button');
    const nav = document.querySelector('nav');

    nav.addEventListener('click', ({target}) => {
        const button = target.closest('.nav-button');
        if (button) {
            items.forEach(item => item.classList.remove('active'));
            button.classList.add('active');

            let view = button.getAttribute('data-view');
            if (view) {
                view = view.charAt(0).toUpperCase() + view.slice(1);
                const cls = views[`${view}View`];
                loadView(new cls());
            }
        }
    });
}
catch (e) {
    console.error(`Error in sidebar-select.js: ${e}`);
}