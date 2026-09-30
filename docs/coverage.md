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

## Normalización del cwd en el frontend

Los scripts de test del frontend no invocan `vitest` directamente, sino a través de
`frontend/scripts/run-vitest.mjs`. El wrapper existe para que el resultado no dependa
del sistema operativo ni de cómo se abrió la terminal.

En Windows `process.cwd()` conserva la letra de unidad tal como la escribió quien lanzó
el proceso: `C:\...` desde cmd o PowerShell, pero `c:\...` cuando la terminal la abre un
IDE con la ruta del workspace guardada en minúscula. Vitest deriva su `root` de ese
valor, mientras que el proveedor de cobertura normaliza los paths con `pathe`, que fuerza
la unidad a mayúscula. Con el cwd en minúscula ambas formas conviven y cada archivo entra
dos veces al mapa de cobertura, una con los hits reales y otra en cero: el denominador se
duplica y el total cae de ~95 % a ~41 %, disparando el threshold sin que falte ningún test.

El wrapper canonicaliza la unidad antes de arrancar Vitest, así que `npm test`,
`npm run test:watch` y `npm run test:cov` dan el mismo número en cualquier terminal. En
Linux y macOS no hay letra de unidad y la normalización es un no-op.
