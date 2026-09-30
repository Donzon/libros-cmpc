# Pendientes y evoluciones

Lo que no está implementado en la versión actual, con una propuesta de cómo se implementaría. Referencias: [`specs/requirements.md`](../specs/requirements.md) §8–§10 y [`specs/design.md`](../specs/design.md) §11.

## Resumen

| # | Tema | Origen | Prioridad |
|---|------|--------|-----------|
| 1 | Refresh token | A6 / P2 | P2 |
| 2 | Relación N:M libro–autor | A1 | Evolución |
| 3 | Stock numérico | A2 | Evolución |
| 4 | Object storage (S3) para imágenes | A4 | Producción |
| 5 | URLs firmadas / proxy autenticado para `/uploads` | design §7 | Producción |
| 6 | Dashboard y métricas | A5 / P2 | P2 |
| 7 | Búsqueda con `pg_trgm` + GIN | design §4 | Escala |
| 8 | CI/CD | P2 | P2 |
| 9 | Caché | P2 | P2 |
| 10 | Roles y permisos avanzados | fuera de alcance | Evolución |
| 11 | Fallback SPA en nginx (deep links) | brecha conocida | P1 |
| 12 | Healthcheck del backend en Docker Compose | brecha conocida (design §8) | P1 |
| 13 | Consulta del historial de auditoría | evolución | Evolución (lectura SQL/logs documentada) |

---

## 1. Refresh token (A6)

**Hoy:** access token JWT de 30 min; al expirar el usuario vuelve al login.

**Cómo se implementaría:**

- Nuevo modelo `RefreshToken { id, userId, tokenHash, expiresAt, revokedAt, replacedById }`.
- `POST /auth/login` devuelve el access token en el body y un refresh token opaco (aleatorio, 7–30 días) en cookie `httpOnly; Secure; SameSite=Strict`, guardando solo su hash.
- `POST /auth/refresh` (público, throttled) valida la cookie, **rota** el token (revoca el anterior, emite uno nuevo) y devuelve un access token nuevo. Reutilizar un token ya rotado revoca toda la cadena (detección de robo).
- `POST /auth/logout` revoca el refresh token actual.
- Frontend: ante un 401, el cliente HTTP intenta un único `refresh` (con una promesa compartida para no disparar varios en paralelo) y reintenta la request; si falla, limpia la sesión como hoy.

## 2. Relación N:M libro–autor (A1)

**Hoy:** `Book.authorId` (1:N).

**Cómo se implementaría:**

- Tabla intermedia `BookAuthor { bookId, authorId, position }` con PK compuesta e índice en `authorId`.
- Migración en dos pasos: crear la tabla y copiar `authorId` existente (`position = 0`); después eliminar la columna.
- DTOs con `authorIds: string[]` (`@ArrayMinSize(1)`); el filtro `authorId` pasa a `authors: { some: { authorId } }`.
- El orden por autor usaría el autor principal (`position = 0`); el CSV uniría los nombres con `; `.
- Frontend: multi-select de autores en el formulario.

## 3. Stock numérico (A2)

**Cómo se implementaría:** agregar `stock Int @default(0)` con `CHECK (stock >= 0)`. Mantener `available` como decisión comercial explícita, o derivarla (`stock > 0`) según defina el negocio. Los movimientos de stock irían en una tabla `StockMovement` auditada y con actualizaciones atómicas (`stock: { decrement: n }` dentro de la transacción) para evitar condiciones de carrera.

## 4. Object storage para imágenes (A4)

**Hoy:** disco local (`UPLOAD_DIR`, volumen `uploads_data`), que no escala a varias instancias.

**Cómo se implementaría:**

- Extraer una interfaz `FileStorage { save, delete, getUrl }` a partir de `FileStorageService`, con dos implementaciones: `LocalFileStorage` (actual) y `S3FileStorage` (`@aws-sdk/client-s3`), elegida por la variable `STORAGE_DRIVER`.
- `imagePath` pasa a guardar la key del objeto; `imageUrl` se deriva según el driver (CDN o URL firmada).
- Opcional: subida directa desde el navegador con URL prefirmada de `PUT` y confirmación posterior en el backend (que valida los magic bytes leyendo el objeto).
- Script de migración que suba los archivos existentes y actualice `imagePath`.

## 5. URLs firmadas / proxy autenticado para `/uploads`

**Hoy:** `/uploads` es público y de solo lectura (nombres no adivinables, sin listado de directorio, `nosniff`).

