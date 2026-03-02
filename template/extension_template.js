// CineStream — Extension Template
//
// Copy this file and fill in the TODOs to create your own extension.
// See the README for full documentation on the API contract.
//
// Bridge APIs available to you:
//   http.get(url, headers?)           → Promise<string>
//   http.post(url, body, headers?)    → Promise<string>
//   parseHtml(htmlString)             → DOM object
//   dom.querySelector(css)            → element | null
//   dom.querySelectorAll(css)         → element[]
//   element.text / element.html       → string
//   element.getAttribute(name)        → string | null
//   crypto.md5(str)                   → string
//   crypto.base64Encode(str)          → string
//   crypto.base64Decode(str)          → string
//   log(message)                      → void

// ── Step 1: Define your manifest ──
const manifest = {
  id: "com.example.mysource",         // TODO: unique reverse-domain ID
  name: "My Source",                   // TODO: human-readable name
  version: "1.0.0",
  lang: "en",                         // ISO 639-1 language code
  author: "yourname",                 // TODO: your name/handle
  description: "Short description.",   // TODO: what this source provides
  icon: null,                         // optional: https:// URL to icon
  nsfw: false
};

// ── Step 2: Implement MediaSource ──
class MediaSource {

  // REQUIRED: Search for movies/TV shows by query
  async search(query, page) {
    // TODO: Fetch search results from your source
    //
    // Example using an API:
    //   var raw = await http.get("https://api.example.com/search?q=" + query + "&page=" + page);
    //   var data = JSON.parse(raw);
    //
    // Example scraping HTML:
    //   var html = await http.get("https://example.com/search?q=" + query);
    //   var dom = parseHtml(html);
    //   var items = dom.querySelectorAll("div.result-item");

    return {
      hasNextPage: false,   // true if there are more pages
      results: [
        // Each result must have: id, title, cover, url
        // { id: "movie-slug", title: "Movie Title", cover: "https://...", url: "/movie/slug" }
      ]
    };
  }

  // REQUIRED: Get movie/show details and episode list
  async getDetail(mediaId) {
    // TODO: Fetch movie/show info + episode list
    //
    // mediaId is the 'id' field from search results
    //
    // For movies: return a single episode (the movie itself)
    // For TV shows: return all episodes across seasons

    return {
      title: "TODO",
      cover: null,          // cover image URL
      banner: null,         // optional banner/header image URL
      synopsis: null,       // text description
      genres: [],           // ["Action", "Drama", ...]
      status: "unknown",    // "airing" | "completed" | "upcoming"
      episodes: [
        // Each episode must have: number, title, url
        // For movies: [{ number: 1, title: "Full Movie", url: "movie-identifier" }]
        // For TV shows: [{ number: 1, title: "S01E01", url: "episode-identifier" }, ...]
      ]
    };
  }

  // REQUIRED: Get video streaming URLs for an episode/movie
  async getVideoSources(episodeUrl) {
    // TODO: Fetch streaming URLs for the episode/movie
    //
    // episodeUrl is the 'url' field from the episode list

    return {
      sources: [
        // Each source must have: url, quality, type
        // { url: "https://stream.m3u8", quality: "1080p", type: "hls", server: "Server1" }
        // type: "hls" for .m3u8 streams, "mp4" for direct MP4 files
      ],
      subtitles: [
        // Optional: subtitle tracks
        // { url: "https://subs.vtt", lang: "en", label: "English", type: "vtt" }
      ]
    };
  }

  // OPTIONAL: Get popular/trending movies & shows
  async getPopular(page) {
    // TODO: Return popular media list (same format as search)
    return { hasNextPage: false, results: [] };
  }

  // OPTIONAL: Get latest/recently updated movies & shows
  async getLatest(page) {
    // TODO: Return latest media list (same format as search)
    return { hasNextPage: false, results: [] };
  }
}
