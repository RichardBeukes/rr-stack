// GrimmGear Media Stack Dashboard
// All data fetched from local arr service APIs

const CFG = {
    sonarr:   { url: 'http://localhost:8989',  api: '/api/v3', key: 'b1acb430d0f944979cf30acc71b37aab' },
    radarr:   { url: 'http://localhost:7878',  api: '/api/v3', key: '9758af6105034dab9386cafae7cd7bd0' },
    lidarr:   { url: 'http://localhost:8686',  api: '/api/v1', key: '0b700e40b5d7473a966d5e960db23770' },
    readarr:  { url: 'http://localhost:8787',  api: '/api/v1', key: 'f228f06806ab4e6fb050a931f82fdfdf' },
    prowlarr: { url: 'http://localhost:9696',  api: '/api/v1', key: '31b385bc73d14b5689d1833e585f633d' },
    qbit:     { url: 'http://localhost:8081' },
    plex:     { url: 'http://localhost:32400', token: 'wWABGKdq_AoBak3E2qd1' }
};

async function api(svc, ep) {
    const c = CFG[svc];
    try {
        const r = await fetch(c.url + c.api + ep, { headers: { 'X-Api-Key': c.key }, signal: AbortSignal.timeout(5000) });
        return r.ok ? r.json() : null;
    } catch { return null; }
}

function fmtB(b) {
    if (!b) return '0 B';
    const u = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
}

function el(id) { return document.getElementById(id); }

function text(id, v) { const e = el(id); if (e) e.textContent = v; }

function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function makeEl(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
}

function buildStatCard(title, icon, iconBg, iconColor, valueId, subId, link) {
    const card = makeEl('div', 'card');
    card.onclick = () => window.open(link, '_blank');
    const hdr = makeEl('div', 'ch');
    hdr.appendChild(makeEl('span', 'ct', title));
    const ic = makeEl('div', 'ci', icon);
    ic.style.background = iconBg;
    ic.style.color = iconColor;
    hdr.appendChild(ic);
    card.appendChild(hdr);
    const val = makeEl('div', 'cv', '--');
    val.id = valueId;
    card.appendChild(val);
    const sub = makeEl('div', 'cs', 'Loading...');
    sub.id = subId;
    card.appendChild(sub);
    return card;
}

// Build top stats
function initTopStats() {
    const grid = el('ts');
    grid.appendChild(buildStatCard('Movies', 'M', 'var(--blue-dim)', 'var(--blue)', 'mc', 'ms', 'http://localhost:7878'));
    grid.appendChild(buildStatCard('TV Series', 'TV', 'var(--purple-dim)', 'var(--purple)', 'sc', 'ss', 'http://localhost:8989'));
    grid.appendChild(buildStatCard('Artists', 'A', 'var(--green-dim)', 'var(--green)', 'ac', 'as2', 'http://localhost:8686'));
    grid.appendChild(buildStatCard('Authors', 'B', 'var(--amber-dim)', 'var(--amber)', 'bc', 'bs', 'http://localhost:8787'));
    grid.appendChild(buildStatCard('Downloads', 'DL', 'var(--cyan-dim)', 'var(--cyan)', 'ds', 'ds2', 'http://localhost:8081'));
    grid.appendChild(buildStatCard('Plex', 'P', 'var(--accent-glow)', 'var(--accent)', 'pc', 'ps', 'http://localhost:32400/web'));
}

// Build improvements list
function initImprovements() {
    const items = [
        'Cyrillic/CJK/Arabic Unicode detection',
        'Russian dubbing tag blocking (MVO, HDRezka...)',
        'Audio language verification on import',
        'Resolution verification (anti-upscale fake)',
        'Size=0 release rejection',
        'qBit single-file import fix',
        'ManualImport queue priority fix',
        'CF validation softened for proxy indexers',
        'Bounded parallelism (max 25 concurrent)',
        'Mirror URL failover on DNS failure',
        'Readarr stale-on-error cache',
        'PDF tag extraction (ISBN, publisher, pages)',
        'Website prefix strip on manual import'
    ];
    const list = el('imp');
    items.forEach(txt => {
        const li = makeEl('li', 'hi');
        const badge = makeEl('span', 'hb hb-o', 'ACTIVE');
        const msg = makeEl('span', 'hm', txt);
        li.appendChild(badge);
        li.appendChild(msg);
        list.appendChild(li);
    });
}

