// js/views/todo.js

import Table from '../components/table.js';
import Button from '../components/button.js';
import loadOnModal from '../modules/form-loader.js';
import forms from '../components/forms.js';
import ApiClient from '../api-client.js';
import SearchBar from '../components/search-bar.js';

class TodoView {
    constructor() {
        // single search bar for the combined view
        this.searchBar = null;
        this.searchContainer = null;

        // wrapper for all sections so we can remove everything easily
        this.wrapper = null;

        // tables and buttons for each resource
        this.mascotasTable = null;
        this.duenosTable = null;
        this.visitasTable = null;

        this.mascotasNewBtn = null;
        this.duenosNewBtn = null;
        this.visitasNewBtn = null;

        // section headers for each resource
        this.mascotasHeader = null;
        this.duenosHeader = null;
        this.visitasHeader = null;

        // previous snapshots to diff
        this.previousMascotas = null;
        this.previousDuenos = null;
        this.previousVisitas = null;

        this.intervalId = null;
    }

    async load() {
        // create and mount single search bar (defaults to any data)
        this.searchBar = SearchBar();
        this.searchContainer = document.createElement('div');
        this.searchContainer.classList.add('search-height-container');
        this.searchContainer.appendChild(this.searchBar.element);
        document.querySelector('#content-panel .fill').appendChild(this.searchContainer);

        // create three section wrappers so things are ordered visually
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('todo-wrapper');

        // --- MASCOTAS ---
        const mascotasSection = document.createElement('section');
        mascotasSection.classList.add('todo-section', 'mascotas-section');

        // store header reference so we can remove it safely on unload
        this.mascotasHeader = document.createElement('h2');
        this.mascotasHeader.textContent = 'Mascotas';
        mascotasSection.appendChild(this.mascotasHeader);

        this.mascotasTable = Table({
            columns: [
                { label: 'ID', useData: true },
                'Nombre',
                'Especie',
                'Edad',
                'Acciones'
            ]
        });

        this.mascotasNewBtn = Button('Nueva Mascota', {
            onClick: () => loadOnModal(forms.PetForm().element)
        });

        // mount button then table into the section
        // Button returns an object with .element — append that
        if (this.mascotasNewBtn && this.mascotasNewBtn.element) mascotasSection.appendChild(this.mascotasNewBtn.element);
        mascotasSection.appendChild(this.mascotasTable.element);

        this.wrapper.appendChild(mascotasSection);

        // --- DUENOS ---
        const duenosSection = document.createElement('section');
        duenosSection.classList.add('todo-section', 'duenos-section');

        this.duenosHeader = document.createElement('h2');
        this.duenosHeader.textContent = 'Dueños';
        duenosSection.appendChild(this.duenosHeader);

        this.duenosTable = Table({
            columns: [
                { label: 'ID', useData: true },
                'Nombre',
                'Apellido',
                'Edad',
                'Acciones'
            ]
        });

        this.duenosNewBtn = Button('Nuevo Dueño', {
            onClick: () => loadOnModal(forms.DuenoForm().element)
        });

        if (this.duenosNewBtn && this.duenosNewBtn.element) duenosSection.appendChild(this.duenosNewBtn.element);
        duenosSection.appendChild(this.duenosTable.element);

        this.wrapper.appendChild(duenosSection);

        // --- VISITAS ---
        const visitasSection = document.createElement('section');
        visitasSection.classList.add('todo-section', 'visitas-section');

        this.visitasHeader = document.createElement('h2');
        this.visitasHeader.textContent = 'Visitas';
        visitasSection.appendChild(this.visitasHeader);

        this.visitasTable = Table({
            columns: [
                { label: 'ID', useData: true },
                { label: 'Mascota ID', key: 'mascota_id' },
                { label: 'Diagnóstico', key: 'diagnostico' },
                'Fecha',
                'Acciones'
            ]
        });

        this.visitasNewBtn = Button('Nueva Visita', {
            onClick: () => loadOnModal(forms.VisitaForm().element)
        });

        if (this.visitasNewBtn && this.visitasNewBtn.element) visitasSection.appendChild(this.visitasNewBtn.element);
        visitasSection.appendChild(this.visitasTable.element);

        this.wrapper.appendChild(visitasSection);

        // finally mount wrapper into the app container
        document.querySelector('#content-panel .fill').appendChild(this.wrapper);

        // fetch initial data for all three resources and populate tables
        const [mascotasResp, duenosResp, visitasResp] = await Promise.all([
            ApiClient.obtenerTodasMascotas(),
            ApiClient.listarDuenos(),
            ApiClient.obtenerTodasVisitas()
        ]).catch(err => {
            console.error('Error fetching initial datasets for TodoView', err);
            return [{ mascotas: [] }, { duenos: [] }, { visitas: [] }];
        });

        const mascotas = (mascotasResp && mascotasResp.mascotas) ? mascotasResp.mascotas : [];
        const duenos = (duenosResp && duenosResp.duenos) ? duenosResp.duenos : [];
        const visitas = (visitasResp && visitasResp.visitas) ? visitasResp.visitas : [];

        // sort and add rows
        mascotas.sort((a, b) => a.id - b.id);
        for (const m of mascotas) {
            this.mascotasTable.addRow({ ...m, acciones: this.mascotaActionButtons() });
        }

        duenos.sort((a, b) => a.id - b.id);
        for (const d of duenos) {
            this.duenosTable.addRow({ ...d, acciones: this.duenoActionButtons() });
        }

        visitas.sort((a, b) => a.id - b.id);
        for (const v of visitas) {
            this.visitasTable.addRow({ ...v, acciones: this.visitaActionButtons() });
        }

        // store previous snapshots
        this.previousMascotas = mascotas;
        this.previousDuenos = duenos;
        this.previousVisitas = visitas;

        // set up a single interval to refresh all three every 3s (same behavior as individual views)
        this.intervalId = setInterval(async () => {
            try {
                const [mResp, dResp, vResp] = await Promise.all([
                    ApiClient.obtenerTodasMascotas(),
                    ApiClient.listarDuenos(),
                    ApiClient.obtenerTodasVisitas()
                ]);

                const mUpdate = (mResp && mResp.mascotas) ? mResp.mascotas : [];
                const dUpdate = (dResp && dResp.duenos) ? dResp.duenos : [];
                const vUpdate = (vResp && vResp.visitas) ? vResp.visitas : [];

                // ---- MASCOTAS diffing ----
                if (!this.previousMascotas) this.previousMascotas = mUpdate;
                if (JSON.stringify(this.previousMascotas) !== JSON.stringify(mUpdate)) {
                    // remove missing
                    const toRemove = this.previousMascotas.filter(p => !mUpdate.some(u => u.id === p.id));
                    for (const m of toRemove) this.mascotasTable.removeRow({ id: m.id });

                    // add new
                    const toAdd = mUpdate.filter(u => !this.previousMascotas.some(p => p.id === u.id));
                    for (const m of toAdd) this.mascotasTable.addRow({ ...m, acciones: this.mascotaActionButtons() });

                    // update changed
                    const toUpdate = mUpdate.filter(u => this.previousMascotas.some(p => p.id === u.id && JSON.stringify(p) !== JSON.stringify(u)));
                    for (const m of toUpdate) this.mascotasTable.updateRow({ id: m.id }, { ...m, acciones: this.mascotaActionButtons() });

                    this.previousMascotas = mUpdate;
                }

                // ---- DUENOS diffing ----
                if (!this.previousDuenos) this.previousDuenos = dUpdate;
                if (JSON.stringify(this.previousDuenos) !== JSON.stringify(dUpdate)) {
                    const toRemove = this.previousDuenos.filter(p => !dUpdate.some(u => u.id === p.id));
                    for (const d of toRemove) this.duenosTable.removeRow({ id: d.id });

                    const toAdd = dUpdate.filter(u => !this.previousDuenos.some(p => p.id === u.id));
                    for (const d of toAdd) this.duenosTable.addRow({ ...d, acciones: this.duenoActionButtons() });

                    const toUpdate = dUpdate.filter(u => this.previousDuenos.some(p => p.id === u.id && JSON.stringify(p) !== JSON.stringify(u)));
                    for (const d of toUpdate) this.duenosTable.updateRow({ id: d.id }, { ...d, acciones: this.duenoActionButtons() });

                    this.previousDuenos = dUpdate;
                }

                // ---- VISITAS diffing ----
                if (!this.previousVisitas) this.previousVisitas = vUpdate;
                if (JSON.stringify(this.previousVisitas) !== JSON.stringify(vUpdate)) {
                    const toRemove = this.previousVisitas.filter(p => !vUpdate.some(u => u.id === p.id));
                    for (const v of toRemove) this.visitasTable.removeRow({ id: v.id });

                    const toAdd = vUpdate.filter(u => !this.previousVisitas.some(p => p.id === u.id));
                    for (const v of toAdd) this.visitasTable.addRow({ ...v, acciones: this.visitaActionButtons() });

                    const toUpdate = vUpdate.filter(u => this.previousVisitas.some(p => p.id === u.id && JSON.stringify(p) !== JSON.stringify(u)));
                    for (const v of toUpdate) this.visitasTable.updateRow({ id: v.id }, { ...v, acciones: this.visitaActionButtons() });

                    this.previousVisitas = vUpdate;
                }
            } catch (err) {
                console.error('TodoView refresh error', err);
            }
        }, 3000);
    }

