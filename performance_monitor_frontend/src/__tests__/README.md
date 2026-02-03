# Frontend unit tests (Jest + React Testing Library)

Run from `mongodb-performance-monitor-210576-210585/performance_monitor_frontend/`:

```bash
npm test
```

CI/non-interactive:

```bash
npm run test:ci
```

Notes:
- Tests mock service modules (no real backend calls).
- UI assertions focus on behavior/state (loading/error/empty) and key interactions.
