// js/components/forms.js
import ApiClient from '../api-client.js';

/**
 * Generic container template used by all forms
 */
const htmls = {
    container: `
    <div class="fill">
        <div class="__body">
            <div id="action-form-title" class="__title"></div>
            <p class="__meta hidden"></p>
            <form id="action-form"></form>
        </div>
    </div>
    `,
    petFormContent: `                    
    <label for="nombre">Nombre</label>
    <input type="text" id="nombre" name="nombre" placeholder="Nombre de la mascota">

    <label for="edad">Edad</label>
    <input type="number" id="edad" name="edad" placeholder="Edad de la mascota">

    <label for="especie">Especie</label>
    <select id="especie" name="especie">
        <option value="">Seleccione una especie</option>
        <option value="Perro">Perro</option>
        <option value="Gato">Gato</option>
        <option value="Conejo">Conejo</option>
        <option value="Ave">Ave</option>
        <option value="otro">Otro</option>
    </select>

    <label for="otro" class="hidden">Otro</label>
    <input type="text" id="otro" name="otro" placeholder="Especifique la especie" class="hidden">

    <label for="fecha_nacimiento">Fecha de nacimiento</label>
    <input type="date" id="fecha_nacimiento" name="fecha_nacimiento">

    <label for="condicion">Condición</label>
    <input type="text" id="condicion" placeholder="Condición de la mascota (sano, enfermo, vacunado, etc.)" name="condicion">

    <label for="dueno_ids">Dueños (IDs, separar por comas)</label>
    <input type="text" id="dueno_ids" placeholder="Ej: 1,2" name="dueno_ids">

    <button type="submit"></button>
    <p class="__error hidden"></p>
    <p class="__success hidden"></p>
    `,

    duenoFormContent: `
    <label for="nombre">Nombre</label>
    <input type="text" id="nombre" name="nombre" placeholder="Nombre del dueño">

    <label for="apellido">Apellido</label>
    <input type="text" id="apellido" name="apellido" placeholder="Apellido del dueño">

    <label for="edad">Edad</label>
    <input type="number" id="edad" name="edad" placeholder="Edad">

    <label for="telefono">Teléfono</label>
    <input type="text" id="telefono" name="telefono" placeholder="Teléfono (opcional)">

    <label for="mascota_ids">Mascotas (IDs, separar por comas)</label>
    <input type="text" id="mascota_ids" name="mascota_ids" placeholder="Ej: 3,4">

    <button type="submit"></button>
    <p class="__error hidden"></p>
    <p class="__success hidden"></p>
    `,

    visitaFormContent: `
    <label for="mascota_id">Mascota ID</label>
    <input type="number" id="mascota_id" name="mascota_id" placeholder="ID de la mascota">

    <label for="fecha">Fecha</label>
    <input type="date" id="fecha" name="fecha">

    <label for="diagnostico">Diagnóstico</label>
    <textarea id="diagnostico" name="diagnostico" placeholder="Diagnóstico"></textarea>

    <label for="tratamiento">Tratamiento</label>
    <textarea id="tratamiento" name="tratamiento" placeholder="Tratamiento"></textarea>

    <button type="submit"></button>
    <p class="__error hidden"></p>
    <p class="__success hidden"></p>
    `
};

/**
 * Helper: parse a comma-separated list into array of positive ints
 * - Accepts arrays (returns cleaned array), strings like "1,2", or null.
 */
function parseIdList(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw.map(x => parseInt(x, 10)).filter(n => Number.isInteger(n) && n > 0);
    const s = String(raw).trim();
    if (s === '') return [];
    return s.split(/[,\s;]+/).map(x => parseInt(x, 10)).filter(n => Number.isInteger(n) && n > 0);
}

/**
 * Helper: set error / success text and visibility
 */
function showError(container, text) {
    const el = container.querySelector('.__error');
    el.textContent = text;
    el.classList.remove('hidden');
    const ok = container.querySelector('.__success');
    if (ok) ok.classList.add('hidden');
}
function showSuccess(container, text) {
    const el = container.querySelector('.__success');
    el.textContent = text;
    el.classList.remove('hidden');
    const err = container.querySelector('.__error');
    if (err) err.classList.add('hidden');
}

/**
 * PetForm factory
 * @param {'create'|'edit'} mode
 * @param {number|null} id - id when edit
 */
