# Experience visual identity

Long-term: Bryan’s owner photography under `owner/` becomes the platform identity.

Temporary: SVG placeholders in `placeholders/` — distinct per experience, clearly labeled.

Edit `manifest.json` only:

1. Add your photo paths under `owner/`
2. Point each experience `src` at the new file
3. Set `placeholder` to `false`
4. Update `credit` and `alt`

Do not reuse one photograph across experiences.
