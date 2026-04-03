# GrimmGear rr-stack

Open source improvements to the *arr media automation stack (Sonarr, Radarr, Readarr, Prowlarr).

## What This Is

12 targeted fixes for real-world problems discovered during production use of the *arr stack. Each fix traces to exact file paths, line numbers, and root cause analysis across 9,343 C# source files.

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

## Contributing

All patches are designed to be submitted as upstream PRs to the original projects. Each fix is self-contained and testable.

## License

All original code is GPL v3, matching the upstream projects.

## Credits

- **Richard Beukes** — GrimmGear Systems
- Deep analysis by Claude Code (4 parallel agents, 9,343 files analyzed)