    unload() {
        // helper to safely remove DOM node
        const safeRemove = (el) => {
            try {
                if (!el) return;
                if (el.unmount && typeof el.unmount === 'function') {
                    // if it's a component-like object with unmount, call it
                    try { el.unmount(); } catch (e) { /* ignore */ }
                } else if (el.element && el.element.remove) {
                    // if it's a component object with .element (like Button), remove the element
                    try { el.element.remove(); } catch (e) { /* ignore */ }
                } else if (el.remove) {
                    try { el.remove(); } catch (e) { /* ignore */ }
                } else if (el.parentNode) {
                    try { el.parentNode.removeChild(el); } catch (e) { /* ignore */ }
                }
            } catch (e) {
                // swallow to ensure unload is resilient
            }
        };

        // remove search container (which holds the searchBar.element)
        safeRemove(this.searchContainer);

        // unmount tables (they will remove their own elements)
        if (this.mascotasTable && typeof this.mascotasTable.unmount === 'function') {
            try { this.mascotasTable.unmount(); } catch (e) { /* ignore */ }
        }
        if (this.duenosTable && typeof this.duenosTable.unmount === 'function') {
            try { this.duenosTable.unmount(); } catch (e) { /* ignore */ }
        }
        if (this.visitasTable && typeof this.visitasTable.unmount === 'function') {
            try { this.visitasTable.unmount(); } catch (e) { /* ignore */ }
        }

        // buttons: call unmount if available, otherwise remove element if present
        if (this.mascotasNewBtn) safeRemove(this.mascotasNewBtn);
        if (this.duenosNewBtn) safeRemove(this.duenosNewBtn);
        if (this.visitasNewBtn) safeRemove(this.visitasNewBtn);

        // remove headers explicitly
        safeRemove(this.mascotasHeader);
        safeRemove(this.duenosHeader);
        safeRemove(this.visitasHeader);

        // finally remove the wrapper if still present (this removes any remaining children)
        safeRemove(this.wrapper);

        // clear the refresh interval
        try { clearInterval(this.intervalId); } catch (e) { /* ignore */ }

        // null out references to help GC
        this.searchBar = null;
        this.searchContainer = null;
        this.wrapper = null;

        this.mascotasTable = null;
        this.duenosTable = null;
        this.visitasTable = null;

        this.mascotasNewBtn = null;
        this.duenosNewBtn = null;
        this.visitasNewBtn = null;

        this.mascotasHeader = null;
        this.duenosHeader = null;
        this.visitasHeader = null;

        this.previousMascotas = null;
        this.previousDuenos = null;
        this.previousVisitas = null;
        this.intervalId = null;
    }

