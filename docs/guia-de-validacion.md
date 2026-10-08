# Guía de validación de requisitos

Recorrido para comprobar, a mano, que la implementación cubre [`specs/requirements.md`](../specs/requirements.md). Cada bloque indica el **REQ**, **qué hacer** y **qué tiene que pasar**.

No sustituye los tests automatizados ([cobertura](./coverage.md)); sirve para que un revisor recorra el producto como usuario y contra la API.

Prerrequisito: Docker Compose v2.

```bash
docker compose up --build
```

Espera a que `backend` termine migrate + seed. URLs:

| Qué | Dónde |
|-----|--------|
| SPA | http://localhost:5173 |
| Swagger | http://localhost:3000/api/docs |
| API | http://localhost:3000/api |
| Health | http://localhost:3000/api/health |

Usuario de seed: `admin@cmpc.local` / `Admin123!`. No hay registro público (A3).

Al terminar un bloque, marca el REQ en la [tabla resumen](#12-resumen-req--dónde-se-ve).

---

## 1. Arranque y entorno — REQ-O1, O2, O3, O4, B8, DB5

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 1.1 | O1 | Un solo `docker compose up --build` | Suben `frontend`, `backend` y `db`. No hace falta levantar nada más. |
| 1.2 | O2, DB5 | `curl http://localhost:3000/api/health` | `{"status":"ok"}`. El backend ya migró y sembró: el login del seed funciona sin pasos extra. |
| 1.3 | O3, B8 | Abrir [`.env.example`](../.env.example) | Están `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `UPLOAD_DIR`, `MAX_IMAGE_BYTES`, Postgres y `VITE_API_BASE_URL`. No hay secretos en el código. |
| 1.4 | O4 | Con el frontend en Docker, pegar en el navegador `http://localhost:5173/login` y `http://localhost:5173/books` (o recargar esas URLs) | **200** y se ve la SPA, no 404 de nginx. Un asset inventado (`/assets/no-existe.js`) sí es 404. |
| 1.5 | B8 | (Opcional) arrancar el backend con `JWT_SECRET` corto o sin `DATABASE_URL` | La app **no** arranca: la config se valida con Zod al boot. |

---

## 2. Login y sesión — REQ-F1, B2

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 2.1 | F1, B2 | http://localhost:5173 → formulario email/contraseña con el seed | Entra al listado `/books`. El token queda persistido (recargar la página mantiene la sesión). |
| 2.2 | F1 | Abrir una pestaña privada en `/books` sin loguearte | Redirige a `/login`. Tras loguearte, vuelve al destino. |
| 2.3 | F1 | Login con password incorrecto | Mensaje de error; no entra. |
| 2.4 | B2 | En Swagger: `POST /api/auth/login` | `{ accessToken, expiresIn }`. `GET /api/books` **sin** Authorize → 401. Con el token → 200. |
| 2.5 | B2 | `POST /api/auth/login` más de 5 veces seguidas con password mala | **429**. |
| 2.6 | F1 | Esperar a que expire el JWT (`JWT_EXPIRES_IN`, por defecto 30 min) o forzar un 401 | La SPA limpia la sesión y vuelve al login. |

Lookups de apoyo: `GET /api/authors`, `/api/publishers`, `/api/genres` con JWT → arrays `{ id, name }` ordenados por nombre. Sin JWT → 401. Autores también aceptan `POST /api/authors` `{ name }` (crea o reutiliza si el nombre ya existe). Editoriales y géneros no tienen POST.

---

## 3. Listado en la SPA — REQ-F2, F2.1–F2.4, F5, B3.1

En `/books` (tras login):

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 3.1 | F2, F2.3, B3.1 | Mirar la tabla | Filas paginadas **en el servidor** (cambiar de página dispara otra petición). Se ve el total. |
| 3.2 | F2.1 | Combinar género + editorial + autor + disponibilidad | La tabla se reduce a la intersección. Quitar filtros restaura el total. |
| 3.3 | F2.2 | Ordenar por título / precio / autor / fecha, asc y desc | El orden cambia; no es solo un sort visual de la página actual. |
| 3.4 | F2.4 | Escribir en la búsqueda varias letras rápido | Espera ~300 ms: **no** hay una petición por tecla. Filtra solo por **título** (un autor en el buscador no encuentra sus libros). |
| 3.5 | F5 | Throttling de red en DevTools, o tumbar el backend un momento | Se ven estados de **loading**, **vacío** (filtro imposible) y **error**, no una tabla rota. |

Query params equivalentes en API: `page`, `limit`, `search`, `genreId`, `publisherId`, `authorId`, `available`, `sortBy` (`title` \| `price` \| `createdAt` \| `author`), `sortOrder` (`asc` \| `desc`). Respuesta `{ data, meta: { page, limit, total, totalPages } }`.

---

## 4. Alta, edición, detalle e imagen — REQ-F3, F3.1, F3.2, F3.3, F4, B3, B3.2, D5

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 4.1 | F3, F3.1 | `/books/new`: dejar título vacío o precio inválido | Error **por campo** en vivo; el submit no sale. |
| 4.2 | F3, F3.3, B3 | Completar el form: autor existente **o** autor nuevo (nombre), editorial y género, y guardar | 201 en red; si el autor es nuevo, antes hay `POST /api/authors`. Vuelve al listado o detalle; el libro aparece. El precio en JSON es **string** (`"19.99"`), no float. |
| 4.3 | F3 | Abrir `/books/:id/edit` | **El mismo formulario** precargado; guardar hace PATCH, no un segundo POST. |
| 4.4 | F3.2, B3.2, D5 | En create o edit, elegir JPEG/PNG/WebP ≤ 2 MiB | Vista previa local. Un `.txt` o un archivo enorme se rechaza **en el cliente**. En el backend, `POST /api/books/:id/image` (multipart, campo `file`) valida **magic bytes** y tamaño. |
| 4.5 | F3.2 (reintento) | Si el libro se creó y el upload falló | La UI ofrece **reintentar solo la imagen**, sin crear otro libro. |
| 4.6 | F4 | Abrir `/books/:id` | Todos los campos + imagen si hay `imageUrl`. `GET /uploads/books/<archivo>` sirve el archivo (solo lectura). |

---

## 5. Soft delete — REQ-B5, D4

En el detalle (`/books/:id`), **Eliminar** pide confirmación y llama `DELETE /api/books/:id`.

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 5.1 | B5 | Confirmar en la SPA (o DELETE autenticado en Swagger) | **204**. Vuelve al listado. |
| 5.2 | B5, D4 | Listado, detalle y CSV | El libro **ya no aparece**. Detalle → 404 / «no encontrado». |
| 5.3 | D4 | SQL: `SELECT id, "deletedAt" FROM "Book" WHERE id = '<id>';` | La fila **sigue**; `deletedAt` está seteado. No es un `DELETE` físico. |

---

## 6. Exportación CSV — REQ-B4, A5

En el listado, **Exportar CSV**. Respeta los filtros actuales (género, editorial, autor, disponibilidad, búsqueda, orden). No usa un `<a href>` directo: el cliente HTTP adjunta el Bearer.

Alternativa: Swagger (`GET /api/books/export/csv`, Authorize) o:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -D - -o books.csv \
  "http://localhost:3000/api/books/export/csv?available=true"
```

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 6.1 | B4 | Sin JWT | 401. |
| 6.2 | B4 | Con JWT | `Content-Type: text/csv`; descarga. Columnas: título, autor, editorial, género, precio, disponibilidad. |
| 6.3 | B4 | Mismos filtros que el listado | El CSV respeta filtros; **no** incluye soft-deleted; tope 10 000 filas. |
| 6.4 | B4 | Título con comas o comillas | Campos escapados (se pueden abrir en Excel sin romper columnas). |
| 6.5 | B6 | Tras el export, [ver `AuditLog`](./auditoria-y-observabilidad.md) | Fila `EXPORT`, `entityId` null, `metadata` con los filtros. |

---

## 7. Auditoría de operaciones — REQ-B6, DB4

No se “ve” en la web. Pasos, consultas SQL y Prisma Studio: **[`auditoria-y-observabilidad.md`](./auditoria-y-observabilidad.md)**.

Checklist corto:

- [ ] Tras crear: fila `CREATE` con `userId` del admin, `entity = Book`, `entityId` del libro, `createdAt`.
- [ ] Tras editar o subir imagen: `UPDATE` (imagen trae `metadata.imagePath`).
- [ ] Tras DELETE: `DELETE` y el libro sigue en `Book` con `deletedAt`.
- [ ] Tras CSV: `EXPORT`.
- [ ] Las mutaciones van en `$transaction` con el `AuditLog` (si la auditoría fallara, no quedaría el cambio). Cubierto por tests de `BooksService`; a mano se infiere porque cada operación deja exactamente una fila.

---

## 8. Interceptores HTTP — REQ-B9, B7, F6

Detalle de formato: [`auditoria-y-observabilidad.md` §2](./auditoria-y-observabilidad.md#2-logs-http-logginginterceptor--req-b9).

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 8.1 | B9 | `docker compose logs -f backend` y usar la SPA | Una línea por request: `METHOD ruta status +Xms` y `user=<uuid>` si hay JWT. |
| 8.2 | B9 | `GET /api/health` (público) | Línea **sin** `user=`. JSON `{ success: true, data: { status: "ok" }, statusCode, timestamp, path }`. |
| 8.3 | B9 | Login o detalle de un libro (Network del browser) | Body de éxito envuelto: `{ success, data, statusCode, timestamp, path }`. El listado además trae `meta` al mismo nivel (no `data.data`). |
| 8.4 | B9 | Export CSV | `Content-Type: text/csv`; no es JSON envelope. |
| 8.5 | B7 | Forzar un 400 (body inválido) o 404 | JSON `{ statusCode, message, error, timestamp, path }` **sin** `success: true`. El logging registra el error y el filtro formatea. |
| 8.6 | F6 | Error Boundary | Un throw de render no deja pantalla en blanco: fallback + reintentar. Los errores de red del listado los cubre REQ-F5, no este boundary. |

Helmet: en cualquier respuesta de la API debe aparecer un header de seguridad (`X-Content-Type-Options: nosniff` o similar).

---

## 9. Datos y modelo — REQ-D1–D5, DB1–DB3

| # | REQ | Qué hacer | Qué tiene que pasar |
|---|-----|-----------|---------------------|
| 9.1 | D1, DB2 | En detalle o en Prisma Studio | Autor, editorial y género son tablas propias; el libro guarda FKs (1:N, supuesto A1). |
| 9.2 | D2 | Precio en API | String decimal; en DB `Decimal(10,2)`, no float. |
| 9.3 | D3, A2 | Campo disponibilidad | Booleano `available`, no stock. |
| 9.4 | D5 | Un libro | Una sola imagen (`imagePath` / `imageUrl`). |
| 9.5 | DB1 | `backend/prisma/schema.prisma` y `backend/prisma/migrations/` | Schema declarativo y migraciones versionadas. |
| 9.6 | DB3 | [Índices](./arquitectura.md#índices) | Filtros, orden, `deletedAt` y consultas de `AuditLog` indexados. |

---

## 10. Tests y cobertura — REQ-T1, T2, T3

```bash
cd backend && npm install && npm run test:cov
cd frontend && npm install && npm run test:cov
```

| # | REQ | Qué tiene que pasar |
|---|-----|---------------------|
| 10.1 | T2 | Jest del backend en verde. |
| 10.2 | T1 | Vitest + Testing Library del frontend en verde. |
| 10.3 | T3 | ≥ 80 % líneas y statements en ambos; si baja, el comando **falla**. HTML: `backend/coverage/index.html`, `frontend/coverage/index.html`. Ver [`coverage.md`](./coverage.md). |

Otros checks: `cd backend && npm run prisma:validate`, `./scripts/smoke-compose.sh`, `./scripts/smoke-docs.sh` (Swagger 200).

---

## 11. Documentación — REQ-DOC1–DOC5

| REQ | Dónde |
|-----|--------|
| DOC1 | [`README.md`](../README.md): instalación, config, uso, arquitectura, decisiones y supuestos A1–A6 |
| DOC2 | http://localhost:3000/api/docs (JSON en `/api/docs-json`) |
| DOC3 | Diagrama de sistema en el README y capas/flujos en [`arquitectura.md`](./arquitectura.md) |
| DOC4 | Modelo relacional (Mermaid) en [`arquitectura.md`](./arquitectura.md) |
| DOC5 | [`pending.md`](./pending.md) |

---

## 12. Resumen REQ → dónde se ve

| ID | Tema | Validar en |
|----|------|------------|
| REQ-D1 | Entidades normalizadas | §9 / Prisma Studio |
| REQ-D2 | Precio decimal | §4.2, §9.2 |
| REQ-D3 | Disponibilidad | §9.3 |
| REQ-D4 | Soft delete persistido | §5.3 |
| REQ-D5 | Una imagen | §4.4 |
| REQ-F1 | Login y rutas | §2 |
| REQ-F2 | Listado | §3.1 |
| REQ-F2.1 | Filtros | §3.2 |
| REQ-F2.2 | Orden | §3.3 |
| REQ-F2.4 | Debounce | §3.4 |
| REQ-F2.3 | Paginación server | §3.1 |
| REQ-F3 / F3.1 / F3.3 | Form + validación + autor nuevo | §4.1–4.3 |
| REQ-F3.2 | Imagen UI | §4.4–4.5 |
| REQ-F4 | Detalle | §4.6 |
| REQ-F5 | Estados UI | §3.5 |
| REQ-F6 | Error Boundary | §8.4 |
| REQ-B1 | Módulos | código `backend/src/modules/` + lookups §2 |
| REQ-B2 | JWT, bcrypt, guard, 429 | §2.4–2.5 |
| REQ-B3 | CRUD HTTP | §4, Swagger |
| REQ-B3.1 | Query avanzada | §3 |
| REQ-B3.2 | Upload | §4.4 |
| REQ-B4 | CSV | §6 |
| REQ-B5 | Soft delete API | §5 |
| REQ-B6 | Auditoría | [auditoría](./auditoria-y-observabilidad.md) |
| REQ-B7 | Errores | §8.3 |
| REQ-B8 | Env validado | §1.3, §1.5 |
| REQ-B9 | Interceptores | [logs HTTP](./auditoria-y-observabilidad.md#2-logs-http-logginginterceptor--req-b9) y envelope JSON (Network: `{ success, data, … }`) |
| REQ-DB1–DB5 | Prisma, índices, tx, seed | §1.2, §7, §9 |
| REQ-T1–T3 | Tests | §10 |
| REQ-O1–O4 | Compose, seed, env, SPA | §1 |
| REQ-DOC1–DOC5 | Docs | §11 |

Lo que **no** está en el producto (lectura REST de auditoría, refresh token, dashboard, etc.) está explicado en [`pending.md`](./pending.md) con cómo se implementaría.
