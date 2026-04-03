# GrimmGear rr-stack

A community fork of the [*arr media automation stack](https://wiki.servarr.com/) with targeted improvements for language detection, fake prevention, import reliability, and indexer resilience.

## Acknowledgements

This project is built on the outstanding work of the *arr community. We did not create these applications — we are contributing improvements back to them.

- **[Sonarr](https://github.com/Sonarr/Sonarr)** — TV automation by the Sonarr team
- **[Radarr](https://github.com/Radarr/Radarr)** — Movie automation, forked from Sonarr by the Radarr team
- **[Lidarr](https://github.com/Lidarr/Lidarr)** — Music automation by the Lidarr team
- **[Readarr](https://github.com/Readarr/Readarr)** — Book automation by the Readarr team
- **[Prowlarr](https://github.com/Prowlarr/Prowlarr)** — Indexer management by the Prowlarr team

All credit for the core applications belongs to these teams and their contributors. GrimmGear's role is patching specific pain points we encountered in production and contributing those fixes back to the community.

## What This Fork Adds

13 targeted fixes for real-world problems discovered during production use. Each fix traces to exact file paths, line numbers, and root cause analysis across 9,343 C# source files.

## Fixes Included

### CRITICAL — Language & Fake Detection
1. **Cyrillic/CJK/Arabic Unicode detection** in LanguageParser — catches non-Latin release titles that previously slipped through as "Unknown"
2. **Russian dubbing tag detection** (MVO, AVO, DVO, HDRezka, LostFilm, etc.) — catches dubbed releases
3. **Audio language verification on import** — rejects files without the expected language audio track using ffprobe data
4. **Resolution verification on import** — rejects upscale fakes (claimed 4K but actual 480p)
5. **Size=0 release rejection** — blocks releases with no size info (common fake indicator)

### HIGH — Import Reliability
6. **qBittorrent single-file torrent fix** — `ContentPath == SavePath` no longer downgrades to Warning, fixing stuck imports
7. **ManualImport queue starvation fix** — user-triggered imports no longer blocked behind hundreds of search commands
8. **Website prefix stripping on manual import** — folders named `www.SiteName.org - MovieTitle` now match correctly

### MEDIUM — Indexer Resilience (Prowlarr)
9. **CF validation → warning when proxy configured** — FlareSolverr-tagged indexers can be added even if validation returns empty
10. **Bounded parallelism** — SemaphoreSlim(25) prevents 600+ concurrent indexer requests
11. **Mirror URL failover** — DNS/connection failures try the next IndexerUrl before recording failure

### Readarr Specific
12. **Stale-on-error cache** — when api.bookinfo.club is down, serve expired cache instead of failing
13. **Enhanced PDF tag extraction** — ISBN from Subject/Keywords, publisher, page count

## Structure

```
rr-stack/
├── Radarr/     # Fork of github.com/Radarr/Radarr
├── Sonarr/     # Fork of github.com/Sonarr/Sonarr
├── Readarr/    # Fork of github.com/Readarr/Readarr
├── Prowlarr/   # Fork of github.com/Prowlarr/Prowlarr
└── Lidarr/     # Fork of github.com/Lidarr/Lidarr (no changes yet)
```

## Unified Dashboard

The `dashboard/` directory contains a standalone monitoring UI that aggregates all *arr services into a single view. Built to match the native *arr dark theme. No dependencies — open `index.html` or serve via any HTTP server.

## Contributing

All patches are designed to be submitted as upstream PRs to the original projects. Each fix is self-contained and testable. If you find these useful, please consider contributing to the upstream projects directly.

## License

All original *arr code is GPL v3. Our additions are also GPL v3, matching the upstream license.

## Credits

- **[Sonarr](https://github.com/Sonarr/Sonarr)**, **[Radarr](https://github.com/Radarr/Radarr)**, **[Lidarr](https://github.com/Lidarr/Lidarr)**, **[Readarr](https://github.com/Readarr/Readarr)**, **[Prowlarr](https://github.com/Prowlarr/Prowlarr)** — the original teams and all their contributors
- **Richard Beukes** — GrimmGear Systems (patch author)
- **Claude Code** — deep codebase analysis (4 parallel agents, 9,343 files)
