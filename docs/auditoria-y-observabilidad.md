# Auditoría y observabilidad

Hay **dos canales distintos**. No se mezclan:

| Canal | Requisito | Dónde vive | Para qué |
|-------|-----------|------------|----------|
| Tabla `AuditLog` | REQ-B6 | PostgreSQL | Quién hizo qué sobre un libro y cuándo (crear, editar, imagen, borrar, exportar CSV) |
| `LoggingInterceptor` | REQ-B9 | stdout del contenedor `backend` | Cada request HTTP: método, ruta, status, latencia y `userId` si hay JWT |
| `TransformInterceptor` | REQ-B9 | body JSON de éxito | Envelope `{ success, data, statusCode, timestamp, path }` (`meta` al mismo nivel en listados) |

No hay pantalla de auditoría en la SPA ni un `GET /api/audit-logs` (ver [`pending.md`](./pending.md) §12). La forma de **ver** los registros es Prisma Studio, SQL o los logs del contenedor.

Prerrequisito: el stack levantado (`docker compose up`) y al menos un login con `admin@cmpc.local` / `Admin123!`.

---

## 1. Auditoría de operaciones (`AuditLog`) — REQ-B6, REQ-DB4

Cada mutación de libro y cada export escribe una fila **en la misma transacción** que el cambio. Si la auditoría fallara, la mutación haría rollback: no queda libro huérfano sin rastro.

| Acción del usuario | `action` | `entity` | `entityId` | `metadata` |
|--------------------|----------|----------|------------|------------|
| Crear libro (`POST /api/books`) | `CREATE` | `Book` | id del libro | vacío |
| Crear autor (`POST /api/authors`, solo si el nombre no existía) | `CREATE` | `Author` | id del autor | vacío |
| Editar libro (`PATCH /api/books/:id`) | `UPDATE` | `Book` | id del libro | vacío |
| Subir/cambiar imagen (`POST /api/books/:id/image`) | `UPDATE` | `Book` | id del libro | `{ "imagePath": "books/<id>-<ts>.<ext>" }` |
| Soft delete (`DELETE /api/books/:id`) | `DELETE` | `Book` | id del libro | vacío |
| Exportar CSV (`GET /api/books/export/csv`) | `EXPORT` | `Book` | `null` | filtros aplicados (`search`, `genreId`, `available`, `sortBy`, `sortOrder`, …) |

`userId` es el UUID del usuario del JWT. `createdAt` lo pone la base de datos.

### 1.1 Verlo en tabla (Prisma Studio)

Desde el host, con Node instalado y Postgres publicado en `localhost:5432`:

```bash
cd backend
npx prisma studio
```

Si pide `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://cmpc:cmpc@localhost:5432/cmpc_libros" npx prisma studio
```

Abre http://localhost:5555. Elige el modelo **AuditLog**. Ahí se ve quién (`userId`), la acción, la entidad, el id y la fecha. En **User** puedes cruzar el UUID con `admin@cmpc.local`.

### 1.2 Verlo con SQL

```bash
docker compose exec db psql -U cmpc -d cmpc_libros
```

Dentro de `psql`:

```sql
SELECT
  a."createdAt",
  u.email          AS quien,
  a.action         AS operacion,
  a.entity         AS entidad,
  a."entityId",
  a.metadata
FROM "AuditLog" a
JOIN "User" u ON u.id = a."userId"
ORDER BY a."createdAt" DESC
LIMIT 20;
```

Un solo comando, sin entrar al REPL:

```bash
docker compose exec db psql -U cmpc -d cmpc_libros -c "
SELECT a.\"createdAt\", u.email, a.action, a.entity, a.\"entityId\", a.metadata
FROM \"AuditLog\" a
JOIN \"User\" u ON u.id = a.\"userId\"
ORDER BY a.\"createdAt\" DESC
LIMIT 20;
"
```

### 1.3 Recorrido mínimo para generar las cuatro acciones

En otra terminal, con el stack arriba:

