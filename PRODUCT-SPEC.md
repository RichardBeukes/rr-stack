# GrimmGear Media Stack — Product Specification

> One system. Every media type. Every feature. Toggle what you need.

## What This Replaces

GrimmGear replaces **24+ separate applications** with a single unified system:

| Category | Tools Replaced | Combined Stars |
|----------|---------------|----------------|
| **TV Automation** | Sonarr | 11,000 |
| **Movie Automation** | Radarr | 10,000 |
| **Music Automation** | Lidarr + SoulSync + Soularr | 6,100 |
| **Book Automation** | Readarr (dead) + LazyLibrarian | 3,700 |
| **Comic Automation** | Mylar3 + Kapowarr | 2,300 |
| **Indexer Management** | Prowlarr + FlareSolverr | 17,300 |
| **Subtitles** | Bazarr | 3,900 |
| **Transcoding** | Tdarr | 4,000 |
| **Requests/Discovery** | Seerr + Recommendarr | 10,900 |
| **Analytics** | Tautulli | 6,400 |
| **Collections/Metadata** | Kometa | 3,200 |
| **Media Cleanup** | Maintainerr + Decluttarr | 2,500 |
| **Quality Profiles** | Recyclarr | 1,900 |
| **Archive Extraction** | Unpackerr | 1,400 |
| **Notifications** | Notifiarr | 858 |
| **Cross-seeding** | Cross-seed | 1,400 |
| **Download Hygiene** | qbit_manage | 1,500 |
| **Real-time Grabbing** | Autobrr | 2,600 |
| **Plex Watchlist** | Pulsarr | 400 |
| **Metrics** | Exportarr | 785 |
| **Dashboard** | Homarr/Homepage | 32,700 |
| **Audiobook Server** | Audiobookshelf | 12,300 |
| **Reading Server** | Kavita | 10,200 |
| **Tracking** | Trakt/Yamtrack | 2,400 |
| **Total** | **24+ tools** | **~150,000 stars** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GrimmGear Media Stack                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Core Engine                       │   │
│  │  • Unified Database (PostgreSQL/SQLite)              │   │
│  │  • Decision Engine (quality, language, fakes)        │   │
│  │  • Download Manager (qBit, Usenet, Soulseek)        │   │
│  │  • Indexer Manager (built-in, CF bypass)             │   │
│  │  • Import Pipeline (with GrimmGear patches)          │   │
│  │  • Task Queue (Taskiq + PG broker)                   │   │
│  │  • Auth (OIDC/OAuth2/Local/WebAuthn)                 │   │
│  │  • Notification Hub (Discord/Telegram/Email/Push)    │   │
│  │  • Metrics (built-in Prometheus endpoint)            │   │
│  │  • HTTP Plugin System (any language can extend)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ [Toggle] │ │ [Toggle] │ │ [Toggle] │ │ [Toggle] │      │
│  │  Movies  │ │ TV Shows │ │  Music   │ │  Books   │      │
│  │          │ │          │ │          │ │          │      │
│  │ TMDB     │ │ TVDB     │ │ MBrainz  │ │ OpenLib  │      │
│  │ Multi-   │ │ Anime    │ │ 6 DL src │ │ GBooks   │      │
│  │ version  │ │ Season   │ │ AcoustID │ │ Goodread │      │
│  │ Edition  │ │ packs    │ │ Track-   │ │ OPDS     │      │
│  │ Collect  │ │ Calendar │ │ level    │ │ Calibre  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ [Toggle] │ │ [Toggle] │ │ [Toggle] │ │ [Toggle] │      │
│  │ Comics   │ │ Subtitles│ │ Transcode│ │ Requests │      │
│  │          │ │          │ │          │ │          │      │
│  │ ComicVine│ │ 50+ prov │ │ FFmpeg/  │ │ Browse   │      │
│  │ DDL+NZB  │ │ 184 langs│ │ HandBrake│ │ Discover │      │
│  │ Story arc│ │ Auto-sync│ │ Distrib. │ │ Approve  │      │
│  │          │ │          │ │ workers  │ │ Quotas   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Smart Features                    │   │
│  │  • Streaming availability check (JustWatch/Watchmode)│   │
│  │  • AI recommendations (local LLM via Ollama)        │   │
│  │  • Library Profiles (virtual filtered views)         │   │
│  │  • Automated cleanup ("Leaving Soon" UX)             │   │
│  │  • Cross-seeding automation                          │   │
│  │  • Watch tracking + analytics dashboard              │   │
│  │  • Dynamic collections (genre, decade, actor)        │   │
│  │  • Poster overlays (4K/HDR/Atmos badges)            │   │
│  │  • Fake lossless detection (music)                   │   │
│  │  • AcoustID fingerprint verification                 │   │
│  │  • Resolution verification (anti-upscale)            │   │
│  │  • Audio language verification                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Dashboard/UI                      │   │
│  │  • Svelte 5 + TypeScript SPA                        │   │
│  │  • Drag-and-drop widget system (Homarr-style)       │   │
│  │  • Universal search across all media types           │   │
│  │  • Per-format readers (ebook, comic, webtoon)       │   │
│  │  • Built-in media player (audio + video preview)    │   │
│  │  • Calendar (upcoming releases across all types)     │   │
│  │  • Responsive mobile web (PWA installable)          │   │
│  │  • Real-time WebSocket updates                      │   │
│  │  • AMOLED dark theme + light theme                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  External Connections (API key boundary):                    │
│  qBittorrent • Plex • Jellyfin • Emby • slskd             │
│  Trakt • Spotify • Last.fm • ListenBrainz                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | Python 3.13 + FastAPI | Async, auto-docs, Pydantic validation, proven by MediaManager |
| Frontend | Svelte 5 + TypeScript | Lighter than React, reactive, modern |
| Database | PostgreSQL + SQLite dual | PG for production, SQLite for single-user |
| ORM | SQLAlchemy 2.0 + Alembic | Migrations, async, battle-tested |
| Task Queue | Taskiq + PG broker | Background jobs without Celery overhead |
| Auth | FastAPI-Users + OIDC/OAuth2/WebAuthn | Multi-user from day one |
| Config | TOML + pydantic-settings | Validated, human-readable |
| Plugins | HTTP service registration | Any language can extend (autobrr pattern) |
| Media Processing | FFmpeg + FFProbe | Transcoding, metadata extraction, health checks |
| Search | MeiliSearch (optional) | Full-text search across all media types |
| Real-time | WebSocket | Live updates without polling |
| Deployment | Docker + PyInstaller (.exe) | Docker primary, standalone Windows installer |

