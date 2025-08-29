// js/views/principal.js

import Card from '../components/card.js';
import ApiClient from '../api-client.js';

class PrincipalView {
    constructor() {
        this.cards = [];
    }

    async load() {
        const d = await ApiClient.listarDuenos();
        const m = await ApiClient.obtenerTodasMascotas();
        const v = await ApiClient.obtenerTodasVisitas();

        const { duenos: duenosCount } = d ?? { duenos: null };
        const { mascotas: mascotasCount } = m ?? { mascotas: null };
        const { visitas: visitasCount } = v ?? { visitas: null };

        const duenosBody = () => {
            if (!duenosCount) {
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = 'No hay datos disponibles.';
                return p;
            };
            const p = document.createElement('p');
            p.classList.add('__meta');
            p.textContent = `Cantidad de dueños: ${duenosCount.length}`;
            return p;
        }

        const mascotasBody = () => {
            if (!mascotasCount) {
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = 'No hay datos disponibles.';
                return p;
            }
            const ps = [];
            const especies = {};
            mascotasCount.forEach(mascota => {
                if (especies[mascota.especie]) {
                    especies[mascota.especie]++;
                } else {
                    especies[mascota.especie] = 1;
                }
            });
            Object.entries(especies).forEach(([especie, count], i) => {
                if (i >= 4) return;
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = `${especie}: ${count}`;
                ps.push(p);
            });
            if (Object.entries(especies).length > 4) {
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = '...';
                ps.push(p);
            }
            return ps;
        }

        const visitasBody = () => {
            if (!visitasCount) {
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = 'No hay datos disponibles.';
                return p;
            }
            const ps = [];
            const latestVisitaPerMascota = {};
            visitasCount.sort((a, b) => b.fecha - a.fecha).forEach(visita => {
                if (!latestVisitaPerMascota[visita.mascota_id]) {
                    latestVisitaPerMascota[visita.mascota_id] = visita;
                }
            });
            Object.entries(latestVisitaPerMascota).forEach(([mascota_id, visita], i) => {
                if (i >= 4) return;
                const mascota = mascotasCount.find(mascota => mascota.id === parseInt(mascota_id));
                if (!mascota) return;
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = `${mascota.nombre}: ${visita.fecha}`;
                ps.push(p);
            });
            if (Object.entries(latestVisitaPerMascota).length > 4) {
                const p = document.createElement('p');
                p.classList.add('__meta');
                p.textContent = '...';
                ps.push(p);
            }
            return ps;
        }

        const duenosCard = Card({
            title: 'Dueños',
            body: [duenosBody()],
            icon: 'user'
        }, {
            classes: '--no-transform'
        });

        const mascotasCard = Card({
            title: 'Mascotas',
            body: mascotasBody(),
            icon: 'paw'
        }, {
            classes: '--no-transform'
        });

        const visitasCard = Card({
            title: 'Visitas Recientes',
            body: visitasBody(),
            icon: 'calendar'
        }, {
            classes: '--no-transform'
        });

        this.cards.push(duenosCard, mascotasCard, visitasCard);

        for (const card of this.cards) card.mount('#content-panel .fill');
    }

    unload() {
        for (const card of this.cards) card.unmount();
    }
}

export { PrincipalView };
export default PrincipalView;


