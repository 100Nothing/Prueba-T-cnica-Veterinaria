// js/modules/sidebar-toggle.js

function toggleSidebar({sidebar, left, right}) {
    const isClosed = sidebar.classList.toggle('closed');
    left.classList.toggle('hidden', isClosed);
    right.classList.toggle('hidden', !isClosed);
}

// Activación y desactivación del sidebar
try {
    const sidebar = document.querySelector('aside');
    const left = document.querySelector('#left-arrow');
    const right = document.querySelector('#right-arrow');
    const toggleButton = document.querySelector('.open-close');

    toggleButton.addEventListener('click', () => toggleSidebar({sidebar, left, right}));
}
catch (e) {
    console.error(`Error in sidebar-toggle.js: ${e}`);
}