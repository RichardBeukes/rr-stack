// GrimmGear Media Stack Dashboard
// Matches *arr dark theme, aggregates all service APIs

// All API calls go through the local proxy server (server.py) to avoid CORS.
// Proxy routes: /api/{service}/{path} -> localhost:{port}/{path}
const C = {
    sonarr:   { url: '/api/sonarr',   api: '/api/v3', key: 'b1acb430d0f944979cf30acc71b37aab' },
    radarr:   { url: '/api/radarr',   api: '/api/v3', key: '9758af6105034dab9386cafae7cd7bd0' },
    lidarr:   { url: '/api/lidarr',   api: '/api/v1', key: '0b700e40b5d7473a966d5e960db23770' },
    readarr:  { url: '/api/readarr',  api: '/api/v1', key: 'f228f06806ab4e6fb050a931f82fdfdf' },
    prowlarr: { url: '/api/prowlarr', api: '/api/v1', key: '31b385bc73d14b5689d1833e585f633d' },
    qbit:     { url: '/api/qbit' },
    plex:     { url: '/api/plex', token: 'wWABGKdq_AoBak3E2qd1' }
};

const $ = id => document.getElementById(id);
const txt = (id, v) => { const e = $(id); if (e) e.textContent = v; };
const fmtB = b => { if (!b) return '0 B'; const u = ['B','KB','MB','GB','TB']; const i = Math.floor(Math.log(b)/Math.log(1024)); return (b/Math.pow(1024,i)).toFixed(1)+' '+u[i]; };
const pct = (a,b) => b > 0 ? Math.round(a/b*100) : 0;

function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

async function api(svc, ep) {
    const c = C[svc];
    try {
        const r = await fetch(c.url + c.api + ep, { headers: { 'X-Api-Key': c.key }, signal: AbortSignal.timeout(5000) });
        return r.ok ? r.json() : null;
    } catch { return null; }
}

const SVC_MAP = { 8989:'sonarr', 7878:'radarr', 8686:'lidarr', 8787:'readarr', 9696:'prowlarr', 8081:'qbit', 32400:'plex', 8191:'flaresolverr' };
async function checkAlive(port, path) {
    const svc = SVC_MAP[port];
    if (!svc) return false;
    try {
        const r = await fetch('/api/' + svc + (path || '/ping'), { signal: AbortSignal.timeout(3000) });
        return r.ok || r.status === 401;
    } catch { return false; }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        const page = $('page-' + item.dataset.page);
        if (page) page.classList.remove('hidden');
        document.querySelector('.toolbar-title').textContent =
            item.dataset.page.charAt(0).toUpperCase() + item.dataset.page.slice(1);
    });
});

// Init patches
function initPatches() {
    const patches = [
        'Cyrillic/CJK/Arabic Unicode detection',
        'Russian dubbing tag blocking',
        'Audio language verification on import',
        'Resolution verification (anti-upscale)',
        'Size=0 release rejection',
        'qBit single-file import fix',
        'ManualImport queue priority',
        'CF validation softened for proxied indexers',
        'Bounded parallelism (max 25)',
        'Mirror URL failover',
        'Readarr stale-on-error cache',
        'PDF tag extraction (ISBN/publisher)',
        'Website prefix strip on import'
    ];
    const list = $('patch-list');
    patches.forEach(p => {
        const item = mk('div', 'patch-item');
        item.appendChild(mk('div', 'patch-dot'));
        item.appendChild(mk('span', '', p));
        list.appendChild(item);
    });
}

