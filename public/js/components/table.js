// js/components/table.js

/**
 * Creates a new table component.
 * 
 * @param {{ columns?: string|Array<string|{label?:string,key?:string,useData?:boolean}>, rows?: { [key: string]: Array<any>|any } }} data - The data to initialize the table with.
 * @return {{
 *   element: HTMLTableElement,
 *   mount: (target: string|HTMLElement) => void,
 *   unmount: () => void,
 *   addRow: (row: Array<any>|{ [key: string]: any }) => boolean,
 *   removeRow: (matcher: string|{ [key: string]: any }) => boolean,
 *   updateRow: (matcher: string|{ [key: string]: any }, updates: { [key: string]: any }) => boolean,
 *   searchRows: (query: string|{ [key: string]: any }) => Array<Object>,
 *   addColumn: (col: string|{label?:string,key?:string,useData?:boolean}) => boolean,
 *   removeColumn: (col: string) => boolean,
 *   updateColumn: (col: string, newDef: string|{label?:string,key?:string,useData?:boolean}) => boolean,
 *   getColumn: (col: string, includeEmpty?: boolean) => Array<any>
 * }} The table component and a collection of helper functions.
*/
function Table(data = {}) {
    if (!data || typeof data !== 'object' || data === null) data = {};

    // normalize and accept mixed arrays of strings and objects
    function normalizeKey(str) {
        return String(str)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/__+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    // internal column shape: { label: string, key: string, useData: boolean }
    let internalColumns = [];
    if (typeof data.columns === 'string') data.columns = [data.columns];
    else if (Array.isArray(data.columns)) data.columns = data.columns.flat();
    else data.columns = [];

    data.columns.forEach(c => {
        if (typeof c === 'string' && c.length) {
            internalColumns.push({ label: c, key: normalizeKey(c), useData: false });
        } else if (c && typeof c === 'object' && Object.keys(c).length > 0) {
            const label = typeof c.label === 'string' ? c.label : (typeof c.key === 'string' ? c.key : '');
            const key = typeof c.key === 'string' && c.key.length ? c.key : normalizeKey(label);
            const useData = Boolean(c.useData);
            internalColumns.push({ label, key, useData });
        }
    });

    if (!data.rows || typeof data.rows !== 'object' || data.rows === null) data.rows = {};

    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    const body = document.createElement('tbody');

    function rebuildHeader() {
        headRow.innerHTML = '';
        if (internalColumns.length > 0) {
            internalColumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col.label;
                headRow.appendChild(th);
            });
        } else {
            const th = document.createElement('th');
            th.textContent = 'No data';
            headRow.appendChild(th);
        }
    }

    rebuildHeader();
    head.appendChild(headRow);

    // get column index by label/key (case-insensitive)
    function getColumnIndex(name) {
        if (!name || typeof name !== 'string') return -1;
        const lname = name.toLowerCase();
        for (let i = 0; i < internalColumns.length; i++) {
            const col = internalColumns[i];
            if ((col.label && col.label.toLowerCase() === lname) || (col.key && col.key.toLowerCase() === lname)) return i;
        }
        return -1;
    }

    // find column by query key: label/key first, otherwise scan cells for data-column-key
    function findColumnIndexForQueryKey(queryKey, cells) {
        const idx = getColumnIndex(queryKey);
        if (idx !== -1) return idx;
        if (!cells || !cells.length) return -1;
        const lk = queryKey.toLowerCase();
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell || typeof cell.getAttribute !== 'function') continue;
            const attr = cell.getAttribute('data-column-key');
            if (attr && attr.toLowerCase() === lk) return i;
        }
        return -1;
    }

    // fill a table cell
    function fillCell(td, val, colDef) {
        td.innerHTML = '';

        // helper to append text node
        const appendText = (txt) => {
            td.appendChild(document.createTextNode(String(txt)));
        };

        // empty cases
        if (typeof val === 'undefined' || val === null || (typeof val === 'string' && val === '')) {
            td.textContent = '---';
            if (colDef && colDef.useData && colDef.key) td.setAttribute('data-column-key', colDef.key);
            return;
        }

        // HTMLElement
        if (val instanceof HTMLElement) {
            td.appendChild(val);
            if (colDef && colDef.useData && colDef.key) td.setAttribute('data-column-key', colDef.key);
            return;
        }

        // Array handling
        if (Array.isArray(val)) {
            if (val.length === 0) {
                td.textContent = '---';
                if (colDef && colDef.useData && colDef.key) td.setAttribute('data-column-key', colDef.key);
                return;
            }

            // determine if there are any elements among the items
            const allAreElements = val.every(item => item instanceof HTMLElement);
            const allAreStringsOrNumbers = val.every(item => typeof item === 'string' || typeof item === 'number');

            if (allAreElements) {
                for (let i = 0; i < val.length; i++) {
                    const item = val[i];
                    td.appendChild(item);
                }
            } else if (allAreStringsOrNumbers) {
                td.textContent = val.join(', ');
            } else {
                // mixed, append each one
                for (let i = 0; i < val.length; i++) {
                    const item = val[i];
                    const isEl = item instanceof HTMLElement;

                    if (isEl) {
                        td.appendChild(item);
                    } else {
                        appendText(item == null ? '' : item);
                    }
                }
            }

            if (colDef && colDef.useData && colDef.key) td.setAttribute('data-column-key', colDef.key);
            return;
        }

        // fallback primitive -> string
        td.textContent = String(val);
        if (colDef && colDef.useData && colDef.key) td.setAttribute('data-column-key', colDef.key);
    }

    // initial populate
    if (Object.keys(data.rows).length > 0 && internalColumns.length > 0) {
        const rowsObj = data.rows || {};
        const normalizedKeyMap = {};
        Object.keys(rowsObj).forEach(k => { normalizedKeyMap[k.toLowerCase()] = k; });

        const columnValues = internalColumns.map(col => {
            const lookupKey = (col.key || '').toLowerCase();
            const sourceKey = normalizedKeyMap[lookupKey];
            const raw = typeof sourceKey !== 'undefined' ? rowsObj[sourceKey] : undefined;
            if (Array.isArray(raw)) return raw.slice();
            if (typeof raw === 'undefined') return [];
            return [raw];
        });

        const maxRows = columnValues.reduce((max, arr) => Math.max(max, arr.length), 0);

        for (let r = 0; r < maxRows; r++) {
            const tr = document.createElement('tr');

            internalColumns.forEach((c, colIndex) => {
                const td = document.createElement('td');
                let val = columnValues[colIndex][r];
                fillCell(td, val, c);
                tr.appendChild(td);
            });

            body.appendChild(tr);
        }
    } else if (Object.keys(data.rows).length > 0 && internalColumns.length === 0) {
        // rows exist but no columns - render rows as single-cell rows
        const rowsObj = data.rows || {};
        const keys = Object.keys(rowsObj);
        const maxLen = keys.reduce((m, k) => Math.max(m, Array.isArray(rowsObj[k]) ? rowsObj[k].length : 1), 0);
        for (let r = 0; r < maxLen; r++) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.textContent = '---';
            tr.appendChild(td);
            body.appendChild(tr);
        }
    } else {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = 'No data';
        tr.appendChild(td);
        body.appendChild(tr);
    }

    table.appendChild(head);
    table.appendChild(body);

    function addRow(row) {
        try {
            if (internalColumns.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                fillCell(td, typeof row === 'undefined' ? '---' : row, null);
                tr.appendChild(td);
                if (body.children.length === 1 && body.children[0].textContent.trim() === 'No data') body.innerHTML = '';
                body.appendChild(tr);
                return true;
            }

            const tr = document.createElement('tr');

            if (Array.isArray(row)) {
                internalColumns.forEach((c, i) => {
                    const td = document.createElement('td');
                    fillCell(td, row[i], c);
                    tr.appendChild(td);
                });
            } else if (row && typeof row === 'object' && Object.keys(row).length > 0) {
                const lcMap = {};
                Object.keys(row).forEach(k => { lcMap[k.toLowerCase()] = row[k]; });

                internalColumns.forEach((c) => {
                    const td = document.createElement('td');
                    const lookupKey = (c.key || '').toLowerCase();
                    const lookupLabel = (c.label || '').toLowerCase();
                    let val;
                    if (Object.prototype.hasOwnProperty.call(lcMap, lookupKey)) val = lcMap[lookupKey];
                    else if (Object.prototype.hasOwnProperty.call(lcMap, lookupLabel)) val = lcMap[lookupLabel];
                    else val = undefined;
                    fillCell(td, val, c);
                    tr.appendChild(td);
                });
            } else {
                internalColumns.forEach((c, i) => {
                    const td = document.createElement('td');
                    fillCell(td, i === 0 ? row : undefined, c);
                    tr.appendChild(td);
                });
            }

            if (body.children.length === 1 && body.children[0].textContent.trim() === 'No data') body.innerHTML = '';
            body.appendChild(tr);
            return true;
        } catch (e) {
            console.error(`Error in addRow: ${e}`);
            return false;
        }
    }

    function removeRow(matcher) {
        try {
            if (!matcher) return false;

            const rows = Array.from(body.querySelectorAll('tr'));
            let removed = false;

            // string matcher -> global partial match
            if (typeof matcher === 'string') {
                const needle = matcher.toLowerCase();
                rows.forEach(tr => {
                    const cells = Array.from(tr.children);
                    if (internalColumns.length === 0) return;
                    let found = false;
                    for (const cell of cells) {
                        const txt = cell.textContent == null ? '' : cell.textContent.trim().toLowerCase();
                        if (txt.includes(needle)) { found = true; break; }
                    }
                    if (found) { tr.remove(); removed = true; }
                });
                return removed;
            }

            if (typeof matcher !== 'object') return false;

            const lcMatcher = {};
            Object.keys(matcher).forEach(k => { lcMatcher[k.toLowerCase()] = matcher[k]; });

            rows.forEach(tr => {
                const cells = Array.from(tr.children);
                if (internalColumns.length === 0) return;

                let allMatch = true;
                for (const key in lcMatcher) {
                    const idx = findColumnIndexForQueryKey(key, cells);
                    if (idx === -1) { allMatch = false; break; }
                    const cell = cells[idx];
                    if (!cell) { allMatch = false; break; }

                    const expected = lcMatcher[key];
                    if (expected instanceof HTMLElement) {
                        if (!cell.firstElementChild || cell.firstElementChild !== expected) { allMatch = false; break; }
                    } else {
                        const cellText = cell.textContent == null ? '' : cell.textContent.trim();
                        if (String(expected) !== cellText) { allMatch = false; break; }
                    }
                }

                if (allMatch) {
                    tr.remove();
                    removed = true;
                }
            });

            return removed;
        } catch (e) {
            console.error(`Error in removeRow: ${e}`);
            return false;
        }
    }

    function updateRow(matcher, updates) {
        try {
            if (!matcher) return false;
            if (!updates || typeof updates !== 'object') return false;

            const rows = Array.from(body.querySelectorAll('tr'));
            let updatedAny = false;

            // string matcher => update any row that contains substring in any cell
            if (typeof matcher === 'string') {
                const needle = matcher.toLowerCase();
                rows.forEach(tr => {
                    const cells = Array.from(tr.children);
                    if (internalColumns.length === 0) return;
                    let found = false;
                    for (const cell of cells) {
                        const txt = cell.textContent == null ? '' : cell.textContent.trim().toLowerCase();
                        if (txt.includes(needle)) { found = true; break; }
                    }
                    if (found) {
                        // apply updates: updates object keys resolved by column
                        Object.keys(updates).forEach(k => {
                            const idx = findColumnIndexForQueryKey(k, cells);
                            if (idx === -1) return;
                            const cell = cells[idx] || (() => { const created = document.createElement('td'); tr.appendChild(created); return created; })();
                            const colDef = internalColumns[idx];
                            fillCell(cell, updates[k], colDef);
                        });
                        updatedAny = true;
                    }
                });
                return updatedAny;
            }

            // object matcher
            const lcMatcher = {};
            Object.keys(matcher).forEach(k => { lcMatcher[k.toLowerCase()] = matcher[k]; });
            const lcUpdates = {};
            Object.keys(updates).forEach(k => { lcUpdates[k.toLowerCase()] = updates[k]; });

            rows.forEach(tr => {
                const cells = Array.from(tr.children);
                if (internalColumns.length === 0) return;

                let allMatch = true;
                for (const key in lcMatcher) {
                    const idx = findColumnIndexForQueryKey(key, cells);
                    if (idx === -1) { allMatch = false; break; }
                    const cell = cells[idx];
                    if (!cell) { allMatch = false; break; }

                    const expected = lcMatcher[key];
                    if (expected instanceof HTMLElement) {
                        if (!cell.firstElementChild || cell.firstElementChild !== expected) { allMatch = false; break; }
                    } else {
                        const cellText = cell.textContent == null ? '' : cell.textContent.trim();
                        if (String(expected) !== cellText) { allMatch = false; break; }
                    }
                }

                if (allMatch) {
                    for (const updKey in lcUpdates) {
                        const idx = findColumnIndexForQueryKey(updKey, cells);
                        if (idx === -1) continue;
                        const cell = cells[idx] || (() => { const created = document.createElement('td'); tr.appendChild(created); return created; })();
                        const colDef = internalColumns[idx];
                        fillCell(cell, lcUpdates[updKey], colDef);
                    }
                    updatedAny = true;
                }
            });

            return updatedAny;
        } catch (e) {
            console.error(`Error in updateRow: ${e}`);
            return false;
        }
    }

    function searchRows(query) {
        try {
            if (!query) return [];

            const rows = Array.from(body.querySelectorAll('tr'));
            const results = [];

            // string search -> global partial match
            if (typeof query === 'string') {
                const needle = query.toLowerCase();
                rows.forEach((tr, rowIdx) => {
                    if (internalColumns.length === 0) return;
                    const cells = Array.from(tr.children);
                    let matched = false;
                    for (const cell of cells) {
                        const txt = cell.textContent == null ? '' : cell.textContent.trim().toLowerCase();
                        if (txt.includes(needle)) { matched = true; break; }
                    }
                    if (matched) {
                        const dataObj = {};
                        internalColumns.forEach((col, i) => {
                            const cell = cells[i];
                            if (!cell) { dataObj[col.key] = null; return; }
                            if (cell.firstElementChild) dataObj[col.key] = cell.firstElementChild;
                            else dataObj[col.key] = cell.textContent == null ? '' : cell.textContent.trim();
                        });
                        results.push({ query, index: rowIdx, data: dataObj });
                    }
                });
                return results;
            }

            // object search -> scoped by columns
            if (typeof query === 'object') {
                const lcQuery = {};
                Object.keys(query).forEach(k => { lcQuery[k.toLowerCase()] = query[k]; });

                rows.forEach((tr, rowIdx) => {
                    if (internalColumns.length === 0) return;
                    const cells = Array.from(tr.children);

                    let allMatch = true;
                    for (const key in lcQuery) {
                        const idx = findColumnIndexForQueryKey(key, cells);
                        if (idx === -1) { allMatch = false; break; }
                        const cell = cells[idx];
                        if (!cell) { allMatch = false; break; }

                        const expected = lcQuery[key];
                        if (expected instanceof HTMLElement) {
                            if (!cell.firstElementChild || cell.firstElementChild !== expected) { allMatch = false; break; }
                        } else {
                            const cellText = cell.textContent == null ? '' : cell.textContent.trim();
                            const expectedStr = String(expected == null ? '' : expected).toLowerCase();
                            if (!cellText.toLowerCase().includes(expectedStr)) { allMatch = false; break; }
                        }
                    }

                    if (allMatch) {
                        const dataObj = {};
                        internalColumns.forEach((col, i) => {
                            const cell = cells[i];
                            if (!cell) { dataObj[col.key] = null; return; }
                            if (cell.firstElementChild) dataObj[col.key] = cell.firstElementChild;
                            else dataObj[col.key] = cell.textContent == null ? '' : cell.textContent.trim();
                        });

                        results.push({ query, index: rowIdx, data: dataObj });
                    }
                });

                return results;
            }

            return [];
        } catch (e) {
            console.error(`Error in searchRows: ${e}`);
            return [];
        }
    }

    function addColumn(col) {
        try {
            let newCol;
            if (typeof col === 'string') newCol = { label: col, key: normalizeKey(col), useData: false };
            else if (col && typeof col === 'object') {
                const label = typeof col.label === 'string' ? col.label : (typeof col.key === 'string' ? col.key : '');
                const key = typeof col.key === 'string' && col.key.length ? col.key : normalizeKey(label);
                const useData = Boolean(col.useData);
                newCol = { label, key, useData };
            } else return false;

            internalColumns.push(newCol);
            rebuildHeader();

            const rows = Array.from(body.querySelectorAll('tr'));
            rows.forEach(tr => {
                const td = document.createElement('td');
                fillCell(td, undefined, newCol);
                tr.appendChild(td);
            });

            return true;
        } catch (e) {
            console.error(`Error in addColumn: ${e}`);
            return false;
        }
    }

    function removeColumn(col) {
        try {
            const idx = getColumnIndex(col);
            if (idx === -1) return false;
            internalColumns.splice(idx, 1);
            rebuildHeader();
            const rows = Array.from(body.querySelectorAll('tr'));
            rows.forEach(tr => {
                const cells = Array.from(tr.children);
                if (cells[idx]) cells[idx].remove();
            });
            return true;
        } catch (e) {
            console.error(`Error in removeColumn: ${e}`);
            return false;
        }
    }

    function updateColumn(col, newDef) {
        try {
            const idx = getColumnIndex(col);
            if (idx === -1) return false;
            const existing = internalColumns[idx];
            let updated;
            if (typeof newDef === 'string') {
                updated = { label: newDef, key: normalizeKey(newDef), useData: existing.useData || false };
            } else if (newDef && typeof newDef === 'object') {
                const label = typeof newDef.label === 'string' ? newDef.label : existing.label;
                const key = typeof newDef.key === 'string' && newDef.key.length ? newDef.key : normalizeKey(label);
                const useData = typeof newDef.useData === 'boolean' ? newDef.useData : existing.useData;
                updated = { label, key, useData };
            } else return false;

            internalColumns[idx] = updated;
            rebuildHeader();

            // update existing cells in body for data attribute toggles
            const rows = Array.from(body.querySelectorAll('tr'));
            rows.forEach(tr => {
                const cells = Array.from(tr.children);
                const cell = cells[idx];
                if (!cell) return;
                if (updated.useData && updated.key) {
                    cell.setAttribute('data-column-key', updated.key);
                } else {
                    if (cell.hasAttribute && cell.hasAttribute('data-column-key')) cell.removeAttribute('data-column-key');
                }
            });

            return true;
        } catch (e) {
            console.error(`Error in updateColumn: ${e}`);
            return false;
        }
    }

    function getColumn(col, includeEmpty = false) {
        try {
            const idx = getColumnIndex(col);
            if (idx === -1) return [];
            const rows = Array.from(body.querySelectorAll('tr'));
            const out = [];
            rows.forEach(tr => {
                const cells = Array.from(tr.children);
                const cell = cells[idx];
                if (!cell) {
                    if (includeEmpty) out.push(null);
                    return;
                }
                if (cell.firstElementChild) {
                    out.push(cell.firstElementChild);
                } else {
                    const text = cell.textContent == null ? '' : cell.textContent.trim();
                    if (text === '---') {
                        if (includeEmpty) out.push(null);
                    } else out.push(text);
                }
            });
            return out;
        } catch (e) {
            console.error(`Error in getColumn: ${e}`);
            return [];
        }
    }

    const final = {
        element: table,
        mount: (target) => {
            try {
                if (typeof target === 'string') {
                    const el = document.querySelector(target);
                    if (el && typeof el.appendChild === 'function') el.appendChild(table);
                    else document.body.appendChild(table);
                    return;
                }
                if (target && typeof target.appendChild === 'function') {
                    target.appendChild(table);
                    return;
                }
                document.body.appendChild(table);
            } catch (e) {
                console.error(`Error mounting table component to ${target}: ${e}`);
            }
        },
        unmount: () => {
            try { table.remove(); }
            catch (e) { console.error(`Error unmounting card component: ${e}`); }
        },
        addRow,
        removeRow,
        updateRow,
        searchRows,
        addColumn,
        removeColumn,
        updateColumn,
        getColumn
    };

    return final;
}

export { Table };
export default Table;