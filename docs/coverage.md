# Cobertura de tests (T18)

Métrica acordada: **≥ 80 % de líneas y statements** en backend (Jest) y frontend (Vitest).

## Comandos

```bash
# Backend — genera reporte en backend/coverage/
cd backend && npm run test:cov

# Frontend — genera reporte en frontend/coverage/
cd frontend && npm run test:cov
```

Equivalentes:

- Backend: `npm test -- --coverage`
- Frontend: `npm test -- --coverage`

## Reportes

Tras ejecutar los comandos anteriores:

| Artefacto | Path |
|-----------|------|
| Resumen HTML backend | `backend/coverage/index.html` |
| LCOV backend | `backend/coverage/lcov.info` |
| Resumen HTML frontend | `frontend/coverage/index.html` |
| LCOV frontend | `frontend/coverage/lcov.info` |

Los directorios `coverage/` están en `.gitignore`; se regeneran en local/CI con los scripts anteriores.

Los thresholds están en `backend/package.json` (`coverageThreshold`) y `frontend/vite.config.ts` (`test.coverage.thresholds`). Si la cobertura baja de 80 %, los tests fallan.
