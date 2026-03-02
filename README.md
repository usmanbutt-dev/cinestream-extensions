# CineStream Extensions

Official extension repository for [CineStream](https://github.com/usmanbutt-dev/CineStream).

## How to use

In CineStream, go to **Settings → Extensions** and paste this URL:

```
https://raw.githubusercontent.com/usmanbutt-dev/cinestream-extensions/master/index.json
```

Then tap **Fetch** to see available extensions and **Install** to add them.

## Available Extensions

No extensions are available yet. Contributions are welcome!

## Writing Your Own Extension

Use the [`template/extension_template.js`](template/extension_template.js) as a starting point.

### Manifest

```javascript
const manifest = {
  id: "com.example.mysource",     // unique reverse-domain ID
  name: "My Source",
  version: "1.0.0",
  lang: "en",                     // ISO 639-1
  author: "yourname",
  description: "Short description.",
  icon: null,                     // or an https:// image URL
  nsfw: false
};
```

### Required Methods

```javascript
class MediaSource {
  // Returns { hasNextPage: bool, results: [{ id, title, cover, url }] }
  async search(query, page) { ... }

  // Returns { title, cover, banner, synopsis, genres, status,
  //           episodes: [{ number, title, url }] }
  async getDetail(mediaId) { ... }

  // Returns { sources: [{ url, quality, type }], subtitles: [...] }
  async getVideoSources(episodeUrl) { ... }

  // OPTIONAL:
  async getPopular(page) { ... }
  async getLatest(page) { ... }
}
```

### Available Bridge APIs

```javascript
// HTTP
http.get(url, headers?)                  // → Promise<string>
http.post(url, body, headers?)           // → Promise<string>

// HTML parsing
const dom = parseHtml(htmlString);
dom.querySelector(css)                   // → element | null
dom.querySelectorAll(css)                // → element[]
element.text / element.html
element.getAttribute(name)

// Crypto
crypto.md5(str)
crypto.base64Encode(str)
crypto.base64Decode(str)

// Debug
log(message)
```

### Hosting

Host the `.js` file anywhere that returns raw text — GitHub raw URLs work best:

```
https://raw.githubusercontent.com/username/repo/main/extensions/com.example.mysource.js
```

Add an entry to your `index.json` and share the raw URL of `index.json` with users.

## Contributing

1. Fork this repo
2. Copy `template/extension_template.js` → `extensions/com.yourname.source.js`
3. Implement the required methods
4. Add an entry to `index.json`
5. Open a PR