async function refreshOverview() {
    // Service status dots
    const checks = [
        ['dot-sonarr', 8989], ['dot-radarr', 7878], ['dot-lidarr', 8686],
        ['dot-readarr', 8787], ['dot-prowlarr', 9696],
        ['dot-qbit', 8081, '/api/v2/app/version'],
        ['dot-plex', 32400, '/identity'],
        ['dot-flare', 8191, '/v1']
    ];
    for (const [id, port, path] of checks) {
        const el = $(id);
        if (el) el.className = 'svc-dot ' + (await checkAlive(port, path) ? 'on' : 'off');
    }

    // Movies
    const movies = await api('radarr', '/movie');
    if (movies) {
        const have = movies.filter(m => m.hasFile).length;
        const miss = movies.length - have;
        txt('v-movies', movies.length.toLocaleString());
        txt('v-movies-have', have.toLocaleString());
        txt('v-movies-miss', miss.toLocaleString());
        $('bar-movies').style.width = pct(have, movies.length) + '%';
    }

    // Series
    const series = await api('sonarr', '/series');
    if (series) {
        const epsHave = series.reduce((a,s) => a + (s.statistics?.episodeFileCount||0), 0);
        const epsTotal = series.reduce((a,s) => a + (s.statistics?.episodeCount||0), 0);
        txt('v-series', series.length.toLocaleString());
        txt('v-eps-have', epsHave.toLocaleString());
        txt('v-eps-total', epsTotal.toLocaleString());
        $('bar-series').style.width = pct(epsHave, epsTotal) + '%';
    }

    // Artists
    const artists = await api('lidarr', '/artist');
    if (artists) {
        const tracks = artists.reduce((a,ar) => a + (ar.statistics?.trackFileCount||0), 0);
        const totalTracks = artists.reduce((a,ar) => a + (ar.statistics?.trackCount||0), 0);
        txt('v-artists', artists.length.toLocaleString());
        txt('v-tracks', tracks.toLocaleString());
        $('bar-artists').style.width = pct(tracks, totalTracks) + '%';
    }

    // Authors
    const authors = await api('readarr', '/author');
    if (authors) {
        const files = authors.reduce((a,au) => a + (au.statistics?.bookFileCount||0), 0);
        const total = authors.reduce((a,au) => a + (au.statistics?.bookCount||0), 0);
        txt('v-authors', authors.length.toLocaleString());
        txt('v-bookfiles', files.toLocaleString());
        $('bar-authors').style.width = pct(files, total) + '%';
    }

    // Downloads
    try {
        const info = await (await fetch('/api/qbit/api/v2/transfer/info', { signal: AbortSignal.timeout(3000) })).json();
        txt('dl-speed', (info.dl_info_speed / 1048576).toFixed(1));
        txt('ul-speed', (info.up_info_speed / 1048576).toFixed(1));

        const torrents = await (await fetch('/api/qbit/api/v2/torrents/info', { signal: AbortSignal.timeout(5000) })).json();
        txt('dl-count', torrents.length + ' active');
        const dlList = $('dl-list');
        clear(dlList);
        if (!torrents.length) {
            dlList.appendChild(mk('div', 'dl-empty', 'No active downloads'));
        } else {
            torrents.slice(0, 20).forEach(t => {
                const item = mk('div', 'dl-item');
                item.appendChild(mk('div', 'dl-name', t.name));
                const bar = mk('div', 'dl-bar');
                const fill = mk('div', 'dl-bar-fill');
                fill.style.width = (t.progress * 100).toFixed(0) + '%';
                fill.style.background = t.progress >= 1 ? '#27c24c' : '#5d9cec';
                bar.appendChild(fill);
                item.appendChild(bar);
                const meta = mk('div', 'dl-meta');
                meta.appendChild(mk('span', '', (t.progress*100).toFixed(1) + '%'));
                meta.appendChild(mk('span', '', fmtB(t.size)));
                meta.appendChild(mk('span', '', (t.dlspeed/1048576).toFixed(1) + ' MB/s'));
                item.appendChild(meta);
                dlList.appendChild(item);
            });
            if (torrents.length > 20) dlList.appendChild(mk('div', 'dl-empty', '+' + (torrents.length-20) + ' more'));
        }
    } catch {
        txt('dl-speed', '0'); txt('ul-speed', '0');
    }

    // Disk space from Radarr/Sonarr root folders
    const diskEl = $('disk-info');
    clear(diskEl);
    const rootFolders = await api('radarr', '/rootfolder');
    if (rootFolders) {
        rootFolders.forEach(rf => {
            const total = rf.totalSpace || 0;
            const free = rf.freeSpace || 0;
            const used = total - free;
            const row = mk('div');
            const label = mk('div', 'disk-row');
            label.appendChild(mk('span', '', rf.path));
            label.appendChild(mk('span', '', fmtB(free) + ' free / ' + fmtB(total)));
            row.appendChild(label);
            const bar = mk('div', 'disk-bar');
            const fill = mk('div', 'disk-bar-fill');
            const usePct = pct(used, total);
            fill.style.width = usePct + '%';
            fill.style.background = usePct > 90 ? '#f05050' : usePct > 75 ? '#ff902b' : '#5d9cec';
            bar.appendChild(fill);
            row.appendChild(bar);
            diskEl.appendChild(row);
        });
    }
    const sonarrRf = await api('sonarr', '/rootfolder');
    if (sonarrRf) {
        sonarrRf.forEach(rf => {
            if (rootFolders && rootFolders.some(r => r.path === rf.path)) return;
            const total = rf.totalSpace || 0;
            const free = rf.freeSpace || 0;
            const used = total - free;
            const row = mk('div');
            const label = mk('div', 'disk-row');
            label.appendChild(mk('span', '', rf.path));
            label.appendChild(mk('span', '', fmtB(free) + ' free / ' + fmtB(total)));
            row.appendChild(label);
            const bar = mk('div', 'disk-bar');
            const fill = mk('div', 'disk-bar-fill');
            const usePct = pct(used, total);
            fill.style.width = usePct + '%';
            fill.style.background = usePct > 90 ? '#f05050' : usePct > 75 ? '#ff902b' : '#5d9cec';
            bar.appendChild(fill);
            row.appendChild(bar);
            diskEl.appendChild(row);
        });
    }

    // Plex
    try {
        const pr = await fetch('/api/plex/library/sections?X-Plex-Token=' + C.plex.token, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
        if (pr.ok) {
            const pd = await pr.json();
            const libs = pd.MediaContainer?.Directory || [];
            const plexEl = $('plex-info');
            clear(plexEl);
            libs.forEach(l => {
                const row = mk('div', 'plex-lib');
                row.appendChild(mk('span', '', l.title));
                row.appendChild(mk('span', '', l.type));
                plexEl.appendChild(row);
            });
        }
    } catch {}

    // Health
    const healthEl = $('health-list');
    clear(healthEl);
    let allH = [];
    for (const svc of ['sonarr','radarr','lidarr','readarr','prowlarr']) {
        const h = await api(svc, '/health');
        if (h && h.length) h.forEach(i => allH.push({ src: svc, ...i }));
    }
    const gs = $('globalHealth');
    if (!allH.length) {
        gs.textContent = 'All Systems OK';
        gs.className = 'toolbar-status ok';
        const item = mk('div', 'health-item');
        const tag = mk('span', 'health-tag ok', 'OK');
        item.appendChild(tag);
        item.appendChild(mk('span', 'health-msg', 'No warnings across all services'));
        healthEl.appendChild(item);
    } else {
        const hasErr = allH.some(h => h.type === 'error');
        gs.textContent = hasErr ? 'Issues Detected' : 'Warnings';
        gs.className = 'toolbar-status ' + (hasErr ? 'err' : 'warn');
        allH.forEach(h => {
            const item = mk('div', 'health-item');
            const cls = h.type === 'error' ? 'err' : 'warn';
            item.appendChild(mk('span', 'health-tag ' + cls, h.src));
            item.appendChild(mk('span', 'health-msg', h.message));
            healthEl.appendChild(item);
        });
    }

    // Indexers
    const idxs = await api('prowlarr', '/indexer');
    if (idxs) {
        txt('idx-count', idxs.length + ' indexers');
        const el = $('indexer-list');
        clear(el);
        idxs.forEach(idx => {
            const row = mk('div', 'idx-row');
            row.appendChild(mk('span', '', idx.name));
            const dot = mk('span', 'svc-dot ' + (idx.enable ? 'on' : 'off'));
            row.appendChild(dot);
            el.appendChild(row);
        });
    }

    txt('lastUpdate', new Date().toLocaleTimeString());
}

async function refreshActivity() {
    // Recent grabs from Sonarr + Radarr
    const grabsEl = $('recent-grabs');
    clear(grabsEl);

    const sonarrHist = await api('sonarr', '/history?pageSize=15&sortKey=date&sortDirection=descending');
    const radarrHist = await api('radarr', '/history?pageSize=15&sortKey=date&sortDirection=descending');

    const allGrabs = [];
    if (sonarrHist?.records) sonarrHist.records.forEach(r => allGrabs.push({ ...r, app: 'sonarr' }));
    if (radarrHist?.records) radarrHist.records.forEach(r => allGrabs.push({ ...r, app: 'radarr' }));
    allGrabs.sort((a,b) => new Date(b.date) - new Date(a.date));

    allGrabs.slice(0, 25).forEach(g => {
        const row = mk('div', 'table-row');
        const typeCls = g.eventType === 'grabbed' ? 'grab' : g.eventType === 'downloadFolderImported' ? 'import' : 'fail';
        const typeEl = mk('span', 'table-type ' + typeCls, g.eventType === 'downloadFolderImported' ? 'IMPORT' : g.eventType.toUpperCase());
        row.appendChild(typeEl);
        const appTag = mk('span', 'table-type', g.app === 'sonarr' ? 'TV' : 'MOVIE');
        appTag.style.background = g.app === 'sonarr' ? 'rgba(53,197,244,0.15)' : 'rgba(255,194,48,0.15)';
        appTag.style.color = g.app === 'sonarr' ? '#35c5f4' : '#ffc230';
        row.appendChild(appTag);
        row.appendChild(mk('span', 'table-title', g.sourceTitle || ''));
        const time = new Date(g.date);
        row.appendChild(mk('span', 'table-time', time.toLocaleTimeString()));
        grabsEl.appendChild(row);
    });

    if (!allGrabs.length) grabsEl.appendChild(mk('div', 'dl-empty', 'No recent activity'));

    // Recent imports
    const importsEl = $('recent-imports');
    clear(importsEl);
    const imports = allGrabs.filter(g => g.eventType === 'downloadFolderImported');
    if (imports.length) {
        imports.slice(0, 15).forEach(g => {
            const row = mk('div', 'table-row');
            row.appendChild(mk('span', 'table-type import', 'IMPORT'));
            row.appendChild(mk('span', 'table-title', g.sourceTitle || ''));
            row.appendChild(mk('span', 'table-time', new Date(g.date).toLocaleTimeString()));
            importsEl.appendChild(row);
        });
    } else {
        importsEl.appendChild(mk('div', 'dl-empty', 'No recent imports'));
    }
}

async function refreshStats() {
    // Language breakdown from Radarr movies
    const langEl = $('lang-stats');
    clear(langEl);
    const movies = await api('radarr', '/movie');
    if (movies) {
        const langMap = {};
        movies.forEach(m => {
            const lang = m.originalLanguage?.name || 'Unknown';
            langMap[lang] = (langMap[lang] || 0) + 1;
        });
        const sorted = Object.entries(langMap).sort((a,b) => b[1] - a[1]);
        const block = mk('div', 'stat-block');
        sorted.slice(0, 10).forEach(([lang, count]) => {
            const row = mk('div', 'stat-label-row');
            row.appendChild(mk('span', '', lang));
            row.appendChild(mk('span', 'num', count.toString()));
            block.appendChild(row);
            const bar = mk('div', 'mini-bar');
            const fill = mk('div', 'mini-bar-fill');
            fill.style.width = pct(count, movies.length) + '%';
            fill.style.background = lang === 'English' ? '#27c24c' : '#ff902b';
            bar.appendChild(fill);
            block.appendChild(bar);
        });
        langEl.appendChild(block);
    }

    // Quality breakdown
    const qualEl = $('quality-stats');
    clear(qualEl);
    if (movies) {
        const qualMap = {};
        movies.forEach(m => {
            if (m.movieFile) {
                const q = m.movieFile.quality?.quality?.name || 'Unknown';
                qualMap[q] = (qualMap[q] || 0) + 1;
            }
        });
        const sorted = Object.entries(qualMap).sort((a,b) => b[1] - a[1]);
        const total = sorted.reduce((a,b) => a + b[1], 0);
        const block = mk('div', 'stat-block');
        sorted.slice(0, 10).forEach(([q, count]) => {
            const row = mk('div', 'stat-label-row');
            row.appendChild(mk('span', '', q));
            row.appendChild(mk('span', 'num', count.toString()));
            block.appendChild(row);
            const bar = mk('div', 'mini-bar');
            const fill = mk('div', 'mini-bar-fill');
            fill.style.width = pct(count, total) + '%';
            fill.style.background = q.includes('2160') ? '#e5a00d' : q.includes('1080') ? '#5d9cec' : '#909293';
            bar.appendChild(fill);
            block.appendChild(bar);
        });
        qualEl.appendChild(block);
    }

    // Indexer stats from Prowlarr
    const idxStatsEl = $('indexer-stats');
    clear(idxStatsEl);
    const idxStatus = await api('prowlarr', '/indexerstatus');
    const idxs = await api('prowlarr', '/indexer');
    if (idxs) {
        const block = mk('div', 'stat-block');
        idxs.forEach(idx => {
            const status = idxStatus?.find(s => s.providerId === idx.id);
            const row = mk('div', 'stat-label-row');
            row.appendChild(mk('span', '', idx.name));
            const st = mk('span', 'num');
            if (status?.disabledTill) {
                st.textContent = 'Disabled';
                st.style.color = '#f05050';
            } else {
                st.textContent = 'Active';
                st.style.color = '#27c24c';
            }
            row.appendChild(st);
            block.appendChild(row);
        });
        idxStatsEl.appendChild(block);
    }

    // Import rate
    const impEl = $('import-stats');
    clear(impEl);
    const block = mk('div', 'stat-block');
    let grabCount = 0, importCount = 0;
    const rHist = await api('radarr', '/history?pageSize=100&sortKey=date&sortDirection=descending');
    if (rHist?.records) {
        grabCount += rHist.records.filter(r => r.eventType === 'grabbed').length;
        importCount += rHist.records.filter(r => r.eventType === 'downloadFolderImported').length;
    }
    const sHist = await api('sonarr', '/history?pageSize=100&sortKey=date&sortDirection=descending');
    if (sHist?.records) {
        grabCount += sHist.records.filter(r => r.eventType === 'grabbed').length;
        importCount += sHist.records.filter(r => r.eventType === 'downloadFolderImported').length;
    }

    const addRow = (label, val, color) => {
        const row = mk('div', 'stat-label-row');
        row.appendChild(mk('span', '', label));
        const v = mk('span', 'num', val.toString());
        if (color) v.style.color = color;
        row.appendChild(v);
        block.appendChild(row);
    };
    addRow('Total Grabs (last 100)', grabCount, '#5d9cec');
    addRow('Successful Imports', importCount, '#27c24c');
    addRow('Pending/Failed', grabCount - importCount, grabCount - importCount > 0 ? '#ff902b' : '#27c24c');
    addRow('Success Rate', importCount > 0 ? pct(importCount, grabCount) + '%' : 'N/A', '#27c24c');
    impEl.appendChild(block);
}

async function refresh() {
    await refreshOverview();
    await refreshActivity();
    await refreshStats();
}

initPatches();
refresh();
setInterval(refresh, 10000);
