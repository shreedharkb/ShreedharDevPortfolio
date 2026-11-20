# Shreedhar K B — Devfolio

A terminal-inspired personal portfolio served as plain files: no build step, no framework, no dependencies.

Live site: <https://shreedhar-devfolio.vercel.app>

## How it is put together

`index.html` holds the markup and the `<section>` skeleton, `data.js` holds every word the site shows, and `script.js` builds the DOM from that data on load. `styles.css` owns the look. The two JS modules are loaded with `type="module"`, which is why the site needs to be served over HTTP rather than opened from the filesystem.

| File | Purpose |
| --- | --- |
| `data.js` | All content: profile, projects, skills, education, leadership, contact |
| `script.js` | Rendering, the hero name effect, navigation, cursor, image lightbox |
| `styles.css` | Layout, theme tokens, responsive rules |
| `icons.js` | Inline SVG paths for the skill badges, so each can be tinted per brand |
| `serve.mjs` | Minimal static file server for local preview |
| `CREDITS.md` | Provenance of the layout and of every third-party mark |
| `images/` | Portrait, project screenshots, institutional logos |
| `resume/` | The PDF the Resume buttons point at |

To change what the site says, edit `data.js` and nothing else.

## Sections

Projects, Skills, Education, Leadership and Contact are shown. `index.html` also carries markup for Internships and Hackathon wins; when those arrays in `data.js` are empty, `hideEmptySections()` hides the section and removes its nav button, so an unfinished section never ships as a blank heading. Archived projects follow the same rule.

## Interactions

- **Hero name** — a native port of the react-bits `TechText` lens effect. Each glyph is rasterised twice (solid fill and dashed outline); a lens trails the pointer, swaps the letter under it to its outline, and draws a selection frame with corner handles, orbiting specks and a metric label. Letters are spring-loaded, so they can be dragged and clicked. The effect is pointer-gated: with no cursor over the name it reads as ordinary text.
- **Top bar** — a pill with a fill disc behind the active button, a label roll between the two label faces, and a dot that glides between buttons on a sub-stepped spring. A reading line under the bar drives which button is lit while you scroll.
- **Cursor** — a dot that tracks exactly plus a ring that trails behind it; the ring locks onto links, buttons and inputs.
- **Institution marks** — each logo sits on a plate that lifts and takes a brand-green rim on hover. The IIIT Dharwad plate links to the institute's site.
- **Project shots** — clicking a preview opens it full-size in a `<dialog>`.

`prefers-reduced-motion: reduce` disables the transitions and animations, and the hero title carries an `aria-label` so the name is still announced even though it is drawn on canvas.

## Local preview

Either of these serves the site at <http://127.0.0.1:4173/>:

```bash
node serve.mjs
# or
python -m http.server 4173 --bind 127.0.0.1
```

## Deployment

Vercel serves these files as-is with no build configuration. Deploys are done by uploading the directory from the Vercel dashboard rather than through Git integration, so pushing here does not publish — the two steps are separate.

## Credits

The terminal layout and CSS architecture were adapted from [Suhas S's portfolio](https://github.com/suhass434/SuhasDevfolio). Full provenance, including the IIIT Dharwad and IEEE marks and the Simple Icons badge set, is in [`CREDITS.md`](CREDITS.md).
