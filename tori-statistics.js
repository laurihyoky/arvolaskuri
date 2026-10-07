/* Tori-arvolaskuri: tilastojen mukautus (KPI-valinnat, kauppavertailutaulukko,
 * aikajanan tila ja mittari). Ladataan vain arvolaskuri.html-sivulla.
 * Integraatio: renderSummaryView() kutsuu ToriStats.afterSummaryRender(stores, monthList)
 * viimeisenä. Oletusasetuksilla moduuli ei muuta alkuperäistä näkymää lainkaan. */
(function () {
    'use strict';

    var STORAGE_KEY = 'arvolaskuri.toriStats.v1';

    var METRICS = {
        stores:            { label: 'Kaupat',                       sub: 'valittuna',          kpiOnly: true },
        leads:             { label: 'Liidit yhteensä',              sub: null,                 additive: true, unit: 'liidiä', axis: 'Liidit (kpl)' },
        clicks:            { label: 'Klikkaukset yhteensä',         sub: null,                 additive: true, unit: 'klikkausta', axis: 'Klikkaukset' },
        ads:               { label: 'Ilmoituksia keskim.',          sub: 'per kuukausi',       additive: true, unit: 'ilmoitusta', axis: 'Ilmoitukset (kpl)', chartLabel: 'Ilmoitukset' },
        leadsPerAd:        { label: 'Liidejä / ilmoitus',           sub: 'painotettu keskiarvo', ratio: true, digits: 2, axis: 'Liidejä / ilmoitus' },
        clicksPerAd:       { label: 'Klikkauksia / ilmoitus',       sub: 'painotettu keskiarvo', ratio: true, digits: 1, axis: 'Klikkauksia / ilmoitus' },
        leadsPer100Clicks: { label: 'Liidejä / 100 klikkausta',     sub: 'painotettu keskiarvo', ratio: true, digits: 2, axis: 'Liidejä / 100 klikkausta' }
    };
    var KPI_CHOICES = ['stores', 'leads', 'clicks', 'ads', 'leadsPerAd', 'clicksPerAd', 'leadsPer100Clicks'];
    var TIMELINE_METRICS = ['leads', 'clicks', 'ads', 'leadsPerAd', 'clicksPerAd', 'leadsPer100Clicks'];
    var TIMELINE_MODES = { stacked: 'Pinottu kaupoittain (alkuperäinen)', chain: 'Ketju yhteensä', compare: 'Valittujen kauppojen vertailu' };
    var COMPARE_COLORS = ['#f94f55', '#8b2034', '#ef8590', '#b83149', '#65182b', '#dc6578', '#a34858', '#ce2949'];
    var DASHES = [[], [6, 4], [2, 3], [10, 3, 2, 3]];
    var BEST_STORE_METRICS = {
        leadsPerAd: 'Eniten liidejä / ilmoitus (alkuperäinen)',
        leads: 'Eniten liidejä yhteensä',
        clicksPerMonth: 'Eniten klikkauksia / kk (keskiarvo)',
        clicksPerAd: 'Eniten klikkauksia / ilmoitus'
    };

    var DEFAULTS = {
        kpis: ['stores', 'leads', 'clicks', 'ads'],
        showTable: false,
        showBubbles: false,
        insightMetric: 'leadsPerAd',
        bestStoreMetric: 'leadsPerAd',
        timelineMode: 'stacked',
        timelineMetric: 'leads',
        compareIds: null, // null = automaattisesti viisi ensimmäistä valittua
        tableSort: { key: 'leads', dir: 'desc' }
    };

    var state = load();
    var tableQuery = '';
    var compareQuery = '';
    var last = { stores: [], monthList: [] };
    var originalTimelineTitle = null;

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function load() {
        var s = clone(DEFAULTS);
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var p = JSON.parse(raw) || {};
                if (Array.isArray(p.kpis) && p.kpis.length === 4 && p.kpis.every(function (k) { return KPI_CHOICES.indexOf(k) >= 0; })) s.kpis = p.kpis;
                if (typeof p.showTable === 'boolean') s.showTable = p.showTable;
                if (typeof p.showBubbles === 'boolean') s.showBubbles = p.showBubbles;
                if (p.insightMetric === 'leadsPerAd' || p.insightMetric === 'clicksPerAd') s.insightMetric = p.insightMetric;
                if (Object.prototype.hasOwnProperty.call(BEST_STORE_METRICS, p.bestStoreMetric)) s.bestStoreMetric = p.bestStoreMetric;
                if (TIMELINE_MODES[p.timelineMode]) s.timelineMode = p.timelineMode;
                if (TIMELINE_METRICS.indexOf(p.timelineMetric) >= 0) s.timelineMetric = p.timelineMetric;
                if (Array.isArray(p.compareIds)) s.compareIds = p.compareIds.map(String);
                if (p.tableSort && typeof p.tableSort.key === 'string') s.tableSort = { key: p.tableSort.key, dir: p.tableSort.dir === 'asc' ? 'asc' : 'desc' };
            }
        } catch (e) { /* ohitetaan vioittunut tallenne */ }
        if (s.timelineMode === 'stacked' && METRICS[s.timelineMetric].ratio) s.timelineMetric = 'leads';
        return s;
    }
    function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ei tallennustilaa */ } }
    function isDefaultKpi(i) { return state.kpis[i] === DEFAULTS.kpis[i]; }
    function isDefaultTimeline() { return state.timelineMode === 'stacked' && state.timelineMetric === 'leads'; }

    // ─── Laskenta ─────────────────────────────────────────────────────────
    function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
    function findRow(s, m) {
        return s.rows.find(function (r) { return r['Month of Event Date'] === m.month && String(r['Year of Event Date']) === m.year; });
    }
    function rowVals(row) {
        return {
            leads: num(row['N Conversation Start']) + num(row['N Homepage Link Clicked']) + num(row['N Phone Leads']),
            clicks: num(row['N Ad Views']),
            ads: num(row['N Ads'])
        };
    }
    function emptyAgg() { return { leads: 0, clicks: 0, ads: 0, n: 0 }; }
    function addRow(agg, row) { var v = rowVals(row); agg.leads += v.leads; agg.clicks += v.clicks; agg.ads += v.ads; agg.n++; }
    // Palauttaa null kun arvoa ei voida laskea (nimittäjä 0 tai ei dataa).
    function metricFromAgg(agg, key) {
        if (!agg || agg.n === 0) return null;
        switch (key) {
            case 'leads': return agg.leads;
            case 'clicks': return agg.clicks;
            case 'ads': return agg.ads / agg.n;
            case 'adsSum': return agg.ads;
            case 'leadsPerAd': return agg.ads > 0 ? agg.leads / agg.ads : null;
            case 'clicksPerAd': return agg.ads > 0 ? agg.clicks / agg.ads : null;
            case 'leadsPer100Clicks': return agg.clicks > 0 ? agg.leads / agg.clicks * 100 : null;
        }
        return null;
    }
    function storeAgg(s, monthList) {
        var a = emptyAgg();
        monthList.forEach(function (m) { var r = findRow(s, m); if (r) addRow(a, r); });
        return a;
    }
    function fmt(key, v) {
        if (v === null || v === undefined || !isFinite(v)) return '–';
        var d = METRICS[key] && METRICS[key].ratio ? METRICS[key].digits : 0;
        return Number(v).toLocaleString('fi-FI', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function periodSubText(monthList) {
        var pm = typeof periodMonths !== 'undefined' ? periodMonths : 0;
        return pm === 0 ? 'koko ajalta' : pm === -1 ? 'mukautettu (' + monthList.length + ' kk)' : pm === 1 ? 'viim. kuukausi' : 'viim. ' + pm + ' kk';
    }
    function compareStores(stores) {
        var ids = stores.map(function (s) { return s.id; });
        var chosen = state.compareIds === null ? ids.slice(0, 5) : state.compareIds.filter(function (id) { return ids.indexOf(id) >= 0; });
        return stores.filter(function (s) { return chosen.indexOf(s.id) >= 0; });
    }

    // ─── DOM-apurit ───────────────────────────────────────────────────────
    function el(tag, attrs, text) {
        var n = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            if (k === 'class') n.className = attrs[k];
            else if (k === 'style') n.style.cssText = attrs[k];
            else n.setAttribute(k, attrs[k]);
        });
        if (text !== undefined && text !== null) n.textContent = text;
        return n;
    }
    function optionsFor(select, keys, value, disabledFn) {
        select.textContent = '';
        keys.forEach(function (k) {
            var o = el('option', { value: k }, k === 'ads' && METRICS[k].chartLabel && select.dataset.chart ? 'Ilmoitusmäärä' : METRICS[k].label);
            if (disabledFn && disabledFn(k)) o.disabled = true;
            if (k === value) o.selected = true;
            select.appendChild(o);
        });
    }

    // ─── Asetuspaneeli ────────────────────────────────────────────────────
    var ui = {};
    function buildUi() {
        var periodLeft = document.querySelector('#periodBar .period-bar-left');
        var summary = document.getElementById('summaryView');
        var kpiRow = document.getElementById('kpiRow');
        if (!periodLeft || !summary || !kpiRow) return false;

        ui.toggle = el('button', { type: 'button', class: 'ts-settings-btn', id: 'tsSettingsBtn', 'aria-expanded': 'false', 'aria-controls': 'tsSettingsPanel', 'data-testid': 'button-stats-settings' });
        ui.toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.4" fill="#fff"/><circle cx="15" cy="17" r="2.4" fill="#fff"/></svg>';
        ui.toggle.appendChild(document.createTextNode('Tilastoasetukset'));
        ui.badge = el('span', { class: 'ts-settings-badge', 'aria-hidden': 'true' }, '');
        ui.toggle.appendChild(ui.badge);
        periodLeft.appendChild(ui.toggle);

        var panel = el('section', { class: 'ts-panel', id: 'tsSettingsPanel', 'aria-labelledby': 'tsPanelTitle', hidden: '' });
        var head = el('div', { class: 'ts-panel-head' });
        var titleWrap = el('div');
        titleWrap.appendChild(el('h2', { class: 'ts-panel-title', id: 'tsPanelTitle' }, 'Tilastonäkymän asetukset'));
        titleWrap.appendChild(el('p', { class: 'ts-panel-lead' }, 'Valinnat koskevat vain yllä valittuja kauppoja ja aikajaksoa. Asetukset tallentuvat tähän selaimeen.'));
        head.appendChild(titleWrap);
        var headActions = el('div', { class: 'ts-panel-actions' });
        ui.reset = el('button', { type: 'button', class: 'ts-link-btn', 'data-testid': 'button-stats-reset' }, 'Palauta alkuperäinen');
        var close = el('button', { type: 'button', class: 'ts-close', 'aria-label': 'Sulje asetukset', 'data-testid': 'button-stats-close' }, '×');
        headActions.appendChild(ui.reset); headActions.appendChild(close);
        head.appendChild(headActions);
        panel.appendChild(head);

        var grid = el('div', { class: 'ts-grid' });

        // KPI-valinnat
        var g1 = el('fieldset', { class: 'ts-group' });
        g1.appendChild(el('legend', null, 'Tunnuslukukortit'));
        ui.kpiSelects = [];
        for (var i = 0; i < 4; i++) {
            var f = el('div', { class: 'ts-field' });
            var id = 'tsKpi' + i;
            f.appendChild(el('label', { for: id }, 'Kortti ' + (i + 1)));
            var sel = el('select', { id: id, 'data-testid': 'select-kpi-' + (i + 1) });
            sel.dataset.idx = String(i);
            sel.addEventListener('change', function (e) { state.kpis[Number(e.target.dataset.idx)] = e.target.value; commit(); });
            f.appendChild(sel); g1.appendChild(f); ui.kpiSelects.push(sel);
        }
        grid.appendChild(g1);

        // Aikajana
        var g2 = el('fieldset', { class: 'ts-group' });
        g2.appendChild(el('legend', null, 'Kehityskaavio'));
        var modeWrap = el('div', { class: 'ts-radio-list', role: 'radiogroup', 'aria-label': 'Kaavion tila' });
        ui.modeRadios = [];
        Object.keys(TIMELINE_MODES).forEach(function (k) {
            var lab = el('label', { class: 'ts-radio' });
            var r = el('input', { type: 'radio', name: 'tsMode', value: k, 'data-testid': 'radio-timeline-' + k });
            r.addEventListener('change', function () {
                state.timelineMode = k;
                if (k === 'stacked' && METRICS[state.timelineMetric].ratio) state.timelineMetric = 'leads';
                commit();
            });
            lab.appendChild(r); lab.appendChild(el('span', null, TIMELINE_MODES[k]));
            modeWrap.appendChild(lab); ui.modeRadios.push(r);
        });
        g2.appendChild(modeWrap);
        var mf = el('div', { class: 'ts-field' });
        mf.appendChild(el('label', { for: 'tsTimelineMetric' }, 'Mittari'));
        ui.metricSelect = el('select', { id: 'tsTimelineMetric', 'data-testid': 'select-timeline-metric', 'aria-describedby': 'tsMetricHint' });
        ui.metricSelect.dataset.chart = '1';
        ui.metricSelect.addEventListener('change', function (e) { state.timelineMetric = e.target.value; commit(); });
        mf.appendChild(ui.metricSelect);
        ui.metricHint = el('p', { class: 'ts-hint', id: 'tsMetricHint' }, '');
        mf.appendChild(ui.metricHint);
        g2.appendChild(mf);
        grid.appendChild(g2);

        var insightField = el('div', { class: 'ts-field' });
        insightField.appendChild(el('label', { for: 'tsInsightMetric' }, 'Havaintojen keskiarvo'));
        ui.insightSelect = el('select', { id: 'tsInsightMetric', 'data-testid': 'select-insight-metric' });
        ui.insightSelect.addEventListener('change', function (e) { state.insightMetric = e.target.value; commit(); });
        insightField.appendChild(ui.insightSelect);
        g1.appendChild(insightField);
        var bestField = el('div', { class: 'ts-field' });
        bestField.appendChild(el('label', { for: 'tsBestStoreMetric' }, 'Tehokkaimman kaupan mittari'));
        ui.bestStoreSelect = el('select', { id: 'tsBestStoreMetric', 'data-testid': 'select-best-store-metric', 'aria-describedby': 'tsBestStoreHint' });
        ui.bestStoreSelect.addEventListener('change', function (e) { state.bestStoreMetric = e.target.value; commit(); });
        bestField.appendChild(ui.bestStoreSelect);
        bestField.appendChild(el('p', { class: 'ts-hint', id: 'tsBestStoreHint' }, 'Vertailu koskee valittuja kauppoja ja aikajaksoa. Kuukausikeskiarvo lasketaan kuukausista, joilta kaupalla on dataa; puuttuva kuukausi ei ole nolla.'));
        g1.appendChild(bestField);

        // Vertailtavat kaupat + taulukko
        var g3 = el('fieldset', { class: 'ts-group ts-group-wide' });
        g3.appendChild(el('legend', null, 'Kauppavertailu'));
        var tl = el('label', { class: 'ts-switch-row' });
        ui.tableToggle = el('input', { type: 'checkbox', id: 'tsShowTable', 'data-testid': 'toggle-store-table' });
        ui.tableToggle.addEventListener('change', function (e) { state.showTable = e.target.checked; commit(); });
        tl.appendChild(ui.tableToggle);
        tl.appendChild(el('span', null, 'Näytä kauppavertailutaulukko'));
        g3.appendChild(tl);
        var bubbleLabel = el('label', { class: 'ts-switch-row' });
        ui.bubbleToggle = el('input', { type: 'checkbox', id: 'tsShowBubbles', 'data-testid': 'toggle-bubble-chart' });
        ui.bubbleToggle.addEventListener('change', function (e) { state.showBubbles = e.target.checked; commit(); });
        bubbleLabel.appendChild(ui.bubbleToggle);
        bubbleLabel.appendChild(el('span', null, 'Näytä klikkausten pallokaavio alaosassa'));
        g3.appendChild(bubbleLabel);

        ui.compareBox = el('div', { class: 'ts-compare' });
        var ch = el('div', { class: 'ts-compare-head' });
        ui.compareCount = el('span', { class: 'ts-compare-count', 'aria-live': 'polite' }, '');
        ch.appendChild(el('span', { class: 'ts-compare-title', id: 'tsCompareTitle' }, 'Vertailukaavion kaupat'));
        ch.appendChild(ui.compareCount);
        ui.compareBox.appendChild(ch);
        var crow = el('div', { class: 'ts-compare-tools' });
        ui.compareSearch = el('input', { type: 'search', class: 'ts-search', placeholder: 'Hae kauppaa', 'aria-label': 'Hae vertailtavaa kauppaa', 'data-testid': 'input-compare-search' });
        ui.compareSearch.addEventListener('input', function (e) { compareQuery = e.target.value; renderCompareList(); });
        var allBtn = el('button', { type: 'button', class: 'ts-link-btn', 'data-testid': 'button-compare-all' }, 'Kaikki');
        var noneBtn = el('button', { type: 'button', class: 'ts-link-btn', 'data-testid': 'button-compare-none' }, 'Tyhjennä');
        allBtn.addEventListener('click', function () { state.compareIds = last.stores.map(function (s) { return s.id; }); commit(); });
        noneBtn.addEventListener('click', function () { state.compareIds = []; commit(); });
        crow.appendChild(ui.compareSearch); crow.appendChild(allBtn); crow.appendChild(noneBtn);
        ui.compareBox.appendChild(crow);
        ui.compareList = el('div', { class: 'ts-compare-list', role: 'group', 'aria-labelledby': 'tsCompareTitle' });
        ui.compareBox.appendChild(ui.compareList);
        g3.appendChild(ui.compareBox);
        grid.appendChild(g3);

        panel.appendChild(grid);
        summary.insertBefore(panel, summary.firstChild);
        ui.panel = panel;

        // Taulukko KPI-rivin jälkeen
        ui.tableCard = el('section', { class: 'card ts-table-card', id: 'tsTableCard', 'aria-labelledby': 'tsTableTitle', hidden: '' });
        var th = el('div', { class: 'ts-table-head' });
        th.appendChild(el('h2', { class: 'card-title ts-table-title', id: 'tsTableTitle' }, 'Kauppavertailu'));
        ui.tableSearch = el('input', { type: 'search', class: 'ts-search', placeholder: 'Hae kauppaa', 'aria-label': 'Hae taulukosta kauppaa', 'data-testid': 'input-table-search' });
        ui.tableSearch.addEventListener('input', function (e) { tableQuery = e.target.value; renderTable(); });
        th.appendChild(ui.tableSearch);
        ui.tableCard.appendChild(th);
        ui.tableMeta = el('p', { class: 'ts-table-meta', 'aria-live': 'polite' }, '');
        ui.tableCard.appendChild(ui.tableMeta);
        var scroll = el('div', { class: 'ts-table-scroll' });
        ui.table = el('table', { class: 'ts-table', 'data-testid': 'table-store-comparison' });
        scroll.appendChild(ui.table);
        ui.tableCard.appendChild(scroll);
        kpiRow.parentNode.insertBefore(ui.tableCard, kpiRow.nextSibling);

        ui.bubbleCard = el('section', { class: 'card ts-bubble-card', hidden: '', 'aria-labelledby': 'tsBubbleTitle', 'data-testid': 'bubble-chart' });
        ui.bubbleCard.appendChild(el('h2', { class: 'card-title', id: 'tsBubbleTitle' }, 'Klikkaukset kaupoittain ja kuukausittain'));
        ui.bubbleCard.appendChild(el('p', { class: 'ts-bubble-intro' }, 'Suurempi pallo = enemmän klikkauksia. Pallon pinta-ala kuvaa klikkausmäärää samalla asteikolla kaikille kaupoille. Kaupat on järjestetty jakson klikkausmäärän mukaan.'));
        ui.bubbleLegend = el('div', { class: 'ts-bubble-legend', 'aria-label': 'Pallojen kokojen selite' });
        ui.bubbleCard.appendChild(ui.bubbleLegend);
        ui.bubbleScroll = el('div', { class: 'ts-bubble-scroll', tabindex: '0', 'aria-label': 'Klikkausten pallokaavio. Vieritä vaakasuunnassa nähdäksesi kaikki kuukaudet.' });
        ui.bubbleCard.appendChild(ui.bubbleScroll);
        ui.bubbleDetail = el('p', { class: 'ts-bubble-detail', role: 'status', 'aria-live': 'polite' }, '');
        ui.bubbleCard.appendChild(ui.bubbleDetail);
        summary.appendChild(ui.bubbleCard);

        // KPI-korttien vaihtoehtoinen sisältö (alkuperäiset id:t säilyvät piilotettuina)
        ui.kpiAlts = [];
        Array.prototype.forEach.call(kpiRow.querySelectorAll('.kpi-card'), function (card, idx) {
            var alt = el('div', { class: 'ts-kpi-alt', 'aria-live': 'polite' });
            var h = el('div', { class: 'kpi-head' });
            var lab = el('span', { class: 'kpi-label' });
            var tr = el('span', { class: 'kpi-trend muted' }, '–');
            tr.id = 'tsKpiTrend' + idx;
            h.appendChild(lab); h.appendChild(tr);
            var b = el('div', { class: 'kpi-body' }); var bl = el('div', { class: 'kpi-body-left' });
            var v = el('div', { class: 'kpi-value' }, '–'); var s = el('div', { class: 'kpi-sub' }, '');
            bl.appendChild(v); bl.appendChild(s); b.appendChild(bl);
            alt.appendChild(h); alt.appendChild(b); card.appendChild(alt);
            ui.kpiAlts.push({ card: card, label: lab, trend: tr, value: v, sub: s });
        });

        ui.toggle.addEventListener('click', function () { setOpen(ui.panel.hasAttribute('hidden')); });
        close.addEventListener('click', function () { setOpen(false); ui.toggle.focus(); });
        panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); ui.toggle.focus(); } });
        ui.reset.addEventListener('click', function () {
            state = clone(DEFAULTS); tableQuery = ''; compareQuery = '';
            ui.tableSearch.value = ''; ui.compareSearch.value = '';
            commit();
        });
        syncControls();
        return true;
    }
    function setOpen(open) {
        if (open) ui.panel.removeAttribute('hidden'); else ui.panel.setAttribute('hidden', '');
        ui.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        ui.toggle.classList.toggle('is-open', open);
    }
    function changedCount() {
        var n = 0;
        for (var i = 0; i < 4; i++) if (!isDefaultKpi(i)) n++;
        if (state.showTable) n++;
        if (state.showBubbles) n++;
        if (state.insightMetric !== DEFAULTS.insightMetric) n++;
        if (state.bestStoreMetric !== DEFAULTS.bestStoreMetric) n++;
        if (!isDefaultTimeline()) n++;
        return n;
    }
    function syncControls() {
        ui.kpiSelects.forEach(function (sel, i) { optionsFor(sel, KPI_CHOICES, state.kpis[i]); });
        ui.modeRadios.forEach(function (r) { r.checked = r.value === state.timelineMode; });
        optionsFor(ui.metricSelect, TIMELINE_METRICS, state.timelineMetric, function (k) { return state.timelineMode === 'stacked' && METRICS[k].ratio; });
        ui.metricHint.textContent = state.timelineMode === 'stacked'
            ? 'Pinotussa tilassa vain summattavat mittarit. Suhdeluvut: valitse ketju tai vertailu.'
            : METRICS[state.timelineMetric].ratio ? 'Suhdeluku lasketaan kuukauden summista; puuttuva data näkyy aukkona.' : '';
        ui.tableToggle.checked = state.showTable;
        ui.bubbleToggle.checked = state.showBubbles;
        optionsFor(ui.insightSelect, ['leadsPerAd', 'clicksPerAd'], state.insightMetric);
        ui.bestStoreSelect.textContent = '';
        Object.keys(BEST_STORE_METRICS).forEach(function (key) {
            var option = el('option', { value: key }, BEST_STORE_METRICS[key]);
            option.selected = key === state.bestStoreMetric;
            ui.bestStoreSelect.appendChild(option);
        });
        ui.compareBox.classList.toggle('is-muted', state.timelineMode !== 'compare' && !state.showTable);
        var c = changedCount();
        ui.badge.textContent = c ? String(c) : '';
        ui.badge.style.display = c ? '' : 'none';
        ui.reset.disabled = c === 0 && state.compareIds === null;
        renderCompareList();
    }
    function renderCompareList() {
        if (!ui.compareList) return;
        var stores = last.stores;
        var chosen = compareStores(stores).map(function (s) { return s.id; });
        ui.compareList.textContent = '';
        ui.compareCount.textContent = chosen.length + ' / ' + stores.length + ' valittu';
        if (!stores.length) { ui.compareList.appendChild(el('p', { class: 'ts-empty-inline' }, 'Valitse ensin kauppoja yläpuolelta.')); return; }
        var q = compareQuery.trim().toLocaleLowerCase('fi-FI');
        var shown = 0;
        stores.forEach(function (s) {
            if (q && String(s.name).toLocaleLowerCase('fi-FI').indexOf(q) < 0) return;
            shown++;
            var lab = el('label', { class: 'ts-check' });
            var cb = el('input', { type: 'checkbox', 'data-testid': 'checkbox-compare-' + s.id });
            cb.checked = chosen.indexOf(s.id) >= 0;
            cb.addEventListener('change', function () {
                var cur = compareStores(last.stores).map(function (x) { return x.id; });
                if (cb.checked) { if (cur.indexOf(s.id) < 0) cur.push(s.id); }
                else cur = cur.filter(function (x) { return x !== s.id; });
                state.compareIds = cur; commit();
            });
            lab.appendChild(cb);
            lab.appendChild(el('span', null, s.name));
            ui.compareList.appendChild(lab);
        });
        if (!shown) ui.compareList.appendChild(el('p', { class: 'ts-empty-inline' }, 'Ei hakua vastaavia kauppoja.'));
    }
    function commit() {
        save(); syncControls();
        if (typeof updateTimelineCharts === 'function') updateTimelineCharts();
    }

    // ─── KPI-kortit ───────────────────────────────────────────────────────
    function renderKpis(stores, monthList) {
        var total = emptyAgg();
        stores.forEach(function (s) { monthList.forEach(function (m) { var r = findRow(s, m); if (r) addRow(total, r); }); });
        var prev = null;
        try { prev = (typeof computePreviousPeriodTotals === 'function') ? computePreviousPeriodTotals(stores) : null; } catch (e) { prev = null; }
        ui.kpiAlts.forEach(function (k, i) {
            var key = state.kpis[i];
            var custom = !isDefaultKpi(i);
            k.card.classList.toggle('ts-kpi-custom', custom);
            if (!custom) return;
            var meta = METRICS[key];
            k.label.textContent = meta.label;
            var value;
            if (key === 'stores') value = stores.length;
            else if (key === 'ads') value = total.n ? Math.round(total.ads / total.n) : null;
            else value = metricFromAgg(total, key);
            k.value.textContent = key === 'stores' ? String(stores.length) : fmt(key, value);
            k.sub.textContent = meta.sub || periodSubText(monthList);
            // Trendi vain kun vertailujakso on saatavilla alkuperäisestä laskennasta
            var prevVal = null;
            if (prev && key === 'leads') prevVal = prev.leads;
            else if (prev && key === 'clicks') prevVal = prev.views;
            else if (prev && key === 'ads') prevVal = prev.avgAds;
            else if (prev && prev.monthsWithData > 0 && METRICS[key].ratio) {
                prevVal = metricFromAgg({ leads: prev.leads, clicks: prev.views, ads: prev.ads, n: prev.monthsWithData }, key);
            }
            if (key === 'stores') { k.trend.className = 'kpi-trend muted'; k.trend.textContent = stores.length === 1 ? '1 kauppa' : 'valittuna'; }
            else if (prevVal !== null && value !== null && typeof setTrendBadge === 'function') setTrendBadge(k.trend.id, value, prevVal);
            else { k.trend.className = 'kpi-trend muted'; k.trend.textContent = '–'; }
        });
    }

    // ─── Kehityskaavio ────────────────────────────────────────────────────
    function renderInsight(stores, monthList) {
        var item = document.querySelector('#insightsList .insight-item.color-green');
        if (!item) return;
        var agg = emptyAgg();
        stores.forEach(function (s) {
            monthList.forEach(function (m) { var row = findRow(s, m); if (row) addRow(agg, row); });
        });
        var clicks = state.insightMetric === 'clicksPerAd';
        var value = metricFromAgg(agg, state.insightMetric);
        item.querySelector('.insight-label').textContent = clicks ? 'Klikkaukset per ilmoitus (ka)' : 'Liidit per ilmoitus (ka)';
        item.querySelector('.insight-value').textContent = value === null ? '–' : value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        item.querySelector('.insight-sub').textContent = Math.round(clicks ? agg.clicks : agg.leads).toLocaleString('fi-FI') +
            (clicks ? ' klikkausta / ' : ' liidiä / ') + Math.round(agg.ads).toLocaleString('fi-FI') + ' ilmoitusta';
    }

    function bestStoreResult(stores, monthList, key) {
        var best = null, winners = [];
        stores.forEach(function (store) {
            var agg = storeAgg(store, monthList);
            var value = key === 'clicksPerMonth' ? (agg.n ? agg.clicks / agg.n : null) : metricFromAgg(agg, key);
            if (value === null) return;
            var entry = { store: store, value: value, months: agg.n };
            if (best === null || value > best + 1e-10) { best = value; winners = [entry]; }
            else if (Math.abs(value - best) < 1e-10) winners.push(entry);
        });
        return winners;
    }
    function renderBestStore(stores, monthList) {
        var list = document.getElementById('insightsList');
        if (!list) return;
        var item = list.querySelector('.insight-item.color-blue');
        if (!item) {
            item = el('div', { class: 'insight-item color-blue' });
            item.appendChild(el('span', { class: 'insight-icon', 'aria-hidden': 'true' }, '▲'));
            ['label', 'value', 'sub'].forEach(function (part) { item.appendChild(el('div', { class: 'insight-' + part })); });
            list.insertBefore(item, list.querySelector('.insight-item.color-green'));
        }
        var key = state.bestStoreMetric;
        var winners = bestStoreResult(stores, monthList, key);
        item.querySelector('.insight-label').textContent = key === 'leadsPerAd' ? 'Tehokkain kauppa' : BEST_STORE_METRICS[key];
        item.querySelector('.insight-value').textContent = winners.length ? winners.map(function (w) { return w.store.name; }).join(' / ') : '–';
        var sub = 'Ei laskettavaa arvoa valitulla aikajaksolla.';
        if (winners.length) {
            var digits = key === 'leads' ? 0 : 2;
            var units = { leads: ' liidiä yhteensä', leadsPerAd: ' liidiä / ilmoitus', clicksPerAd: ' klikkausta / ilmoitus', clicksPerMonth: ' klikkausta / kk' };
            sub = winners[0].value.toLocaleString('fi-FI', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + units[key];
            if (key === 'clicksPerMonth') sub += ' · dataa ' + winners.map(function (w) { return w.months; }).join(' / ') + ' kk';
            if (winners.length > 1) sub += ' · jaettu sija';
        }
        item.querySelector('.insight-sub').textContent = sub;
    }

    function timelineCard() {
        var c = document.getElementById('chartTimeline');
        return c ? c.closest('.card') : null;
    }
    function setTimelineTitle(text) {
        var card = timelineCard(); if (!card) return;
        var t = card.querySelector('.card-title'); if (!t) return;
        if (originalTimelineTitle === null) originalTimelineTitle = t.textContent;
        t.textContent = text === null ? originalTimelineTitle : text;
    }
    function monthAgg(storeList, m) {
        var a = emptyAgg();
        storeList.forEach(function (s) { var r = findRow(s, m); if (r) addRow(a, r); });
        return a;
    }
    function seriesValue(agg, key) {
        if (key === 'ads') return agg.n ? agg.ads : null; // kuukauden ilmoitusmäärä yhteensä
        return metricFromAgg(agg, key);
    }
    function renderTimeline(stores, monthList) {
        var note = document.getElementById('tsTimelineNote');
        if (isDefaultTimeline()) { setTimelineTitle(null); if (note) note.remove(); return; }
        var canvas = document.getElementById('chartTimeline');
        if (!canvas || typeof Chart === 'undefined') return;
        var key = state.timelineMetric, meta = METRICS[key];
        var labels = monthList.map(function (m) { return m.label; });
        var mode = state.timelineMode;
        var metricName = key === 'ads' ? 'Ilmoitusmäärä' : meta.label.replace(' yhteensä', '');
        var datasets, type = 'line', stacked = false, noteText = '';

        if (mode === 'stacked') {
            type = 'bar'; stacked = true;
            datasets = stores.map(function (s) {
                return {
                    label: s.name,
                    data: monthList.map(function (m) { var r = findRow(s, m); return r ? rowVals(r)[key] : 0; }),
                    backgroundColor: s.color, borderRadius: 4, borderSkipped: false, stack: 'ts'
                };
            });
            setTimelineTitle(metricName + ' kaupoittain');
        } else if (mode === 'chain') {
            var isRatio = !!meta.ratio;
            type = isRatio ? 'line' : 'bar';
            datasets = [{
                label: 'Valitut kaupat yhteensä',
                data: monthList.map(function (m) { return seriesValue(monthAgg(stores, m), key); }),
                backgroundColor: isRatio ? 'rgba(249,79,85,0.12)' : '#f94f55',
                borderColor: '#f94f55', borderWidth: isRatio ? 2.5 : 0, borderRadius: 4,
                pointRadius: 3, pointBackgroundColor: '#f94f55', tension: 0.3, spanGaps: false, fill: isRatio
            }];
            setTimelineTitle(metricName + ' — ketju yhteensä (' + stores.length + ' kauppaa)');
        } else {
            var cmp = compareStores(stores);
            datasets = cmp.map(function (s, i) {
                var color = COMPARE_COLORS[i % COMPARE_COLORS.length];
                return {
                    label: s.name,
                    data: monthList.map(function (m) { var r = findRow(s, m); if (!r) return null; var a = emptyAgg(); addRow(a, r); return seriesValue(a, key); }),
                    borderColor: color, backgroundColor: color, borderWidth: 2,
                    borderDash: DASHES[Math.floor(i / COMPARE_COLORS.length) % DASHES.length],
                    pointRadius: 2.5, pointHoverRadius: 5, tension: 0.25, spanGaps: false, fill: false
                };
            });
            setTimelineTitle(metricName + ' — kauppavertailu');
            if (!cmp.length) noteText = 'Ei vertailtavia kauppoja. Valitse kaupat Tilastoasetuksista.';
            else if (cmp.length > 10) noteText = cmp.length + ' kauppaa samassa kaaviossa; luettavuus paranee, kun valitset enintään 8.';
        }

        var card = timelineCard();
        datasets.forEach(function (ds) { if (meta.ratio) ds._labelDigits = meta.digits; });
        if (card) {
            if (!note && noteText) { note = el('p', { class: 'ts-hint ts-timeline-note', id: 'tsTimelineNote', role: 'status' }); card.appendChild(note); }
            if (note) { if (noteText) note.textContent = noteText; else note.remove(); }
        }

        var digits = meta.ratio ? meta.digits : 0;
        var fmtV = function (v) { return v === null || v === undefined ? '–' : Number(v).toLocaleString('fi-FI', { minimumFractionDigits: digits, maximumFractionDigits: digits }); };
        /* global chartTimeline: true */
        if (chartTimeline) chartTimeline.destroy();
        chartTimeline = new Chart(canvas, {
            type: type,
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 500, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: datasets.length > 0, position: 'bottom', labels: { font: { weight: '600' }, padding: 14, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) { return ctx.dataset.label + ': ' + fmtV(ctx.raw) + (meta.unit && !meta.ratio ? ' ' + meta.unit : ''); },
                            footer: stacked ? function (items) {
                                var t = items.reduce(function (s, i) { return s + (i.parsed.y || 0); }, 0);
                                return 'Yhteensä: ' + fmtV(t);
                            } : undefined
                        }
                    }
                },
                scales: {
                    x: { stacked: stacked, grid: { display: false }, ticks: { maxRotation: 45 } },
                    y: { stacked: stacked, grid: { color: '#f1f5f9' }, beginAtZero: true, title: { display: true, text: key === 'ads' ? 'Ilmoitukset yhteensä (kpl)' : meta.axis }, ticks: { callback: function (v) { return Number(v).toLocaleString('fi-FI'); } } }
                },
                layout: { padding: { top: 22 } },
                _stackTotals: stacked
            }
        });
    }

    // ─── Vertailutaulukko ─────────────────────────────────────────────────
    var COLUMNS = [
        { key: 'name', label: 'Kauppa', text: true },
        { key: 'leads', label: 'Liidit' },
        { key: 'clicks', label: 'Klikkaukset' },
        { key: 'ads', label: 'Ilmoituksia keskim. / kk' },
        { key: 'leadsPerAd', label: 'Liidejä / ilm.' },
        { key: 'clicksPerAd', label: 'Klikkauksia / ilm.' },
        { key: 'leadsPer100Clicks', label: 'Liidejä / 100 klikk.' },
        { key: 'months', label: 'Kk dataa' }
    ];
    function renderTable() {
        if (!ui.tableCard) return;
        if (!state.showTable) { ui.tableCard.setAttribute('hidden', ''); return; }
        ui.tableCard.removeAttribute('hidden');
        var monthList = last.monthList;
        var rows = last.stores.map(function (s) {
            var a = storeAgg(s, monthList);
            return {
                id: s.id, name: String(s.name), color: s.color,
                leads: metricFromAgg(a, 'leads'), clicks: metricFromAgg(a, 'clicks'), ads: metricFromAgg(a, 'ads'),
                leadsPerAd: metricFromAgg(a, 'leadsPerAd'), clicksPerAd: metricFromAgg(a, 'clicksPerAd'),
                leadsPer100Clicks: metricFromAgg(a, 'leadsPer100Clicks'), months: a.n
            };
        });
        var q = tableQuery.trim().toLocaleLowerCase('fi-FI');
        var filtered = q ? rows.filter(function (r) { return r.name.toLocaleLowerCase('fi-FI').indexOf(q) >= 0; }) : rows;
        var sk = state.tableSort.key, dir = state.tableSort.dir === 'asc' ? 1 : -1;
        if (!COLUMNS.some(function (c) { return c.key === sk; })) sk = 'leads';
        filtered.sort(function (a, b) {
            var x = a[sk], y = b[sk];
            if (sk === 'name') return x.localeCompare(y, 'fi-FI') * dir;
            if (x === null && y === null) return 0;
            if (x === null) return 1; // tyhjät aina loppuun
            if (y === null) return -1;
            return (x - y) * dir;
        });
        ui.tableMeta.textContent = filtered.length + ' / ' + rows.length + ' kauppaa · ' + periodSubText(monthList) + ' · suhdeluvut painotettu kuukausisummilla';

        var t = ui.table; t.textContent = '';
        var thead = el('thead'); var hr = el('tr');
        COLUMNS.forEach(function (c) {
            var active = c.key === sk;
            var th = el('th', { scope: 'col', class: c.text ? 'is-text' : '', 'aria-sort': active ? (dir === 1 ? 'ascending' : 'descending') : 'none' });
            var btn = el('button', { type: 'button', class: 'ts-sort' + (active ? ' is-active' : ''), 'data-testid': 'sort-' + c.key });
            btn.appendChild(el('span', null, c.label));
            btn.appendChild(el('span', { class: 'ts-sort-ind', 'aria-hidden': 'true' }, active ? (dir === 1 ? '\u25B2' : '\u25BC') : '\u21C5'));
            btn.addEventListener('click', function () {
                if (state.tableSort.key === c.key) state.tableSort.dir = state.tableSort.dir === 'asc' ? 'desc' : 'asc';
                else state.tableSort = { key: c.key, dir: c.text ? 'asc' : 'desc' };
                save(); renderTable();
                var again = ui.table.querySelector('[data-testid="sort-' + c.key + '"]'); if (again) again.focus();
            });
            th.appendChild(btn); hr.appendChild(th);
        });
        thead.appendChild(hr); t.appendChild(thead);
        var tb = el('tbody');
        if (!filtered.length) {
            var er = el('tr'); var td = el('td', { colspan: String(COLUMNS.length), class: 'ts-empty' }, rows.length ? 'Ei hakua vastaavia kauppoja.' : 'Ei valittuja kauppoja.');
            er.appendChild(td); tb.appendChild(er);
        }
        filtered.forEach(function (r) {
            var tr = el('tr', { 'data-testid': 'row-store-' + r.id });
            COLUMNS.forEach(function (c) {
                if (c.text) {
                    var th = el('th', { scope: 'row', class: 'is-text' });
                    th.appendChild(el('span', { class: 'ts-dot', style: 'background:' + r.color, 'aria-hidden': 'true' }));
                    th.appendChild(el('span', null, r.name));
                    tr.appendChild(th);
                } else {
                    var v = c.key === 'months' ? String(r.months) : fmt(c.key, c.key === 'ads' && r.ads !== null ? Math.round(r.ads) : r[c.key]);
                    tr.appendChild(el('td', { class: v === '–' ? 'is-null' : '' }, v));
                }
            });
            tb.appendChild(tr);
        });
        t.appendChild(tb);
    }

    // Klikkausten pallomatriisi: yhteinen pinta-ala-asteikko, ei sädeasteikkoa.
    function bubbleModel(stores, monthList) {
        var max = 0;
        var rows = stores.map(function (store) {
            var total = 0;
            var cells = monthList.map(function (month) {
                var row = findRow(store, month);
                var parsed = row ? parseFloat(row['N Ad Views']) : NaN;
                var value = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
                if (value !== null) { max = Math.max(max, value); total += value; }
                return value;
            });
            return { name: String(store.name), cells: cells, total: total };
        });
        rows.sort(function (a, b) { return b.total - a.total || a.name.localeCompare(b.name, 'fi-FI'); });
        return { rows: rows, max: max };
    }
    function bubbleDiameter(value, max) { return value > 0 && max > 0 ? 34 * Math.sqrt(value / max) : 0; }
    function bubbleMark(value, max) {
        var mark = el('span', { class: 'ts-bubble-mark', 'aria-hidden': 'true' });
        var size = bubbleDiameter(value, max);
        mark.style.width = size + 'px'; mark.style.height = size + 'px';
        return mark;
    }
    function renderBubbles(stores, monthList) {
        if (!ui.bubbleCard) return;
        ui.bubbleCard.hidden = !state.showBubbles;
        if (!state.showBubbles) return;
        ui.bubbleScroll.textContent = '';
        ui.bubbleLegend.textContent = '';
        ui.bubbleDetail.textContent = 'Osoita palloa, napauta sitä tai siirry siihen näppäimistöllä nähdäksesi tarkan arvon.';
        if (!stores.length || !monthList.length) {
            ui.bubbleScroll.appendChild(el('p', { class: 'ts-empty' }, 'Ei dataa valituilla kaupoilla ja aikajaksolla.'));
            return;
        }
        var model = bubbleModel(stores, monthList);
        if (model.max > 0) {
            var sizes = [Math.max(1, Math.round(model.max / 4)), Math.max(1, Math.round(model.max / 2)), model.max];
            sizes.filter(function (v, i, arr) { return arr.indexOf(v) === i; }).forEach(function (v) {
                var entry = el('span', { class: 'ts-bubble-key' });
                var marker = el('span', { class: 'ts-bubble-key-mark' });
                marker.appendChild(bubbleMark(v, model.max)); entry.appendChild(marker);
                entry.appendChild(el('span', null, fmt('clicks', v))); ui.bubbleLegend.appendChild(entry);
            });
        }
        ui.bubbleLegend.appendChild(el('span', { class: 'ts-bubble-key-note' }, 'klikkausta · 0 = ei klikkauksia · – = ei dataa'));
        var table = el('table', { class: 'ts-bubble-table', 'aria-label': 'Klikkaukset kaupoittain ja kuukausittain' });
        var thead = el('thead'), heading = el('tr');
        heading.appendChild(el('th', { scope: 'col' }, 'Kauppa'));
        monthList.forEach(function (m) { heading.appendChild(el('th', { scope: 'col' }, m.label)); });
        thead.appendChild(heading); table.appendChild(thead);
        var tbody = el('tbody');
        model.rows.forEach(function (row) {
            var tr = el('tr');
            tr.appendChild(el('th', { scope: 'row' }, row.name));
            row.cells.forEach(function (value, i) {
                var cell = el('td');
                var detail = row.name + ' · ' + monthList[i].label + ' · ' + (value === null ? 'ei dataa' : fmt('clicks', value) + ' klikkausta');
                var button = el('button', { type: 'button', class: 'ts-bubble-cell', 'aria-label': detail, title: detail });
                if (value > 0) button.appendChild(bubbleMark(value, model.max));
                else button.appendChild(el('span', { class: 'ts-bubble-empty', 'aria-hidden': 'true' }, value === null ? '–' : '0'));
                ['mouseenter', 'focus', 'click'].forEach(function (event) {
                    button.addEventListener(event, function () { ui.bubbleDetail.textContent = detail; });
                });
                cell.appendChild(button); tr.appendChild(cell);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody); ui.bubbleScroll.appendChild(table);
    }

    // ─── Julkinen koukku ──────────────────────────────────────────────────
    function afterSummaryRender(stores, monthList) {
        if (!ui.panel && !buildUi()) return;
        last = { stores: stores || [], monthList: monthList || [] };
        // Pudota vanhentuneet vertailuvalinnat vain näkymästä, ei tallenteesta (kauppavalinta voi palata)
        try { renderKpis(last.stores, last.monthList); } catch (e) { console.error('ToriStats KPI', e); }
        try { renderInsight(last.stores, last.monthList); } catch (e) { console.error('ToriStats insight', e); }
        try { renderBestStore(last.stores, last.monthList); } catch (e) { console.error('ToriStats best store', e); }
        try { renderTimeline(last.stores, last.monthList); } catch (e) { console.error('ToriStats timeline', e); }
        try { renderTable(); } catch (e) { console.error('ToriStats table', e); }
        try { renderBubbles(last.stores, last.monthList); } catch (e) { console.error('ToriStats bubbles', e); }
        renderCompareList();
    }

    window.ToriStats = { afterSummaryRender: afterSummaryRender, reset: function () { if (ui.reset) ui.reset.click(); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi);
    else buildUi();
})();