function PetForm(mode = 'create', id = null) {
    if (typeof mode !== 'string') mode = 'create';
    if (mode !== 'create' && mode !== 'edit') mode = 'create';

    const container = new DOMParser().parseFromString(htmls.container, 'text/html').body.firstElementChild;
    const form = container.querySelector('#action-form');
    form.innerHTML = htmls.petFormContent;

    const titleEl = container.querySelector('#action-form-title');
    const metaEl = container.querySelector('.__meta');

    // configure UI based on mode
    if (mode === 'edit') {
        titleEl.textContent = 'Editar mascota';
        metaEl.classList.remove('hidden');
        metaEl.textContent = `ID: ${id}`;
        form.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
        // fetch existing data asynchronously and populate
        (async () => {
            try {
                const resp = await ApiClient.obtenerMascota(id);
                const previous = resp && resp.mascota ? resp.mascota : null;
                if (!previous) {
                    showError(container, 'No se encontró la mascota solicitada.');
                    return;
                }
                form.querySelector('#nombre').value = previous.nombre ?? '';
                form.querySelector('#edad').value = previous.edad ?? '';
                // if especie equals 'otro' previously, keep it in select? we set select value
                // we will put the exact especie into select if it matches options, otherwise use 'otro' + fill #otro
                const especieSelect = form.querySelector('#especie');
                const otroInput = form.querySelector('#otro');
                const especies = Array.from(especieSelect.options).map(o => o.value);
                if (especies.includes(previous.especie)) {
                    especieSelect.value = previous.especie;
                    otroInput.value = previous.especie;
                    if (previous.especie === 'otro') {
                        form.querySelector('label[for="otro"]').classList.remove('hidden');
                        otroInput.classList.remove('hidden');
                    }
                } else {
                    // put 'otro' and fill text
                    especieSelect.value = 'otro';
                    form.querySelector('label[for="otro"]').classList.remove('hidden');
                    otroInput.classList.remove('hidden');
                    otroInput.value = previous.especie;
                }
                form.querySelector('#fecha_nacimiento').value = previous.fecha_nacimiento ?? '';
                form.querySelector('#condicion').value = previous.condicion ?? '';

                // dueno_ids is an array now
                const duenoIds = Array.isArray(previous.dueno_ids) ? previous.dueno_ids : [];
                form.querySelector('#dueno_ids').value = duenoIds.join(',');
            } catch (err) {
                showError(container, `Error al obtener mascota: ${err.message || err}`);
            }
        })();
    } else {
        titleEl.textContent = 'Nueva mascota';
        form.querySelector('button[type="submit"]').textContent = 'Crear mascota';
        form.querySelector('#nombre').required = true;
        form.querySelector('#edad').required = true;
        form.querySelector('#especie').required = true;
        form.querySelector('#fecha_nacimiento').required = true;
    }

    // especie -> otro toggling
    const especieSelect = form.querySelector('#especie');
    const otroLabel = form.querySelector('label[for="otro"]');
    const otroInput = form.querySelector('#otro');

    especieSelect.addEventListener('change', e => {
        if (e.target.value === 'otro') {
            otroLabel.classList.remove('hidden');
            otroInput.classList.remove('hidden');
        } else {
            otroLabel.classList.add('hidden');
            otroInput.classList.add('hidden');
        }
    });

    // submit
    form.addEventListener('submit', async e => {
        e.preventDefault();
        // hide previous messages
        container.querySelector('.__error').classList.add('hidden');
        container.querySelector('.__success').classList.add('hidden');

        const nombre = form.querySelector('#nombre').value.trim();
        const edad = Number(form.querySelector('#edad').value);
        let especie = form.querySelector('#especie').value;
        const otro = form.querySelector('#otro').value.trim();
        const fecha_nacimiento = form.querySelector('#fecha_nacimiento').value;
        const condicion = form.querySelector('#condicion').value.trim() || 'No especificada';
        if (especie === 'otro' && otro !== '') especie = otro;

        const duenoInput = form.querySelector('#dueno_ids').value;
        const dueno_ids = parseIdList(duenoInput); // array

        try {
            if (mode === 'edit') {
                const payload = { id, nombre, edad, especie, fecha_nacimiento, condicion, dueno_ids };
                const res = await ApiClient.editarMascota(payload);
                if (res && res.ok) {
                    showSuccess(container, `Mascota actualizada correctamente (id: ${res.mascota_id ?? id}).`);
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'actualizar la mascota'));
                }
            } else {
                const payload = { nombre, edad, especie, fecha_nacimiento, condicion, dueno_ids: dueno_ids.length ? dueno_ids : undefined };
                const res = await ApiClient.crearMascota(payload);
                if (res && res.ok) {
                    showSuccess(container, `Mascota creada exitosamente (id: ${res.mascota_id}).`);
                    form.reset();
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'crear la mascota'));
                }
            }
        } catch (err) {
            showError(container, `Error en la petición: ${err.message || err}`);
        }
    });

    // small helper to format server validation messages
    function formatErrors(errors, ctx = '') {
        if (!Array.isArray(errors)) return (errors && String(errors)) || 'Error desconocido';
        return errors.map((er, i) => (i === 0 ? (er.charAt(0).toUpperCase() + er.slice(1)) : er)).join(', ') + (ctx ? ` al ${ctx}.` : '.');
    }

    const final = {
        element: container,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(container);
                    else document.body.appendChild(container);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(container);
                    return;
                }
                document.body.appendChild(container);
            } catch (e) {
                console.error(`Error mounting pet form component to ${target}: ${e}`);
            }
        },
        unmount: () => {
            try { container.remove(); }
            catch (e) { console.error(`Error unmounting pet form component: ${e}`); }
        }
    };

    // mount/unmount helpers
    return final;
}