---

## Module Detail

### Movies Module (replaces Radarr)
- TMDB metadata with multi-language support
- Multi-version/edition (theatrical, extended, director's cut)
- Multi-resolution single instance (4K + 1080p, no dual instances)
- Collection management (MCU, Star Wars, etc.)
- Dynamic collections from Trakt/MDBList
- Streaming availability check before download

### TV Module (replaces Sonarr)
- TVDB + TMDB metadata
- Anime season pack search with XEM mapping
- Calendar with iCalendar export
- Filler episode marking (Simkl pattern)
- Series monitoring with season-level granularity

### Music Module (replaces Lidarr + SoulSync)
- Track-level management (not album-only)
- 6 download sources: Soulseek (via slskd), Deezer, Tidal, Qobuz, HiFi, YouTube
- AcoustID fingerprint verification
- Fake lossless detection
- 9-service metadata enrichment (Spotify, MusicBrainz, iTunes, Deezer, AudioDB, Last.fm, Genius, Tidal, Qobuz)
- Discovery playlists (Release Radar, Discovery Weekly, genre, decade)
- Mirrored playlists from Spotify/Tidal/YouTube/Deezer
- Lossy copy generation (keep FLAC master, generate MP3/Opus for mobile)
- Scrobbling to Last.fm/ListenBrainz
- Built-in audio player with Smart Radio mode

### Books Module (replaces Readarr + LazyLibrarian)
- 5 metadata sources: OpenLibrary, Goodreads, LibraryThing, HardCover, Google Books
- Ebooks + Audiobooks + Magazines
- OPDS server for mobile readers
- Calibre deep integration
- Per-format readers (EPUB, PDF, CBZ — each optimized)
- Annotation sharing + Obsidian export (Kavita pattern)
- Send-to-Kindle
- Cross-device reading/listening progress sync (Audiobookshelf pattern)
- Podcast discovery + auto-download

### Comics Module (replaces Mylar3 + Kapowarr)
- Comic Vine metadata
- Story arc tracking
- DDL + torrent + Usenet sources
- Webtoon continuous scroll mode (Kavita pattern)
- CBR/CBZ/ZIP meta-tagging

### Subtitle Module (replaces Bazarr)
- 50+ subtitle providers
- 184 language support
- Per-title language configuration
- Automatic search + upgrade logic
- Timing synchronization

### Transcode Module (replaces Tdarr)
- Distributed worker architecture (CPU + GPU)
- Plugin system (JavaScript plugins)
- Health checking (corrupt file detection)
- Format normalization (h264→h265, container remuxing)
- Scheduled processing with stall detection

### Request Module (replaces Seerr)
- TMDB-powered browse and discovery
- User request with admin approval workflow
- Auto-fulfill via arr modules
- Request quotas per user
- Trending/popular/upcoming sections
- AI recommendations (local LLM via Ollama)
- Inline "already in library" indicators

### Indexer Module (replaces Prowlarr)
- Built-in indexer management (no separate app)
- CloudFlare bypass (embedded or FlareSolverr)
- IRC real-time announce monitoring (autobrr pattern)
- Bounded parallelism (configurable concurrency)
- Mirror URL failover
- Per-indexer rate limiting
- App sync eliminated (indexers are native)

---

## Smart Features

### Streaming Availability Check
- "Don't download if on Netflix/Disney+" via Streaming Availability API
- Configurable per-user (respect each user's streaming subscriptions)
- "Leaving Soon" warnings when content is leaving a streaming service

### Automated Cleanup (Maintainerr pattern)
- Rule-based: "delete if nobody watched in 90 days"
- "Leaving Soon" collection on home screen before deletion
- Watch data from Tautulli/Plex/Jellyfin integration
- Configurable grace period

### AI Recommendations (Recommendarr pattern)
- Local LLM via Ollama (Llama3, Mistral, Phi-3)
- Content-based filtering (TF-IDF, zero cloud)
- "Because You Watched" personalized sections
- Discovery playlists auto-generated from library analysis

### Library Profiles (Riven pattern)
- Virtual filtered views by genre, rating, language, decade
- No file duplication
- Custom naming templates with variables

### Watch Tracking (Yamtrack pattern)
- Unified tracking: movies, TV, anime, manga, books, music
- Scrobbling from Plex/Jellyfin/Emby
- Analytics dashboard (most-watched actors, genres, trends)
- iCalendar export for upcoming releases

---

## UX Principles (stolen from the best)

| Pattern | Source | What It Does |
|---------|--------|-------------|
| Universal search | Plex Discover | Search ALL media types at once |
| In-library indicators | nzb360 | Instant "already have it" badges everywhere |
| Drag-and-drop widgets | Homarr | Customize dashboard without config files |
| Cross-device sync | Audiobookshelf | Seamless resume anywhere |
| Per-format readers | Kavita | Each content type gets optimized UX |
| Smart network switching | Helmarr/nzb360 | Auto local/remote host based on network |
| Discover-to-request | Seerr | Browse → want → request → auto-fulfill |
| Annotation + Obsidian export | Kavita | Reading becomes knowledge management |
| Filler episode marking | Simkl | Skip filler in anime |
| Diary/chronological log | Letterboxd | What you watched, when, with ratings |
| Server-side API proxy | Homepage | Keys never hit the browser |
| QR code invites | Streamarr | Instant user onboarding |
| Poster overlays | Kometa | 4K/HDR/Atmos badges on artwork |

---

## Setup Wizard Flow

```
1. Welcome → Select media types to enable
   □ Movies  □ TV Shows  □ Music  □ Books  □ Comics

2. Configure paths
   Media root: [D:\Media]  Downloads: [D:\Downloads]
   → Auto-creates subfolders per enabled type

3. Download client
   ○ qBittorrent (auto-detect or enter URL + credentials)
   ○ SABnzbd / NZBGet (Usenet)
   ○ slskd (Soulseek — for music)

4. Media server (optional)
   ○ Plex (auto-detect token from registry)
   ○ Jellyfin
   ○ Emby
   ○ None

5. Streaming services (for availability checking)
   □ Netflix  □ Disney+  □ Prime  □ HBO/Max  □ Apple TV+
   □ Hulu  □ Paramount+  □ Peacock  □ Crunchyroll

6. Indexers → Add from catalog or import from Prowlarr/Jackett

7. Quality → Choose preset (TRaSH Guides built-in)
   ○ Best Quality (4K when available, 1080p fallback)
   ○ Balanced (1080p preferred, small files)
   ○ Space Saver (720p, compressed)
   ○ Custom

8. Users → Create admin account
   → Optional: enable OIDC/SSO
   → Optional: invite users via QR code

9. Done → Dashboard opens with all services running
```

---

## Phase Roadmap

### Phase 1: Core + Movies + TV (MVP)
- FastAPI backend + Svelte frontend
- Unified database schema
- Decision engine with GrimmGear patches
- Movies module (TMDB)
- TV module (TVDB)
- Built-in indexer management
- qBittorrent integration
- Setup wizard
- Dashboard

### Phase 2: Music + Discovery
- Music module with multi-source downloads
- AcoustID + fake lossless detection
- Track-level management
- Discovery playlists
- Streaming availability checking
- AI recommendations (Ollama)

### Phase 3: Books + Comics + Reading
- Books module (5 metadata sources)
- OPDS server
- Built-in readers (EPUB, PDF, CBZ, webtoon)
- Audiobookshelf-style progress sync
- Comics with story arc tracking

### Phase 4: Enterprise Features
- OIDC/SSO authentication
- Multi-user with roles and quotas
- Request management with approval workflows
- Subtitle automation
- Transcode workers
- Plugin architecture
- Mobile PWA

---

## License

GPL v3 — matching all upstream projects.

## Credits

Built on the shoulders of giants: Sonarr, Radarr, Lidarr, Readarr, Prowlarr, Bazarr,
Tdarr, Seerr, Tautulli, Kometa, Maintainerr, Audiobookshelf, Kavita, SoulSync,
Autobrr, MediaManager, and the entire *arr community.

GrimmGear Systems — Richard Beukes
