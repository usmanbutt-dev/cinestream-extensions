// CineStream — TMDB + VidSrc Extension
//
// Uses TMDB API for metadata (search, detail, episodes, posters)
// and VidSrc for streaming sources (HLS video URLs + subtitles).
//
// TMDB API is free — get a key at https://www.themoviedb.org/settings/api
// VidSrc provides streaming links via vidsrc.cc
//
// ── Configuration ──
// TMDB_API_KEY: Your free TMDB API key.
// VIDSRC_HOST: VidSrc domain for streaming sources.

var TMDB_API_KEY = "28ba4afb32bc39ee33468dfdd2dced47";
var TMDB_BASE = "https://api.themoviedb.org/3";
var TMDB_IMG = "https://image.tmdb.org/t/p";

const manifest = {
  id: "com.cinestream.tmdb",
  name: "TMDB + VidSrc",
  version: "1.0.0",
  lang: "en",
  author: "cinestream",
  description: "Movies & TV shows via TMDB metadata + VidSrc streaming. Free, no server needed.",
  icon: null,
  nsfw: false
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function stripBom(raw) {
  if (!raw) return raw;
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return raw.trim();
}

function safeParse(raw) {
  try {
    var cleaned = stripBom(raw);
    if (!cleaned || (cleaned[0] !== '{' && cleaned[0] !== '[')) {
      log("JSON parse error: not JSON (starts with: " + (cleaned ? cleaned.slice(0, 40) : "empty") + ")");
      return null;
    }
    return JSON.parse(cleaned);
  } catch (e) {
    log("JSON parse error: " + e);
    return null;
  }
}

async function tmdb(endpoint) {
  var sep = endpoint.indexOf("?") === -1 ? "?" : "&";
  var url = TMDB_BASE + endpoint + sep + "api_key=" + TMDB_API_KEY;
  var raw = await http.get(url);
  return safeParse(raw);
}

async function fetchJson(url, retries) {
  var maxRetries = retries || 1;
  var lastError = null;
  for (var attempt = 0; attempt < maxRetries; attempt++) {
    try {
      var raw = await http.get(url);
      var data = safeParse(raw);
      if (data) return data;
      lastError = "JSON parse error";
    } catch (e) {
      lastError = String(e);
    }
    if (attempt < maxRetries - 1) {
      await new Promise(function(resolve) { resolve(); });
    }
  }
  log("fetchJson failed after " + maxRetries + " attempts: " + lastError);
  return null;
}

function posterUrl(path) {
  if (!path) return null;
  return TMDB_IMG + "/w500" + path;
}

function backdropUrl(path) {
  if (!path) return null;
  return TMDB_IMG + "/w1280" + path;
}

// ═══════════════════════════════════════════════════════════════
// AnimeSource (class name expected by the CineStream JS runtime)
// ═══════════════════════════════════════════════════════════════

class AnimeSource {

  // ───────────────────────────────────────────────────────────
  // SEARCH — uses TMDB /search/multi (returns movies + TV)
  // ───────────────────────────────────────────────────────────

  async search(query, page) {
    log("TMDB search: " + query + " page=" + page);

    var data = await tmdb("/search/multi?query=" + encodeURIComponent(query) + "&page=" + page + "&include_adult=false");

    if (!data || !data.results) {
      return { hasNextPage: false, results: [] };
    }

    var results = [];
    for (var i = 0; i < data.results.length; i++) {
      var item = data.results[i];
      // Only include movies and TV shows (skip "person" results).
      if (item.media_type !== "movie" && item.media_type !== "tv") continue;

      var title = item.title || item.name || "Unknown";
      var year = "";
      if (item.release_date) year = " (" + item.release_date.substring(0, 4) + ")";
      else if (item.first_air_date) year = " (" + item.first_air_date.substring(0, 4) + ")";

      results.push({
        id: item.media_type + "-" + item.id,
        title: title + year,
        cover: posterUrl(item.poster_path),
        url: item.media_type + "-" + item.id
      });
    }

    return {
      hasNextPage: page < (data.total_pages || 1),
      results: results
    };
  }

  // ───────────────────────────────────────────────────────────
  // GET DETAIL — movie or TV show info + episodes
  // ───────────────────────────────────────────────────────────

  async getDetail(animeId) {
    log("TMDB detail: " + animeId);

    // animeId format: "movie-12345" or "tv-12345"
    var parts = animeId.split("-");
    var type = parts[0];
    var tmdbId = parts.slice(1).join("-");

    if (type === "movie") {
      return await this._getMovieDetail(tmdbId);
    } else {
      return await this._getTvDetail(tmdbId);
    }
  }

  async _getMovieDetail(tmdbId) {
    var data = await tmdb("/movie/" + tmdbId);
    if (!data) throw new Error("Failed to fetch movie detail for: " + tmdbId);

    var genres = [];
    if (data.genres) {
      for (var i = 0; i < data.genres.length; i++) {
        genres.push(data.genres[i].name);
      }
    }

    var status = "unknown";
    if (data.status === "Released") status = "completed";
    else if (data.status === "Post Production" || data.status === "In Production") status = "upcoming";

    // Movies have a single "episode" — the movie itself.
    return {
      title: data.title || "Unknown",
      cover: posterUrl(data.poster_path),
      banner: backdropUrl(data.backdrop_path),
      synopsis: data.overview || null,
      genres: genres,
      status: status,
      episodes: [
        {
          number: 1,
          title: data.title || "Full Movie",
          url: "movie/" + tmdbId
        }
      ]
    };
  }

  async _getTvDetail(tmdbId) {
    var data = await tmdb("/tv/" + tmdbId);
    if (!data) throw new Error("Failed to fetch TV detail for: " + tmdbId);

    var genres = [];
    if (data.genres) {
      for (var i = 0; i < data.genres.length; i++) {
        genres.push(data.genres[i].name);
      }
    }

    var rawStatus = (data.status || "").toLowerCase();
    var status = "unknown";
    if (rawStatus.indexOf("returning") !== -1 || rawStatus.indexOf("airing") !== -1) {
      status = "airing";
    } else if (rawStatus.indexOf("ended") !== -1 || rawStatus.indexOf("canceled") !== -1) {
      status = "completed";
    } else if (rawStatus.indexOf("planned") !== -1 || rawStatus.indexOf("pilot") !== -1) {
      status = "upcoming";
    }

    // Fetch episodes for each season.
    var episodes = [];
    var seasons = data.seasons || [];
    var epCounter = 1;

    for (var s = 0; s < seasons.length; s++) {
      var season = seasons[s];
      // Skip "specials" season (season_number = 0).
      if (season.season_number === 0) continue;

      var seasonData = await tmdb("/tv/" + tmdbId + "/season/" + season.season_number);
      if (!seasonData || !seasonData.episodes) continue;

      for (var e = 0; e < seasonData.episodes.length; e++) {
        var ep = seasonData.episodes[e];
        var sNum = season.season_number;
        var eNum = ep.episode_number;
        var label = "S" + (sNum < 10 ? "0" : "") + sNum + "E" + (eNum < 10 ? "0" : "") + eNum;
        var epTitle = ep.name ? label + " — " + ep.name : label;

        episodes.push({
          number: epCounter,
          title: epTitle,
          url: "tv/" + tmdbId + "/" + sNum + "/" + eNum
        });
        epCounter++;
      }
    }

    return {
      title: data.name || "Unknown",
      cover: posterUrl(data.poster_path),
      banner: backdropUrl(data.backdrop_path),
      synopsis: data.overview || null,
      genres: genres,
      status: status,
      episodes: episodes
    };
  }

  // ───────────────────────────────────────────────────────────
  // GET VIDEO SOURCES — returns embed URLs for WebView playback
  // ───────────────────────────────────────────────────────────
  //
  // Instead of scraping fragile m3u8 URLs (which break constantly),
  // we return embed page URLs that the app loads in a WebView.
  // The embed sites handle all player logic server-side.
  //
  // Supported embed providers:
  //   1. vidsrc.net  — reliable, supports TMDB IDs
  //   2. multiembed.mov — fallback, supports TMDB IDs

  async getVideoSources(episodeUrl) {
    log("Embed sources: " + episodeUrl);

    // episodeUrl format:
    //   "movie/12345"
    //   "tv/12345/1/3"   (season 1, episode 3)

    var parts = episodeUrl.split("/");
    var type = parts[0];
    var tmdbId = parts[1];
    var sources = [];

    if (type === "movie") {
      // Provider 1: vidsrc.net
      sources.push({
        url: "https://vidsrc.net/embed/movie?tmdb=" + tmdbId,
        quality: "auto",
        type: "embed",
        server: "VidSrc"
      });
      // Provider 2: multiembed.mov
      sources.push({
        url: "https://multiembed.mov/?video_id=" + tmdbId + "&tmdb=1",
        quality: "auto",
        type: "embed",
        server: "MultiEmbed"
      });
    } else {
      var season = parts[2];
      var episode = parts[3];
      // Provider 1: vidsrc.net
      sources.push({
        url: "https://vidsrc.net/embed/tv?tmdb=" + tmdbId + "&season=" + season + "&episode=" + episode,
        quality: "auto",
        type: "embed",
        server: "VidSrc"
      });
      // Provider 2: multiembed.mov
      sources.push({
        url: "https://multiembed.mov/?video_id=" + tmdbId + "&tmdb=1&s=" + season + "&e=" + episode,
        quality: "auto",
        type: "embed",
        server: "MultiEmbed"
      });
    }

    log("Returning " + sources.length + " embed sources");
    return { sources: sources, subtitles: [] };
  }

  // ───────────────────────────────────────────────────────────
  // OPTIONAL: Popular — TMDB trending movies & TV shows
  // ───────────────────────────────────────────────────────────

  async getPopular(page) {
    log("TMDB popular page=" + page);

    var data = await tmdb("/trending/all/week?page=" + page);

    if (!data || !data.results) {
      return { hasNextPage: false, results: [] };
    }

    var results = [];
    for (var i = 0; i < data.results.length; i++) {
      var item = data.results[i];
      if (item.media_type !== "movie" && item.media_type !== "tv") continue;

      var title = item.title || item.name || "Unknown";
      var year = "";
      if (item.release_date) year = " (" + item.release_date.substring(0, 4) + ")";
      else if (item.first_air_date) year = " (" + item.first_air_date.substring(0, 4) + ")";

      results.push({
        id: item.media_type + "-" + item.id,
        title: title + year,
        cover: posterUrl(item.poster_path),
        url: item.media_type + "-" + item.id
      });
    }

    return {
      hasNextPage: page < (data.total_pages || 1),
      results: results
    };
  }

  // ───────────────────────────────────────────────────────────
  // OPTIONAL: Latest — TMDB now-playing movies + airing TV
  // ───────────────────────────────────────────────────────────

  async getLatest(page) {
    log("TMDB latest page=" + page);

    // Fetch both now-playing movies and airing-today TV.
    var movieData = await tmdb("/movie/now_playing?page=" + page);
    var tvData = await tmdb("/tv/airing_today?page=" + page);

    var results = [];

    if (movieData && movieData.results) {
      for (var i = 0; i < movieData.results.length; i++) {
        var m = movieData.results[i];
        var year = m.release_date ? " (" + m.release_date.substring(0, 4) + ")" : "";
        results.push({
          id: "movie-" + m.id,
          title: (m.title || "Unknown") + year,
          cover: posterUrl(m.poster_path),
          url: "movie-" + m.id
        });
      }
    }

    if (tvData && tvData.results) {
      for (var j = 0; j < tvData.results.length; j++) {
        var t = tvData.results[j];
        var tvYear = t.first_air_date ? " (" + t.first_air_date.substring(0, 4) + ")" : "";
        results.push({
          id: "tv-" + t.id,
          title: (t.name || "Unknown") + tvYear,
          cover: posterUrl(t.poster_path),
          url: "tv-" + t.id
        });
      }
    }

    return {
      hasNextPage: page < Math.max((movieData && movieData.total_pages) || 1, (tvData && tvData.total_pages) || 1),
      results: results
    };
  }
}