    // Reuse the same action button patterns from the other views,
    // but return arrays of elements so they can be inserted into the row (Table understands arrays).
    mascotaActionButtons() {
        const editButton = Button('Editar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    loadOnModal(forms.PetForm('edit', found).element);
                } catch (err) {
                    console.error(err);
                }
            },
            classes: '--primary'
        });

        const deleteButton = Button('Eliminar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    if (confirm(`¿Estás seguro de eliminar mascota id: ${found}?`)) {
                        ApiClient.eliminarMascota(found);
                    }
                } catch (err) {
                    console.error(err);
                }
            },
            classes: '--secondary'
        });

        return [editButton.element, deleteButton.element];
    }

    duenoActionButtons() {
        const editButton = Button('Editar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    loadOnModal(forms.DuenoForm('edit', found).element);
                } catch (err) {
                    console.error(err);
                }
            },
            classes: '--primary'
        });

        const deleteButton = Button('Eliminar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    if (confirm(`¿Estás seguro de eliminar dueño id: ${found}?`)) {
                        ApiClient.eliminarDueno(found);
                    }
                } catch (err) {
                    console.error(err);
                }
            },
            classes: '--secondary'
        });

        return [editButton.element, deleteButton.element];
    }

    visitaActionButtons() {
        const editButton = Button('Editar', {
            onClick: e => {
                try {
                    const row = e.target.closest('tr');
                    const found = row.querySelector('[data-column-key="id"]').textContent;
                    loadOnModal(forms.VisitaForm('edit', found).element);
                } catch (err) {
                    console.error(err);
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
                } catch (err) {
                    console.error(err);
                }
            },
            classes: '--secondary'
        });

        return [editButton.element, deleteButton.element];
    }
}

export { TodoView };
export default TodoView;