# Shreedhar K B — Devfolio

Personal portfolio: a terminal-inspired static site with no build step.

All content lives in [`data.js`](data.js). Editing that file is the only way to change what the site shows — `index.html`, `styles.css` and `script.js` handle structure, look and rendering.

## Sections

Profile, Internships, Projects, Hackathon wins, Skills, Education, Leadership, Contact.

## Local preview

Either of these serves the site at <http://127.0.0.1:4173/>:

```bash
node serve.mjs
# or
python -m http.server 4173 --bind 127.0.0.1
```

There is no build step and no dependencies — Vercel serves these files as-is.

## Live

<https://shreedhar-devfolio.vercel.app>
