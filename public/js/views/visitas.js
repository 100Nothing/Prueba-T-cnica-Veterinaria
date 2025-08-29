// js/views/visitas.js

import Table from '../components/table.js';

import Button from '../components/button.js';

import loadOnModal from '../modules/form-loader.js';

import forms from '../components/forms.js';

import ApiClient from '../api-client.js';

import SearchBar from '../components/search-bar.js';

class VisitasView {
    constructor() {
        this.table = null;
        this.searchBar = null;
        this.searchContainer = null;
        this.previousUpdate = null;
        this.intervalId = null;
        this.newButton = null;
    }

    async load() {
        this.searchBar = SearchBar('visitas');

        this.searchContainer = document.createElement('div');

        this.searchContainer.classList.add('search-height-container');

        this.searchContainer.appendChild(this.searchBar.element);

        document.querySelector('#content-panel .fill').appendChild(this.searchContainer);

        this.table = Table({
            columns: [
                { label: 'ID', useData: true },
                { label: 'Mascota ID', key: 'mascota_id' },
                { label: 'Diagnóstico', key: 'diagnostico' },
                'Fecha',
                'Acciones'
            ]
        });

        this.newButton = Button('Nueva Visita', {
            onClick: () => loadOnModal(forms.VisitaForm().element)
        });

        this.newButton.mount('#content-panel .fill');

        this.table.mount('#content-panel .fill');

        const { visitas: res } = await ApiClient.obtenerTodasVisitas();

        const ordered = res.sort((a, b) => a.id - b.id);

        for (const m of ordered) this.table.addRow({ ...m, acciones: this.visitaActionButtons() });

        this.intervalId = setInterval(async () => {
            const { visitas: update } = await ApiClient.obtenerTodasVisitas();

            if (!this.previousUpdate) this.previousUpdate = update;

            if (JSON.stringify(this.previousUpdate) === JSON.stringify(update)) return;

            // Remove the ones that are not present in the newest update
            const toRemove = this.previousUpdate.filter(p => !update.some(u => u.id === p.id));
            for (const m of toRemove) this.table.removeRow({ id: m.id });

            // Add the ones that are not present in previous
            const toAdd = update.filter(u => !this.previousUpdate.some(p => p.id === u.id));
            for (const m of toAdd) this.table.addRow({ ...m, acciones: this.visitaActionButtons() });

            // Update the ones that actually changed
            const toUpdate = update.filter(u => this.previousUpdate.some(p => p.id === u.id && JSON.stringify(p) !== JSON.stringify(u)));
            for (const m of toUpdate) this.table.updateRow({ id: m.id }, { ...m, acciones: this.visitaActionButtons() });

            this.previousUpdate = update;
        }, 3000);
    }

    unload() {
        this.searchContainer.remove();
        this.table.unmount();
        this.newButton.unmount();
        clearInterval(this.intervalId);
    }

    visitaActionButtons() {
        const editButton = Button('Editar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    loadOnModal(forms.VisitaForm('edit', found).element);
                } catch (e) {
                    console.error(e);
                }
            },
            classes: '--primary'
        });

        const deleteButton = Button('Eliminar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    if (confirm(`¿Estás seguro de eliminar visita id: ${found}?`)) {
                        ApiClient.eliminarVisita(found);
                    }
                } catch (e) {
                    console.error(e);
                }
            },
            classes: '--secondary'
        });

        return [editButton.element, deleteButton.element];
    }
}

export { VisitasView };
export default VisitasView;

