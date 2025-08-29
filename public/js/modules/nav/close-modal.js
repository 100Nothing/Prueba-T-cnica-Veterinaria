// js/modules/nav/close-modal.js

// Close modal functionality
try {
    const button = document.querySelector('.close-modal');
    const modal = document.querySelector('.--modal-menu');

    button.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.body.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        const isActiveInsideModal = document.activeElement === modal || document.activeElement.closest('.--modal-menu') || document.activeElement === document.body;
        const isModalHidden = modal.classList.contains('hidden');

        if (isActiveInsideModal && !isModalHidden) modal.classList.add('hidden');
    });
} catch (e) {
    console.error(`Error close-modal.js: ${e}`);
}