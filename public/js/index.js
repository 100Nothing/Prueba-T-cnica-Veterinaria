// js/index.js

// Imports de una sola llamada (lógica de navegación, etc.)
import './modules/nav/sidebar-toggle.js';
import './modules/nav/sidebar-select.js';
import './modules/nav/close-modal.js';

import PrincipalView from './views/principal.js';
import loadView from './modules/view-loader.js';

loadView(new PrincipalView());