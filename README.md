# Todo

A Progressive Web App for a simple todo list.

- Add a task with the + button. Tap a task to mark it as done or as open.
- Open tasks show in the order of creation. Done tasks show below, the most recently done task first.
- Swipe a task to the left to show Edit and Delete. Delete asks for a second tap.
- Remove all done tasks with "Clear" and a second tap.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/todo/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