/**
 * DuenoForm factory
 * @param {'create'|'edit'} mode
 * @param {number|null} id
 */
function DuenoForm(mode = 'create', id = null) {
    if (typeof mode !== 'string') mode = 'create';
    if (mode !== 'create' && mode !== 'edit') mode = 'create';

    const container = new DOMParser().parseFromString(htmls.container, 'text/html').body.firstElementChild;
    const form = container.querySelector('#action-form');
    form.innerHTML = htmls.duenoFormContent;

    const titleEl = container.querySelector('#action-form-title');
    const metaEl = container.querySelector('.__meta');

    if (mode === 'edit') {
        titleEl.textContent = 'Editar dueño';
        metaEl.classList.remove('hidden');
        metaEl.textContent = `ID: ${id}`;
        form.querySelector('button[type="submit"]').textContent = 'Guardar cambios';

        // load existing
        (async () => {
            try {
                const resp = await ApiClient.obtenerDueno(id);
                const previous = resp && resp.dueno ? resp.dueno : null;
                if (!previous) {
                    showError(container, 'No se encontró el dueño solicitado.');
                    return;
                }
                form.querySelector('#nombre').value = previous.nombre ?? '';
                form.querySelector('#apellido').value = previous.apellido ?? '';
                form.querySelector('#edad').value = previous.edad ?? '';
                form.querySelector('#telefono').value = previous.telefono ?? '';

                // mascota_ids is an array
                const mascotaIds = Array.isArray(previous.mascota_ids) ? previous.mascota_ids : [];
                form.querySelector('#mascota_ids').value = mascotaIds.join(',');
            } catch (err) {
                showError(container, `Error al obtener dueño: ${err.message || err}`);
            }
        })();
    } else {
        titleEl.textContent = 'Nuevo dueño';
        form.querySelector('button[type="submit"]').textContent = 'Crear dueño';
        form.querySelector('#nombre').required = true;
        form.querySelector('#apellido').required = true;
        form.querySelector('#edad').required = true;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        container.querySelector('.__error').classList.add('hidden');
        container.querySelector('.__success').classList.add('hidden');

        const nombre = form.querySelector('#nombre').value.trim();
        const apellido = form.querySelector('#apellido').value.trim();
        const edad = Number(form.querySelector('#edad').value);
        const telefono = form.querySelector('#telefono').value.trim() || null;
        const mascotaInput = form.querySelector('#mascota_ids').value;
        const mascota_ids = parseIdList(mascotaInput);

        try {
            if (mode === 'edit') {
                const payload = { id, nombre, apellido, edad, telefono, mascota_ids };
                const res = await ApiClient.editarDueno(payload);
                if (res && res.ok) {
                    showSuccess(container, `Dueño actualizado correctamente (id: ${res.dueno_id ?? id}).`);
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'actualizar el dueño'));
                }
            } else {
                const payload = { nombre, apellido, edad, telefono, mascota_ids: mascota_ids.length ? mascota_ids : undefined };
                const res = await ApiClient.crearDueno(payload);
                if (res && res.ok) {
                    showSuccess(container, `Dueño creado correctamente (id: ${res.dueno_id}).`);
                    form.reset();
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'crear el dueño'));
                }
            }
        } catch (err) {
            showError(container, `Error en la petición: ${err.message || err}`);
        }
    });

    function formatErrors(errors, ctx = '') {
        if (!Array.isArray(errors)) return (errors && String(errors)) || 'Error desconocido';
        return errors.map((er, i) => (i === 0 ? (er.charAt(0).toUpperCase() + er.slice(1)) : er)).join(', ') + (ctx ? ` al ${ctx}.` : '.');
    }

    const final = {
        element: container,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(container);
                    else document.body.appendChild(container);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(container);
                    return;
                }
                document.body.appendChild(container);
            } catch (e) {
                console.error(`Error mounting dueno form component to ${target}: ${e}`);
            }
        },
        unmount: () => {
            try { container.remove(); }
            catch (e) { console.error(`Error unmounting dueno form component: ${e}`); }
        }
    };

    return final;
}