**Cómo se implementaría:** con S3, bucket privado y URLs prefirmadas de corta vida en `imageUrl`. Sin S3, un endpoint `GET /api/books/:id/image` protegido por JWT que haga stream del archivo, o URLs HMAC (`?exp=…&sig=…`) validadas por un middleware.

## 6. Dashboard y métricas (A5)

**Hoy:** el análisis se cubre con filtros, ordenamiento y CSV.

**Cómo se implementaría:** endpoint `GET /api/stats` con agregaciones Prisma (`groupBy` por género/editorial/autor, conteo por disponibilidad, precio promedio/mín/máx), siempre con `deletedAt: null`. Frontend: página `/dashboard` con tarjetas y gráficos (p. ej. Recharts). Si el volumen crece, una vista materializada refrescada periódicamente.

## 7. Búsqueda con `pg_trgm` + GIN

**Hoy:** `title ILIKE '%term%'` (Prisma `contains`, `mode: 'insensitive'`); el índice B-tree en `title` sirve para ordenar pero no para `%term%`.

**Cómo se implementaría:** migración SQL con `CREATE EXTENSION IF NOT EXISTS pg_trgm;` y `CREATE INDEX book_title_trgm_idx ON "Book" USING GIN (title gin_trgm_ops);`. Las consultas `ILIKE` actuales lo aprovechan sin cambiar código. Para relevancia o tolerancia a errores de tipeo: `similarity()` con `$queryRaw` parametrizado, o `tsvector` para full-text en español.

## 8. CI/CD

**Cómo se implementaría (GitHub Actions):**

- En cada PR: `npm ci`, `prisma validate`, `tsc`, tests con cobertura (el umbral de 80 % ya hace fallar el job), `docker compose config` y build de imágenes.
- Job de integración con un servicio Postgres: `prisma migrate deploy` + seed + `scripts/smoke-docs.sh`.
- En `main`: publicar imágenes versionadas en un registry y desplegar; `prisma migrate deploy` como paso previo al arranque (ya está en el entrypoint).
- Publicar `coverage/` como artefacto.

## 9. Caché

**Cómo se implementaría:**

- Lookups (autores/editoriales/géneros) cambian muy poco: `Cache-Control: max-age` + `ETag` en el backend, y `staleTime` alto en React Query.
- Listados: `@nestjs/cache-manager` con Redis, key derivada de los query params, e invalidación por prefijo en cada mutación de libro.

## 10. Roles y permisos avanzados

Fuera de alcance según requirements §10. **Cómo se implementaría:** `role` enum en `User` (o tablas `Role`/`Permission`), claim en el JWT, decorador `@Roles()` + `RolesGuard` global, y endpoints de administración de usuarios.

## 11. Fallback SPA en nginx (deep links)

**Hoy:** el contenedor `frontend` usa la configuración por defecto de nginx; navegar dentro de la app funciona, pero recargar o abrir directamente una ruta como `/books` responde 404.

**Cómo se implementaría:** agregar `frontend/nginx.conf` con `location / { try_files $uri $uri/ /index.html; }` y copiarlo en el `Dockerfile` a `/etc/nginx/conf.d/default.conf`.

## 12. Healthcheck del backend en Docker Compose

**Hoy:** `GET /api/health` existe (y responde 503 si la DB cae), pero `docker-compose.yml` no define un `healthcheck` para el servicio `backend` como indica design §8.

**Cómo se implementaría:** en el servicio `backend`, `healthcheck: { test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"], interval: 10s, retries: 5, start_period: 30s }` (`wget` viene en la imagen alpine), y `frontend.depends_on.backend.condition: service_healthy`.

## 13. Consulta del historial de auditoría

**Hoy:** `AuditLog` se escribe en cada mutación y export (REQ-B6), y el interceptor deja una línea por request en stdout (REQ-B9). No hay endpoint ni pantalla en la SPA para leer el historial.

**Cómo verlo ahora** (sin código nuevo): Prisma Studio, SQL contra Postgres o `docker compose logs backend`. Pasos y consultas en [`auditoria-y-observabilidad.md`](./auditoria-y-observabilidad.md); el revisor puede marcar REQ-B6/B9 con [`guia-de-validacion.md`](./guia-de-validacion.md) §7–§8.

**Cómo se implementaría una UI/API de lectura:** `GET /api/audit-logs` paginado con filtros `entity`, `entityId`, `userId`, `action` y rango de fechas (aprovecha los índices existentes), restringido a un rol administrador una vez que existan roles (punto 10). En la SPA, una página `/audit` de solo lectura.
