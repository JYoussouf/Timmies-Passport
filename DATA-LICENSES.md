# Licences and attribution

Timmies Passport is **not affiliated with, endorsed by, or sponsored by Tim
Hortons or Restaurant Brands International**. "Tim Hortons" is their
trademark, used here only to refer to their restaurants.

The application code is MIT (see [LICENSE](LICENSE)). Everything it is built
from carries its own terms.

## Map data

| Source | Used for | Licence |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | store locations and geometry | ODbL 1.0 |
| [All The Places](https://www.alltheplaces.xyz/) | which stores the brand still lists | CC0 1.0 |
| [Natural Earth](https://www.naturalearthdata.com/) | country and region boundaries, the place gazetteer | public domain |
| [Nominatim](https://nominatim.org/) | street addresses missing from OSM | ODbL 1.0 (OSM derived) |
| [CARTO](https://carto.com/basemaps/) | vector basemap tiles | CARTO basemap terms |

`static/locations.json` and `scripts/seed.sql` are **derived databases** of
OpenStreetMap and are therefore offered under the
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), the same licence as
the source. Attribution to OpenStreetMap contributors is shown on the map
itself.

Nominatim is queried only at harvest time, at most once per second, and every
answer is cached in `scripts/.geocache.json` so a repeat run asks nothing.

## Fonts and artwork

- **Press Start 2P** by CodeMan38, under the SIL Open Font License 1.1. The
  licence ships alongside the font at [`static/fonts/OFL.txt`](static/fonts/OFL.txt).
- **Inter** by Rasmus Andersson, SIL Open Font License 1.1, served by Google Fonts.
- The **coffee cup artwork** (`static/art/coffee-cup-8bit.png`, and the pixel
  grid derived from it in `src/lib/art/cup.ts`) was drawn for this project by
  Joseph Youssouf.

## Software

MapLibre GL JS (BSD-3-Clause), SvelteKit and Svelte (MIT). Their licences ship
with the packages in `node_modules`.
