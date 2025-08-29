// js/modules/form-loader.js

function loadOnModal(form) {
    try {
        if (!form) throw 'No form provided';
        if (!form instanceof HTMLElement) throw 'Form is not an HTMLElement';
        const modal = document.querySelector('.card.--modal-menu');

        if (!modal) throw 'No modal found';
        
        const previous = modal.querySelector('.fill');
        if (previous) previous.remove();

        modal.appendChild(form);

        const hidden = modal.classList.contains('hidden');
        if (hidden) modal.classList.remove('hidden');

        const firstInput = form.querySelector('input');
        if (firstInput) firstInput.focus();
    } catch (e) {
        console.error(`Error in form-loader.js: ${e}`);
    }
}

export { loadOnModal };
export default loadOnModal;