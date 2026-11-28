# Photos of individual places

Where a place's picture comes from, best first:

1. A file here named after the place id, such as `src/assets/images/places/dinh-doc-lap-97d379.jpg` (jpg, jpeg, png, webp or avif).
   Landscape, around 1200×600, under ~250 KB. Only add photos you own or that are licensed for reuse, and list them in `CREDITS.md`.
2. `src/content/placePhotos.json`: an openly licensed photo from Wikimedia Commons, matched to the place by name and position by
   journie-data `places_1000/pipeline/photos.py`. The page shows the author, licence and a link to the Commons page.
3. A drawn illustration of the kind of place. The city's photograph is never used for a single place.

To refresh the Commons photos, run the script in journie-data and copy `places_1000/place_photos.json` over `src/content/placePhotos.json`.
