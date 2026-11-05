/*
 * Site configuration — the only file you need to edit.
 *
 * Everything here is public once the site is on GitHub Pages. Keep the API
 * key restricted in Google Cloud Console (HTTP referrers = your github.io
 * address + http://localhost:8000/*, API = Google Drive API only).
 *
 * Folder IDs are the part after /folders/ in a Drive folder URL. Every folder
 * must be shared as "Anyone with the link can view" (sharing the parent
 * "My Website" folder covers everything inside it).
 */
window.SITE_CONFIG = {
  siteName: "Germalcide",
  instagram: "germalcide",

  // Shown on the contact page if filled in, e.g. "hello@example.com".
  contactEmail: "germal3002@gmail.com",

  driveApiKey: "AIzaSyAhALzlrp6HsMVjLp9cBmM4y4AS6Sn5tTA",

  // Home page carousel (My Website / Index Carousel). Shown in random order.
  homeCarouselFolderId: "1iCBKItuv6Lpu2yNM_QEwCiuay6_-osmA",

  // Collections, listed on the Gallery page in this order.
  // To add one: make a folder with "Carousel" and "Gallery" subfolders in
  // Drive, then copy the block below and fill in the new IDs.
  collections: [
    {
      slug: "bta-halloween-2026",          // used in the page URL
      title: "BTA Halloween Party 2026",
      accent: { dark: "#d4743a", light: "#b65a22" },
      carouselFolderId: "1yaSH6NLpCR_5q-KnRXKZDOyWre4DpPjz",
      galleryFolderId: "16DwJ5Kd1qlFxzgxp2rTwsxhducEmirlX",
    },
  ],

  // URL of the deployed Google Apps Script web app that receives contact
  // messages (see google-apps-script.gs). Empty = form runs in demo mode.
  formEndpoint: "",
};