```bash
first_uuid() { grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4; }

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cmpc.local","password":"Admin123!"}' \
  | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

# Lookups (los UUID de autor/editorial/género no son fijos; el seed es idempotente por nombre)
AUTHOR=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/authors | first_uuid)
PUBLISHER=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/publishers | first_uuid)
GENRE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/genres | first_uuid)

# CREATE (el primer "id" del JSON es el del libro; autor/editorial/género van anidados después)
BOOK=$(curl -s -X POST http://localhost:3000/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Libro de auditoría\",\"price\":\"9.99\",\"available\":true,\"authorId\":\"$AUTHOR\",\"publisherId\":\"$PUBLISHER\",\"genreId\":\"$GENRE\"}" \
  | first_uuid)

# UPDATE
curl -s -X PATCH "http://localhost:3000/api/books/$BOOK" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Libro de auditoría (editado)"}' > /dev/null

# EXPORT (entityId queda null; metadata lleva los filtros)
curl -s -H "Authorization: Bearer $TOKEN" \
  -o books.csv \
  "http://localhost:3000/api/books/export/csv?available=true"

# DELETE (soft delete: el libro desaparece del listado, la fila AuditLog permanece)
curl -s -X DELETE "http://localhost:3000/api/books/$BOOK" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

Después de eso, la consulta SQL de §1.2 debe mostrar, de más reciente a más antigua, algo equivalente a:

| quien | operacion | entidad | entityId | metadata |
|-------|-----------|---------|----------|----------|
| `admin@cmpc.local` | `DELETE` | `Book` | uuid del libro | |
| `admin@cmpc.local` | `EXPORT` | `Book` | `null` | `{ "available": true, "sortBy": "title", "sortOrder": "asc" }` |
| `admin@cmpc.local` | `UPDATE` | `Book` | uuid del libro | |
| `admin@cmpc.local` | `CREATE` | `Book` | uuid del libro | |

Comprobaciones extra:

- `GET /api/books/$BOOK` con el mismo token responde **404** (el libro ya no es visible).
- En SQL, `SELECT "deletedAt" FROM "Book" WHERE id = '<uuid>';` **no** es `NULL`: el registro físico sigue ahí (REQ-B5 / REQ-D4).

La subida de imagen (también `UPDATE` con `metadata.imagePath`) se valida igual desde la SPA o con `curl -F file=@foto.jpg` contra `POST /api/books/:id/image`.

---

## 2. Logs HTTP (`LoggingInterceptor`) — REQ-B9

Cada request deja **una línea** en stdout. El logging no cambia el body: la transformación JSON la hace `TransformInterceptor` (más abajo).

```bash
docker compose logs -f backend
```

Líneas típicas (el prefijo `LOG` / `WARN` y el contexto `LoggingInterceptor` los pone Nest):

```text
[LoggingInterceptor] GET /api/health 200 +4ms
[LoggingInterceptor] POST /api/auth/login 200 +80ms
[LoggingInterceptor] GET /api/books?page=1&limit=20 200 +12ms user=3f2a…
[LoggingInterceptor] POST /api/books 201 +18ms user=3f2a…
[LoggingInterceptor] GET /api/books/no-existe 404 +5ms user=3f2a…
```

Qué comprobar:

| Caso | Qué debe verse |
|------|----------------|
| Ruta pública (`/api/health`, `/api/auth/login`) | método, ruta, status, latencia; **sin** `user=` |
| Ruta con JWT válido | lo mismo **más** `user=<uuid>` (el mismo `userId` que en `AuditLog`) |
| Error 4xx/5xx | línea con el status de error; el JSON de respuesta sigue el formato del filtro global (`statusCode`, `message`, `error`, `timestamp`, `path`) |
| `GET /api/books` | envelope de éxito **sin** `data.data`: `{ "success": true, "data": [...], "meta": {...}, "statusCode", "timestamp", "path" }` |
| `GET /api/books/export/csv` | `Content-Type: text/csv`; `TransformInterceptor` no lo convierte a JSON |

Las peticiones `GET /uploads/...` también pasan por el interceptor si las atiende Nest.

### Envelope JSON (`TransformInterceptor`)

Respuesta de éxito típica (detalle, login, lookups):

```json
{
  "success": true,
  "data": { "id": "…", "title": "…" },
  "statusCode": 200,
  "timestamp": "2026-10-08T13:00:00.000Z",
  "path": "/api/books/…"
}
```

Listado: `data` es el array de libros y `meta` va al mismo nivel (`page`, `limit`, `total`, `totalPages`). No hay `data.data`.

Cómo comprobarlo: DevTools → Network en la SPA, o `curl` a `/api/health` / `/api/auth/login`.

---

## 3. Qué no esperar

- Un menú “Auditoría” en http://localhost:5173: no existe.
- Un endpoint REST de lectura: no existe. Las escrituras sí están cubiertas por tests (`AuditService`, `BooksService`, export HTTP).
- Que el seed cree filas en `AuditLog`: el seed solo carga usuario, lookups y libros de ejemplo. La tabla arranca vacía hasta la primera mutación o export.
