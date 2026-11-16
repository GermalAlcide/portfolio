# Germalcide — photography portfolio

A static site with no build step, made for GitHub Pages. Photos come straight from Google Drive.

| Page | File | What it shows |
|---|---|---|
| Index | `index.html` | Carousel of the **Index Carousel** folder, in a new random order on every visit |
| Gallery | `galleries.html` | Centred list of collections |
| Collection | `collection.html?c=<slug>` | Carousel of the collection's **Carousel** folder, with a "View full gallery" button |
| Full gallery | `gallery.html?c=<slug>` | Every photo in the collection's **Gallery** folder, in file-name order, loaded in batches of 24 as you scroll. Open a photo and use **Download ↓** to save the original file |
| Contact | `contact.html` | Email and Instagram |
| Not found | `404.html` | Shown by GitHub Pages for any address that doesn't exist, with links back |

The light/dark toggle sits in the bottom-right corner, and each browser remembers its choice.

**Carousel controls:** drag, swipe or use a trackpad to scrub (it keeps the momentum you give it). Click a photo to centre and enlarge it. Use ← / → to step between photos. Click the photo again, click empty space or press Esc to let it go.

All settings live in **`js/config.js`**.

## Drive layout

```
My Website/                     (share as "Anyone with the link → Viewer")
├── Index Carousel/             → homeCarouselFolderId
└── BTA Halloween 2026/
    ├── Carousel/               → collections[0].carouselFolderId
    └── Gallery/                → collections[0].galleryFolderId
```

- Uploads show up the next time someone loads the page. Nothing is cached.
- Full galleries are sorted by file name (`IMG_2.jpg` comes before `IMG_10.jpg`).
- A folder with only a few photos simply repeats them to fill the carousel.

### Adding a collection

1. In Drive, create `My Website/<Name>/Carousel` and `My Website/<Name>/Gallery`.
2. In `js/config.js`, copy the block inside `collections` and fill in the following:
   - a `slug`, used in the URL
   - the `title`
   - the two folder IDs (the part after `/folders/` in each folder's URL)
   - optionally an `accent` colour for dark and light mode. Leave it out for the default cream/ink.

## API key

The key is visible to anyone who views the page source. In Google Cloud Console → Credentials, keep it limited to:

- *Websites*: `http://localhost:8000/*` **and** `https://<your-username>.github.io/*`. Add the second one before publishing, or the live site won't load photos.
- *API restrictions*: Google Drive API only.

## Contact page

The email and Instagram links are written directly in `contact.html`.

## Publish

Push the contents of this folder to a GitHub repo. Then go to Settings → Pages → *Deploy from branch* → `main` / root.

## Preview locally

```sh
python3 -m http.server 8000   # must be port 8000 — that's what the API key allows
```