/**
 * VisitaForm factory
 * @param {'create'|'edit'} mode
 * @param {number|null} id
 */
function VisitaForm(mode = 'create', id = null) {
    if (typeof mode !== 'string') mode = 'create';
    if (mode !== 'create' && mode !== 'edit') mode = 'create';

    const container = new DOMParser().parseFromString(htmls.container, 'text/html').body.firstElementChild;
    const form = container.querySelector('#action-form');
    form.innerHTML = htmls.visitaFormContent;

    const titleEl = container.querySelector('#action-form-title');
    const metaEl = container.querySelector('.__meta');

    if (mode === 'edit') {
        titleEl.textContent = 'Editar visita';
        metaEl.classList.remove('hidden');
        metaEl.textContent = `ID: ${id}`;
        form.querySelector('button[type="submit"]').textContent = 'Guardar cambios';

        (async () => {
            try {
                const resp = await ApiClient.obtenerVisita(id);
                const previous = resp && resp.visita ? resp.visita : null;
                if (!previous) {
                    showError(container, 'No se encontró la visita solicitada.');
                    return;
                }
                form.querySelector('#mascota_id').value = previous.mascota_id ?? '';
                form.querySelector('#fecha').value = previous.fecha ?? '';
                form.querySelector('#diagnostico').value = previous.diagnostico ?? '';
                form.querySelector('#tratamiento').value = previous.tratamiento ?? '';
            } catch (err) {
                showError(container, `Error al obtener visita: ${err.message || err}`);
            }
        })();
    } else {
        titleEl.textContent = 'Nueva visita';
        form.querySelector('button[type="submit"]').textContent = 'Crear visita';
        form.querySelector('#mascota_id').required = true;
        form.querySelector('#fecha').required = true;
        form.querySelector('#diagnostico').required = true;
        form.querySelector('#tratamiento').required = true;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        container.querySelector('.__error').classList.add('hidden');
        container.querySelector('.__success').classList.add('hidden');

        const mascota_id = Number(form.querySelector('#mascota_id').value);
        const fecha = form.querySelector('#fecha').value;
        const diagnostico = form.querySelector('#diagnostico').value.trim();
        const tratamiento = form.querySelector('#tratamiento').value.trim();

        try {
            if (mode === 'edit') {
                const payload = { id, mascota_id, fecha, diagnostico, tratamiento };
                const res = await ApiClient.editarVisita(payload);
                if (res && res.ok) {
                    showSuccess(container, `Visita actualizada correctamente (id: ${res.visita_id ?? id}).`);
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'actualizar la visita'));
                }
            } else {
                const payload = { mascota_id, fecha, diagnostico, tratamiento };
                const res = await ApiClient.crearVisita(payload);
                if (res && res.ok) {
                    showSuccess(container, `Visita creada correctamente (id: ${res.visita_id}).`);
                    form.reset();
                } else {
                    const errs = (res && res.errors) ? res.errors : ((res && res.error) ? [res.error] : ['Respuesta inválida del servidor']);
                    showError(container, formatErrors(errs, 'crear la visita'));
                }
            }
        } catch (err) {
            showError(container, `Error en la petición: ${err.message || err}`);
        }
    });

    function formatErrors(errors, ctx = '') {
        if (!Array.isArray(errors)) return (errors && String(errors)) || 'Error desconocido';
        return errors.map((er, i) => (i === 0 ? (er.charAt(0).toUpperCase() + er.slice(1)) : er)).join(', ') + (ctx ? ` al ${ctx}.` : '.');
    }

    const final = {
        element: container,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(container);
                    else document.body.appendChild(container);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(container);
                    return;
                }
                document.body.appendChild(container);
            } catch (e) {
                console.error(`Error mounting visita form component to ${target}: ${e}`);
            }
        },
        unmount: () => {
            try { container.remove(); }
            catch (e) { console.error(`Error unmounting visita form component: ${e}`); }
        }
    };

    return final;
}

// exports
export { PetForm, DuenoForm, VisitaForm };
export default { PetForm, DuenoForm, VisitaForm };