async function refresh() {
    // Movies
    const movies = await api('radarr', '/movie');
    if (movies) {
        const has = movies.filter(m => m.hasFile).length;
        text('mc', movies.length);
        text('ms', has + ' downloaded, ' + (movies.length - has) + ' missing');
    }

    // Series
    const series = await api('sonarr', '/series');
    if (series) {
        const eps = series.reduce((a, s) => a + (s.statistics?.episodeFileCount || 0), 0);
        const tot = series.reduce((a, s) => a + (s.statistics?.episodeCount || 0), 0);
        text('sc', series.length);
        text('ss', eps + '/' + tot + ' episodes');
    }

    // Artists
    const artists = await api('lidarr', '/artist');
    if (artists) {
        const tracks = artists.reduce((a, ar) => a + (ar.statistics?.trackFileCount || 0), 0);
        text('ac', artists.length);
        text('as2', tracks + ' tracks');
    }

    // Authors
    const authors = await api('readarr', '/author');
    if (authors) {
        const books = authors.reduce((a, au) => a + (au.statistics?.bookFileCount || 0), 0);
        text('bc', authors.length);
        text('bs', books + ' book files');
    }

    // Plex
    try {
        const pr = await fetch(CFG.plex.url + '/library/sections?X-Plex-Token=' + CFG.plex.token,
            { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
        if (pr.ok) {
            const pd = await pr.json();
            const libs = pd.MediaContainer?.Directory || [];
            text('pc', libs.length);
            text('ps', libs.map(l => l.title).join(', '));
        }
    } catch { text('ps', 'Offline'); }

    // Downloads
    try {
        const lr = await fetch(CFG.qbit.url + '/api/v2/transfer/info', { signal: AbortSignal.timeout(3000) });
        if (lr.ok) {
            const ld = await lr.json();
            text('ds', (ld.dl_info_speed / 1048576).toFixed(1) + ' MB/s');
            text('ds2', 'UL: ' + (ld.up_info_speed / 1048576).toFixed(1) + ' MB/s');
        }
        const tr = await fetch(CFG.qbit.url + '/api/v2/torrents/info', { signal: AbortSignal.timeout(5000) });
        if (tr.ok) {
            const torrents = await tr.json();
            text('dt', torrents.length + ' active');
            const dll = el('dll');
            clearChildren(dll);
            if (torrents.length === 0) {
                dll.appendChild(makeEl('div', 'ld', 'No active downloads'));
            } else {
                torrents.slice(0, 15).forEach(t => {
                    const di = makeEl('div', 'di');
                    di.appendChild(makeEl('div', 'dn', t.name));
                    const bar = makeEl('div', 'db');
                    const fill = makeEl('div', 'df');
                    fill.style.width = (t.progress * 100).toFixed(0) + '%';
                    bar.appendChild(fill);
                    di.appendChild(bar);
                    const meta = makeEl('div', 'dm');
                    meta.appendChild(makeEl('span', '', (t.progress * 100).toFixed(1) + '%'));
                    meta.appendChild(makeEl('span', '', fmtB(t.size)));
                    meta.appendChild(makeEl('span', '', (t.dlspeed / 1048576).toFixed(1) + ' MB/s'));
                    di.appendChild(meta);
                    dll.appendChild(di);
                });
                if (torrents.length > 15) {
                    dll.appendChild(makeEl('div', 'ld', '+' + (torrents.length - 15) + ' more'));
                }
            }
        }
    } catch { text('ds', 'Offline'); }

    // Health
    const hl = el('hl');
    clearChildren(hl);
    let allH = [];
    for (const svc of ['sonarr', 'radarr', 'lidarr', 'readarr', 'prowlarr']) {
        const h = await api(svc, '/health');
        if (h && h.length > 0) h.forEach(i => allH.push({ src: svc, ...i }));
    }
    if (allH.length === 0) {
        const li = makeEl('li', 'hi');
        li.appendChild(makeEl('span', 'hb hb-o', 'ALL CLEAR'));
        li.appendChild(makeEl('span', 'hm', 'No health warnings across all services'));
        hl.appendChild(li);
        el('gs').className = 'dot dot-g';
    } else {
        el('gs').className = allH.some(h => h.type === 'error') ? 'dot dot-r' : 'dot dot-a';
        allH.forEach(h => {
            const li = makeEl('li', 'hi');
            const cls = h.type === 'error' ? 'hb-e' : 'hb-w';
            li.appendChild(makeEl('span', 'hb ' + cls, h.src.toUpperCase()));
            li.appendChild(makeEl('span', 'hm', h.message));
            hl.appendChild(li);
        });
    }

    // Indexers
    const idxs = await api('prowlarr', '/indexer');
    if (idxs) {
        const il = el('il');
        clearChildren(il);
        idxs.forEach(idx => {
            const row = makeEl('div', 'ir');
            row.appendChild(makeEl('span', 'in', idx.name));
            const dot = makeEl('span', 'dot ' + (idx.enable ? 'dot-g' : 'dot-r'));
            row.appendChild(dot);
            il.appendChild(row);
        });
    }

    // Services
    const svcDefs = [
        { name: 'Sonarr', port: 8989, desc: 'TV Shows' },
        { name: 'Radarr', port: 7878, desc: 'Movies' },
        { name: 'Lidarr', port: 8686, desc: 'Music' },
        { name: 'Readarr', port: 8787, desc: 'Books' },
        { name: 'Prowlarr', port: 9696, desc: 'Indexers' },
        { name: 'qBittorrent', port: 8081, desc: 'Downloads' },
        { name: 'Plex', port: 32400, desc: 'Media Server' },
        { name: 'FlareSolverr', port: 8191, desc: 'CF Bypass' }
    ];
    const svcs = el('svcs');
    clearChildren(svcs);
    for (const svc of svcDefs) {
        let status = 'Checking...', dotCls = 'dot-a';
        try {
            let checkUrl = 'http://localhost:' + svc.port;
            if (svc.name === 'FlareSolverr') checkUrl += '/v1';
            else if (svc.name === 'Plex') checkUrl += '/identity';
            else if (svc.name === 'qBittorrent') checkUrl += '/api/v2/app/version';
            else checkUrl += '/ping';
            const r = await fetch(checkUrl, { signal: AbortSignal.timeout(3000) });
            if (r.ok || r.status === 401) { status = 'Online'; dotCls = 'dot-g'; }
            else { status = 'HTTP ' + r.status; dotCls = 'dot-r'; }
        } catch { status = 'Offline'; dotCls = 'dot-r'; }

        const card = makeEl('div', 'card sc');
        const link = svc.name === 'Plex' ? '/web' : '';
        card.onclick = () => window.open('http://localhost:' + svc.port + link, '_blank');
        const hdr = makeEl('div', 'sh');
        hdr.appendChild(makeEl('span', 'dot ' + dotCls));
        hdr.appendChild(makeEl('span', 'sn', svc.name));
        hdr.appendChild(makeEl('span', 'sp', ':' + svc.port));
        card.appendChild(hdr);
        const body = makeEl('div', 'sb');
        body.appendChild(makeEl('span', 'hm', svc.desc));
        const stEl = makeEl('span', '', status);
        stEl.style.fontSize = '13px';
        stEl.style.fontWeight = '600';
        stEl.style.color = dotCls === 'dot-g' ? 'var(--green)' : dotCls === 'dot-r' ? 'var(--red)' : 'var(--amber)';
        body.appendChild(stEl);
        card.appendChild(body);
        svcs.appendChild(card);
    }

    text('lu', 'Updated ' + new Date().toLocaleTimeString());
}

initTopStats();
initImprovements();
refresh();
setInterval(refresh, 10000);
