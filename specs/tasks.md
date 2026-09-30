# Tasks: CMPC-libros

Plan de implementación a partir de [`requirements.md`](./requirements.md) y [`design.md`](./design.md).

**Cómo usar:** implementar y probar **una tarea por chat**. Cada tarea incluye sus tests. No saltar dependencias: el orden es secuencial salvo donde se indique.

**Prioridades** (según requirements §9):

| Tag | Significado |
|-----|-------------|
| **P0** | Núcleo: B2, B3, DB1, DB2, F1, F2, F3, T3, O1, DOC1 |
| **P1** | B4, B5, B6, DB4, F2.4, F3.2, DOC2–DOC4 |
| **P2** | Mejoras (refresh, dashboard, CI/CD, caché) — solo documentar si no hay tiempo |

---

## Índice

| ID | Prioridad | Título |
|----|-----------|--------|
| [T1](#t1--scaffold-monorepo-y-docker-compose) | P0 | Scaffold monorepo y Docker Compose |
| [T2](#t2--bootstrap-nestjs-config-errores-health-helmet) | P0 | Bootstrap NestJS: config, errores, health, Helmet |
| [T3](#t3--schema-prisma-migración-e-índices) | P0 | Schema Prisma, migración e índices |
| [T4](#t4--seed-y-arranque-con-migrate--seed) | P0 | Seed y arranque con migrate + seed |
| [T5](#t5--auth-jwt-bcrypt-guard-y-throttler) | P0 | Auth JWT, bcrypt, guard y throttler |
| [T6](#t6--lookups-get-authors-publishers-genres) | P0 | Lookups GET authors / publishers / genres |
| [T7](#t7--crud-de-libros-y-soft-delete) | P0 | CRUD de libros y soft delete |
| [T8](#t8--listado-avanzado-filtros-orden-paginación-search) | P0 | Listado avanzado: filtros, orden, paginación, search |
| [T9](#t9--subida-de-imagen-y-static-uploads) | P1 | Subida de imagen y static `/uploads` |
| [T10](#t10--auditservice-y-transacciones-en-mutaciones) | P1 | AuditService y transacciones en mutaciones |
| [T11](#t11--exportación-csv-con-auditoría-export) | P1 | Exportación CSV con auditoría EXPORT |
| [T12](#t12--scaffold-frontend-react-query-y-cliente-http) | P0 | Scaffold frontend, React Query y cliente HTTP |
| [T13](#t13--login-ui-y-rutas-protegidas) | P0 | Login UI y rutas protegidas |
| [T14](#t14--listado-de-libros-ui-paginación-y-estados) | P0 | Listado de libros UI: paginación y estados |
| [T15](#t15--filtros-orden-y-búsqueda-con-debounce-ui) | P1 | Filtros, orden y búsqueda con debounce (UI) |
| [T16](#t16--formulario-altaedición-con-rhf--zod) | P0 | Formulario alta/edición con RHF + Zod |
| [T17](#t17--detalle-upload-de-imagen-con-reintento) | P1 | Detalle + upload de imagen con reintento |
| [T18](#t18--cobertura--80--y-reportes) | P0 | Cobertura ≥ 80 % y reportes |
| [T19](#t19--documentación-readme-swagger-diagramas-pending) | P0/P1 | Documentación: README, Swagger, diagramas, pending |
| [T20](#t20--logginginterceptor-global-y-error-boundary-de-react) | P1 | LoggingInterceptor global y Error Boundary de React |

---

## T1 — Scaffold monorepo y Docker Compose

- **Prioridad:** P0
- **REQ:** REQ-O1, REQ-O3, REQ-O4
- **Archivos principales:**
  - `docker-compose.yml`
  - `.env.example`
  - `.gitignore`
  - `backend/package.json`, `backend/Dockerfile`, `backend/tsconfig.json` (esqueleto Nest)
  - `frontend/package.json`, `frontend/Dockerfile`, `frontend/vite.config.ts` (esqueleto Vite/React/TS)
  - `frontend/nginx.conf` (fallback SPA, `design.md` §8.1; copiado a `/etc/nginx/conf.d/default.conf` y no excluido por `.dockerignore`)
- **Incluye tests:** smoke: script o CI local que verifique que `docker compose config` es válido; smoke unitario mínimo del entrypoint backend (`main` / health placeholder si existe) o test de que el paquete backend arranca el módulo raíz vacío; smoke de fallback SPA: `GET /ruta-inexistente` en el frontend responde 200 con el `index.html` y `GET /assets/no-existe.js` responde 404.
- **Criterio de terminado:**
  1. `docker compose config` sale sin error.
  2. Existen carpetas `backend/` y `frontend/` con `package.json` y Dockerfiles.
  3. `.env.example` documenta al menos las variables de `design.md` §8 (aunque aún no se validen todas en runtime).
  4. `docker compose up` levanta los tres servicios (frontend/backend pueden fallar health hasta T2–T4; DB debe quedar healthy).
  5. El frontend en Docker sirve rutas profundas sin 404 (REQ-O4): la imagen incluye su propia config de nginx, no la default.

---

## T2 — Bootstrap NestJS: config, errores, health, Helmet

- **Prioridad:** P0
- **REQ:** REQ-B1, REQ-B7, REQ-B8
- **Depende de:** T1
- **Archivos principales:**
  - `backend/src/main.ts`
  - `backend/src/app.module.ts`
  - `backend/src/modules/config/` (validación Joi/Zod al boot)
  - `backend/src/common/filters/http-exception.filter.ts`
  - `backend/src/modules/health/health.controller.ts` (o equivalente)
  - `backend/src/modules/prisma/prisma.module.ts`, `prisma.service.ts` (cliente vacío / connect)
- **Incluye tests:**
  - Unit: filtro de excepciones → formato `{ statusCode, message, error, timestamp, path }`.
  - Unit/e2e ligero: `GET /api/health` responde 200 con `{ status: "ok" }` (o 503 si se mockea DB caída, si aplica).
  - Unit: app falla al boot si falta `JWT_SECRET` / `DATABASE_URL`.
- **Criterio de terminado:**
  1. Backend arranca con env válido; falla en boot con env inválido.
  2. Helmet activo (header `X-Content-Type-Options` o similar presente).
  3. Prefijo global `/api`; `GET /api/health` público.
  4. ValidationPipe global (`whitelist`, `forbidNonWhitelisted`, `transform`).
  5. Tests de esta tarea en verde.

---

## T3 — Schema Prisma, migración e índices

- **Prioridad:** P0
- **REQ:** REQ-DB1, REQ-DB2, REQ-DB3, REQ-D1, REQ-D2, REQ-D3, REQ-D4
- **Depende de:** T2
- **Archivos principales:**
  - `backend/prisma/schema.prisma` (según `design.md` §3.2)
  - `backend/prisma/migrations/**`
- **Incluye tests:**
  - Test de migración/schema: `prisma validate` en script de test o CI de la tarea.
  - Unit opcional: helper que aserte presencia de índices clave en el schema (string/AST) o snapshot del `schema.prisma`.
- **Criterio de terminado:**
  1. Modelos `User`, `Author`, `Publisher`, `Genre`, `Book`, `AuditLog` + enum `AuditAction`.
  2. `price` es `@db.Decimal(10, 2)`; `available` Boolean; `deletedAt` opcional.
  3. Relaciones 1:N libro → autor/editorial/género.
  4. Índices de `design.md` §4 presentes en el schema.
  5. `npx prisma migrate dev` (o `deploy`) aplica sin error contra Postgres del compose.
  6. Checks/tests de esta tarea en verde.

---

## T4 — Seed y arranque con migrate + seed

- **Prioridad:** P0
- **REQ:** REQ-DB5, REQ-O2
- **Depende de:** T3
- **Archivos principales:**
  - `backend/prisma/seed.ts`
  - `backend/package.json` (`prisma.seed`)
  - `backend/Dockerfile` / entrypoint (`prisma migrate deploy && prisma db seed && node ...`)
  - `docker-compose.yml` (comando de arranque backend)
- **Incluye tests:**
  - Unit/integration: seed es idempotente o re-ejecutable (upsert); tras seed existe 1 usuario con email conocido y ≥1 libro con FKs válidas.
  - Test que verifica hash bcrypt del password de seed (no texto plano en DB).
- **Criterio de terminado:**
  1. Seed crea usuario de prueba documentado, autores/editoriales/géneros y libros de ejemplo.
  2. Al levantar backend en Docker se ejecutan migrate + seed automáticamente.
  3. Tests de seed en verde.

---

## T5 — Auth JWT, bcrypt, guard y throttler

- **Prioridad:** P0
- **REQ:** REQ-B2
- **Depende de:** T4
- **Archivos principales:**
  - `backend/src/modules/users/**`
  - `backend/src/modules/auth/**` (`auth.controller`, `auth.service`, `jwt.strategy`, `jwt-auth.guard`, `@Public()`)
  - `backend/src/modules/auth/dto/login.dto.ts`
  - Registro de Throttler en login
- **Incluye tests:**
  - Unit `AuthService`: login ok → token; password incorrecto → 401; email inexistente → 401.
  - Unit/e2e: ruta protegida sin token → 401; con token → 200 (usar health o stub protegido).
  - Unit/e2e: exceso de intentos en `POST /auth/login` → 429.
- **Criterio de terminado:**
  1. `POST /api/auth/login` público → `{ accessToken, expiresIn }`.
  2. Guard JWT global; solo rutas `@Public()` libres (`/auth/login`, `/health`).
  3. Passwords solo como hash (bcrypt).
  4. Throttler activo en login.
  5. Tests de esta tarea en verde.

---

## T6 — Lookups GET authors / publishers / genres

- **Prioridad:** P0
- **REQ:** REQ-B1 (módulos de dominio; soporte F3)
- **Depende de:** T5
- **Archivos principales:**
  - `backend/src/modules/authors/**`
  - `backend/src/modules/publishers/**`
  - `backend/src/modules/genres/**`
- **Incluye tests:**
  - Unit/e2e: cada `GET` con JWT → 200 y array `{ id, name }` ordenado por `name`.
  - Sin token → 401.
  - No existen rutas POST/PATCH/DELETE para estas entidades (asserción 404 o ausencia en módulo).
- **Criterio de terminado:**
  1. `GET /api/authors|publishers|genres` autenticados funcionan.
  2. Solo lectura (sin POST).
  3. Tests en verde.

---

## T7 — CRUD de libros y soft delete

- **Prioridad:** P0 (soft delete alineado también a P1 REQ-B5)
- **REQ:** REQ-B3, REQ-B5, REQ-D2, REQ-D3, REQ-D4
- **Depende de:** T6
- **Archivos principales:**
  - `backend/src/modules/books/books.module.ts`
  - `backend/src/modules/books/books.controller.ts`
  - `backend/src/modules/books/books.service.ts`
  - `backend/src/modules/books/dto/create-book.dto.ts`, `update-book.dto.ts`
  - Mappers de respuesta (`price` como string; include author/publisher/genre)
- **Incluye tests:**
  - Unit `BooksService`: create → 201 shape; findOne; patch; delete setea `deletedAt`; findOne/list excluyen soft-deleted (404 / ausente).
  - Unit: `price` no se serializa como float impreciso (string decimal).
  - Controller/e2e: códigos HTTP 201/200/204/404/401 correctos.
- **Criterio de terminado:**
  1. `POST/GET/:id/PATCH/DELETE /api/books` funcionan con JWT.
  2. `GET /api/books` listado básico (puede ser página fija) excluye `deletedAt != null`.
  3. DELETE es soft delete.
  4. Tests en verde.

---

## T8 — Listado avanzado: filtros, orden, paginación, search

- **Prioridad:** P0
- **REQ:** REQ-B3.1
- **Depende de:** T7
- **Archivos principales:**
  - `backend/src/modules/books/dto/list-books-query.dto.ts`
  - `backend/src/modules/books/books.service.ts` (builder `where` / `orderBy`)
  - Posible `backend/src/modules/books/books-query.builder.ts`
- **Incluye tests:**
  - Unit del builder: combina `genreId`+`publisherId`+`authorId`+`available`; `search` solo en `title` (case-insensitive); no filtra por autor vía search.
  - Unit: `sortBy`/`sortOrder` (`title`, `price`, `createdAt`, `author`).
  - Unit: paginación `page`/`limit` y `meta.total` / `totalPages`.
- **Criterio de terminado:**
  1. `GET /api/books` acepta todos los query params de `design.md` §5.2.
  2. Respuesta `{ data, meta }`.
  3. Soft-deleted nunca aparecen.
  4. Tests en verde.

---

## T9 — Subida de imagen y static `/uploads`

- **Prioridad:** P1
- **REQ:** REQ-B3.2, REQ-D5 (A4)
- **Depende de:** T8
- **Archivos principales:**
  - `backend/src/modules/books/` (endpoint `POST :id/image`)
  - `backend/src/modules/books/pipes/` o util magic-bytes
  - `backend/src/modules/books/file-storage.service.ts` (o `common/`)
  - Config static `/uploads` en `main.ts`
  - Volumen `uploads/` en Docker
- **Incluye tests:**
  - Unit magic bytes: JPEG/PNG/WebP ok; texto/PDF → 400.
  - Unit/e2e: guarda como `<bookId>-<timestamp>.<ext>`; segundo upload borra archivo anterior; actualiza `imagePath`.
  - Libro soft-deleted → 404.
  - Oversize → 400.
- **Criterio de terminado:**
  1. `POST /api/books/:id/image` multipart funciona.
  2. Política `/uploads` de solo lectura (GET); path traversal rechazado o no escapa `UPLOAD_DIR`.
  3. `imageUrl` en respuesta del libro.
  4. Tests en verde.

---

## T10 — AuditService y transacciones en mutaciones

- **Prioridad:** P1
- **REQ:** REQ-B6, REQ-DB4
- **Depende de:** T7 (ideal tras T9 para auditar también imagen)
- **Archivos principales:**
  - `backend/src/modules/audit/audit.module.ts`
  - `backend/src/modules/audit/audit.service.ts` — `log(tx, { userId, action, entity, entityId, metadata? })`
  - Integración en `books.service.ts` (create/update/delete/image)
- **Incluye tests:**
  - Unit: `log` usa el `tx` mock (no el Prisma root) — spy en `tx.auditLog.create`.
  - Unit: create libro + audit en misma `$transaction`; si audit falla, no queda libro (rollback).
  - Unit: update/delete/image escriben `UPDATE`/`DELETE` según diseño.
- **Criterio de terminado:**
  1. Mutaciones de libro persisten `AuditLog` con userId, action, entity, entityId, createdAt.
  2. Firma de `log` recibe `tx`.
  3. Tests en verde.

---

## T11 — Exportación CSV con auditoría EXPORT

- **Prioridad:** P1
- **REQ:** REQ-B4, REQ-B6
- **Depende de:** T8, T10
- **Archivos principales:**
  - `backend/src/modules/books/books.controller.ts` (`GET books/export/csv` antes de `:id`)
  - `backend/src/modules/books/books-csv.service.ts` (o método en service)
  - Reuso del builder de filtros de T8
- **Incluye tests:**
  - Unit: escapa comillas, comas y saltos de línea.
  - Unit: respeta filtros; excluye soft-deleted.
  - Unit/e2e: Content-Type CSV; registra `AuditLog` action `EXPORT`.
  - Sin JWT → 401.
- **Criterio de terminado:**
  1. `GET /api/books/export/csv` descarga CSV con columnas definidas en diseño.
  2. Mismos filtros que el listado (sin paginación o con límite documentado).
  3. Auditoría EXPORT creada.
  4. Tests en verde.

---

## T12 — Scaffold frontend, React Query y cliente HTTP

- **Prioridad:** P0
- **REQ:** REQ-F1–F5 (base técnica; sin UI completa aún)
- **Depende de:** T5 (API login disponible; ideal T8+ para listado real)
- **Archivos principales:**
  - `frontend/src/main.tsx`, `frontend/src/app/**`
  - `frontend/src/shared/api/http-client.ts` (Bearer + manejo 401)
  - `frontend/src/shared/providers/query-client.tsx`
  - Router básico (rutas placeholder; la home de T12 se retiró después — ver «Desviaciones»)
- **Incluye tests:**
  - Unit: interceptor adjunta token si existe.
  - Unit: respuesta 401 limpia token / dispara redirect handler.
  - Unit: QueryClient provider monta sin crash (Testing Library).
- **Criterio de terminado:**
  1. App Vite+React+TS arranca en Docker/local.
  2. React Query configurado.
  3. Cliente HTTP centralizado.
  4. Tests en verde.

---

## T13 — Login UI y rutas protegidas

- **Prioridad:** P0
- **REQ:** REQ-F1, REQ-O4, REQ-T1 (parcial)
- **Depende de:** T12, T5
- **Archivos principales:**
  - `frontend/src/features/auth/**` (página login, hook `useAuth`, store/token)
  - Rutas protegidas y redirección de `/` en `frontend/src/app/router.tsx`
- **Incluye tests:**
  - Testing Library: submit con credenciales llama API y guarda token.
  - Ruta protegida sin token redirige a login.
  - `/` y las rutas desconocidas sin sesión terminan en el login.
  - Mensaje de error en login fallido.
- **Criterio de terminado:**
  1. Formulario email/password funcional contra backend.
  2. Token persistido (memory + `localStorage` o equivalente).
  3. Sesión expirada (401) vuelve a login.
  4. `/` redirige al listado; sin sesión `ProtectedRoute` deriva al login y, tras autenticarse, se vuelve al destino original (añadido post-cierre; ver «Desviaciones»).
  5. Entrar directo a `/login` (y recargar la página) en el frontend dockerizado responde 200 y renderiza el login, no 404 de nginx (REQ-O4).
  6. Tests en verde.

---

## T14 — Listado de libros UI: paginación y estados

- **Prioridad:** P0
- **REQ:** REQ-F2, REQ-F2.3, REQ-F5, REQ-T1 (parcial)
- **Depende de:** T13, T8
- **Archivos principales:**
  - `frontend/src/features/books/pages/BooksListPage.tsx`
  - `frontend/src/features/books/api/books.api.ts`
  - `frontend/src/features/books/hooks/useBooksQuery.ts`
  - Componentes de loading / empty / error
- **Incluye tests:**
  - Mock React Query / MSW: muestra filas; estado loading; empty; error.
  - Cambio de página dispara fetch con `page` nuevo y muestra `meta.total`.
- **Criterio de terminado:**
  1. Tabla/grilla paginada server-side.
  2. Estados loading, vacío y error visibles.
  3. Tests en verde.

---

## T15 — Filtros, orden y búsqueda con debounce (UI)

- **Prioridad:** P1 (REQ-F2.4; filtros/orden habilitan F2.1–F2.2)
- **REQ:** REQ-F2.1, REQ-F2.2, REQ-F2.4
- **Depende de:** T14, T6
- **Archivos principales:**
  - Controles de filtro/orden en `BooksListPage` o hijos
  - Hook `useDebouncedValue` (~300 ms)
  - Lookups via React Query a `/authors|publishers|genres`
- **Incluye tests:**
  - Debounce: N teclas rápidas → una sola petición tras ~300 ms (fake timers).
  - Combinar filtros actualiza query key/params.
  - Cambio de `sortBy`/`sortOrder` refetch.
- **Criterio de terminado:**
  1. Filtros combinables género/editorial/autor/disponibilidad.
  2. Orden dinámico asc/desc.
  3. Search por título con debounce ~300 ms.
  4. Tests en verde.

---

## T16 — Formulario alta/edición con RHF + Zod

- **Prioridad:** P0
- **REQ:** REQ-F3, REQ-F3.1
- **Depende de:** T14, T7, T6
- **Archivos principales:**
  - `frontend/src/features/books/components/BookForm.tsx`
  - `frontend/src/features/books/schemas/book.schema.ts` (Zod)
  - Páginas create/edit que reutilizan el mismo form
- **Incluye tests:**
  - Validación reactiva: campo inválido muestra error; submit bloqueado.
  - Create llama `POST /books`; edit llama `PATCH /books/:id` con valores iniciales.
  - Selects cargan lookups.
- **Criterio de terminado:**
  1. Un solo formulario para create y edit.
  2. Errores por campo en vivo; no envía si inválido.
  3. Tras éxito invalida queries y navega (listado o detalle).
  4. Tests en verde.

---

## T17 — Detalle + upload de imagen con reintento

- **Prioridad:** P1
- **REQ:** REQ-F4, REQ-F3.2
- **Depende de:** T16, T9
- **Archivos principales:**
  - `frontend/src/features/books/pages/BookDetailPage.tsx`
  - Lógica create→upload y retry en form/detalle (`design.md` §2.2)
  - Preview local + validación tipo/tamaño en cliente
- **Incluye tests:**
  - Preview muestra object URL.
  - Si `POST /books` ok y upload falla → UI de reintento **sin** segundo create.
  - Detalle renderiza todos los campos + imagen si hay `imageUrl`.
- **Criterio de terminado:**
  1. Vista detalle completa.
  2. Upload opcional en create/edit con reintento solo del upload.
  3. Validación cliente de tipo/tamaño alineada al backend.
  4. Tests en verde.

---

## T18 — Cobertura ≥ 80 % y reportes

- **Prioridad:** P0
- **REQ:** REQ-T1, REQ-T2, REQ-T3
- **Depende de:** T5–T17 (código a medir)
- **Archivos principales:**
  - `backend/package.json` (jest `--coverage`, thresholds)
  - `frontend/package.json` / `vitest.config.ts` (coverage)
  - Artefactos de reporte (`coverage/` o link en README)
- **Incluye tests:** completar huecos que bajen de 80 % (no dejar suites nuevas “al final” de features: aquí solo gaps residuales).
- **Criterio de terminado:**
  1. Backend ≥ 80 % cobertura (líneas o métrica acordada en config) en CI/local.
  2. Frontend ≥ 80 % cobertura.
  3. Reportes generados y referenciados (path o comando en README — el texto completo del README puede cerrarse en T19).
  4. Comandos `npm test -- --coverage` (o equivalentes) documentados en la tarea / package scripts.

---

## T19 — Documentación: README, Swagger, diagramas, pending

- **Prioridad:** P0 para DOC1; P1 para DOC2–DOC4; DOC5 siempre
- **REQ:** REQ-DOC1, REQ-DOC2, REQ-DOC3, REQ-DOC4, REQ-DOC5
- **Depende de:** backend usable (ideal T11+) y frontend usable (ideal T17)
- **Archivos principales:**
  - `README.md` (instalación, uso, arquitectura, decisiones/supuestos A1–A6)
  - Decoradores Swagger en controllers + `/api/docs`
  - Diagramas (Mermaid en README o imágenes; ER / arquitectura según DOC3–DOC4)
  - `docs/pending.md` (P2 y no implementado: refresh, S3, pg_trgm, N:M, etc.)
- **Incluye tests:**
  - Smoke: `/api/docs` responde 200 (e2e o curl en script).
  - Checklist manual verificable: secciones README presentes (lista de verificación en la PR).
- **Criterio de terminado:**
  1. README permite levantar el proyecto con un solo comando compose y credenciales de seed.
  2. Swagger accesible.
  3. Diagramas de arquitectura y modelo relacional publicados.
  4. `docs/pending.md` lista pendientes con “cómo se implementaría”.
  5. Supuestos A1–A6 documentados.

---

## T20 — LoggingInterceptor global y Error Boundary de React

- **Prioridad:** P1
- **REQ:** REQ-B9, REQ-F6
- **Depende de:** T2 (filtro global y bootstrap), T5 (`request.user` del guard), T12 (`App` y providers del frontend)
- **Archivos principales:**
  - `backend/src/common/interceptors/logging.interceptor.ts`
  - `backend/src/main.ts` (`app.useGlobalInterceptors`)
  - `frontend/src/shared/ui/ErrorBoundary.tsx`
  - `frontend/src/app/App.tsx` (envuelve el router)
- **Incluye tests:**
  - Unit: el interceptor loguea método, ruta, status y latencia en una respuesta exitosa.
  - Unit: el interceptor loguea el error y **re-lanza** la excepción sin transformarla (el filtro global sigue formateando).
  - Unit: el interceptor incluye el `userId` cuando `request.user` existe y lo omite cuando no.
  - Unit: el `ErrorBoundary` renderiza los hijos cuando no hay error.
  - Unit: ante un hijo que lanza, muestra el fallback; el botón de reintento vuelve a renderizar los hijos.
- **Criterio de terminado:**
  1. El interceptor está registrado globalmente y no altera el body de ninguna respuesta (el contrato de Swagger no cambia).
  2. Los errores siguen respondiendo con el formato del `HttpExceptionFilter`.
  3. El `ErrorBoundary` envuelve el router; un throw en render muestra fallback, no pantalla en blanco.
  4. Tests de esta tarea en verde y cobertura global sigue ≥ 80 % (REQ-T3).

---

## Notas de ejecución

- Si una tarea P1 no entra en el tiempo: implementarla no; **documentar en `docs/pending.md` (T19)** cómo se haría.
- Soft delete (REQ-B5) vive en **T7** aunque el tag de prioridad del requisito sea P1: es inseparable del CRUD P0.
- Auditoría de imagen: si T10 se hace antes que T9, reabrir T10 al cablear upload o incluir audit de image en T9 con dependencia explícita de `AuditService`.
- Export CSV debe declarar la ruta **antes** de `:id` (ver diseño).

---

## Desviaciones posteriores al cierre de una tarea

- **Home placeholder de T12 eliminada (post-T13).** `frontend/src/app/pages/placeholders.tsx` era un scaffold temporal del router de T12. Ninguna REQ define página inicial y, por el supuesto A3 (usuarios pre-cargados, sin registro público), una landing anónima no tiene contenido que mostrar. La ruta `/` ahora es `<Navigate to="/books" replace />`: el listado es la home real y `ProtectedRoute` queda como único punto que deriva al login (REQ-F1). T13 se actualizó en consecuencia (archivos, tests y criterio de terminado). Los tests de `App.spec.tsx` que afirmaban el heading del placeholder ahora verifican que `/` y las rutas desconocidas terminan en el login cuando no hay sesión.
