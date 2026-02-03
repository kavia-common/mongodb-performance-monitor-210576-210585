# Frontend testing

This frontend uses **Jest + React Testing Library** via `react-scripts`.

## Run locally

```bash
npm test
```

## Run in CI / non-interactive

```bash
npm run test:ci
```

Tests live under:

- `src/__tests__/`

All API calls are mocked (unit tests do **not** hit the backend).
