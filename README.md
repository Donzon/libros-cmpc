# CMPC-libros

Aplicación web para digitalizar el inventario de libros de la tienda CMPC-libros: login, listado con filtros/orden/búsqueda y paginación del lado del servidor, alta/edición con imagen, detalle, soft delete, exportación CSV y auditoría de operaciones.

**Stack:** React + TypeScript (Vite, React Query, react-hook-form + Zod) · NestJS + TypeScript · PostgreSQL 16 + Prisma · Docker Compose.

La especificación completa vive en [`specs/`](./specs): [`requirements.md`](./specs/requirements.md), [`design.md`](./specs/design.md) y [`tasks.md`](./specs/tasks.md).

---

## Índice

1. [Inicio rápido](#1-inicio-rápido)
2. [Configuración](#2-configuración)
3. [Guía de uso](#3-guía-de-uso)
4. [API y Swagger](#4-api-y-swagger)
5. [Arquitectura](#5-arquitectura)
6. [Modelo relacional](#6-modelo-relacional)
7. [Decisiones de diseño](#7-decisiones-de-diseño)
8. [Supuestos (A1–A6)](#8-supuestos-a1a6)
9. [Tests y cobertura](#9-tests-y-cobertura)
10. [Desarrollo local sin Docker](#10-desarrollo-local-sin-docker)
11. [Pendientes](#11-pendientes)

---

## 1. Inicio rápido

Requisitos: Docker con Docker Compose v2.

```bash
docker compose up --build
```

Ese único comando levanta los tres servicios. Al arrancar, el backend ejecuta automáticamente `prisma migrate deploy` y `prisma db seed` (ver `backend/docker-entrypoint.sh`), así que no hay pasos manuales de base de datos.

| Servicio | URL |
|----------|-----|
| Frontend (SPA) | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| Health | http://localhost:3000/api/health |
| PostgreSQL | `localhost:5432` (usuario/clave/db: `cmpc` / `cmpc` / `cmpc_libros`) |

### Credenciales de prueba (seed)

| Email | Password |
|-------|----------|
| `admin@cmpc.local` | `Admin123!` |

No hay registro público (supuesto A3): el usuario se crea en el seed con la contraseña hasheada con bcrypt. El seed también carga 3 autores, 3 editoriales, 3 géneros y 3 libros de ejemplo. Es idempotente (usa `upsert`), por lo que reiniciar el backend no duplica datos.

### Comprobar que todo está arriba

```bash
curl http://localhost:3000/api/health          # {"status":"ok"}
./scripts/smoke-docs.sh                         # smoke de Swagger (/api/docs → 200)
./scripts/smoke-compose.sh                      # valida docker-compose.yml
```

Para detener: `docker compose down` (agrega `-v` para borrar también los volúmenes de base de datos e imágenes).

---

## 2. Configuración

Todas las variables están documentadas en [`.env.example`](./.env.example). `docker-compose.yml` trae valores por defecto para desarrollo, así que el `.env` es opcional en local; para cualquier otro entorno copia el ejemplo y **cambia `JWT_SECRET`**:

```bash
cp .env.example .env
```

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `DATABASE_URL` | `postgresql://cmpc:cmpc@localhost:5432/cmpc_libros` | Conexión de Prisma |
| `JWT_SECRET` | cadena aleatoria de ≥ 32 caracteres | Firma de los JWT |
| `JWT_EXPIRES_IN` | `30m` | Vida del token (corta, supuesto A6) |
| `PORT` | `3000` | Puerto HTTP del backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para la SPA |
| `UPLOAD_DIR` | `./uploads` (local) / `/app/uploads` (Docker) | Carpeta de imágenes |
| `MAX_IMAGE_BYTES` | `2097152` | Tamaño máximo de imagen (2 MiB) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `cmpc` / `cmpc` / `cmpc_libros` | Credenciales del contenedor `db` |
| `VITE_API_BASE_URL` (frontend, build time) | `http://localhost:3000/api` | URL base del API para la SPA (este es el valor por defecto) |

Las variables del backend se validan al arrancar con Zod (`backend/src/modules/config/env.schema.ts`): si falta alguna o es inválida (por ejemplo `JWT_SECRET` corto), la app no arranca. No hay secretos en el código.

---

## 3. Guía de uso

1. Abre http://localhost:5173 e inicia sesión con las credenciales del seed. Cualquier ruta protegida sin sesión redirige al login; si el token expira (401), la sesión se limpia y vuelves al login.
2. **Listado (`/books`)**: tabla paginada del lado del servidor con el total de resultados.
   - Filtros combinables por género, editorial, autor y disponibilidad.
   - Orden por título, precio, autor o fecha de creación, ascendente o descendente.
   - Búsqueda por **título** mientras escribes, con debounce de ~300 ms (no dispara una petición por tecla).
3. **Nuevo libro (`/books/new`)** y **edición (`/books/:id/edit`)**: un único formulario con validación en vivo por campo; el envío se bloquea mientras haya errores. La imagen es opcional (JPEG, PNG o WebP, máx. 2 MiB) y muestra vista previa.
   - Si el libro se guarda pero falla la subida de la imagen, la UI ofrece **reintentar solo la subida**, sin crear el libro otra vez.
4. **Detalle (`/books/:id`)**: todos los datos del libro, incluida la imagen.
5. **Exportar CSV y eliminar** están disponibles por API (Swagger o `curl`, ver [§4](#4-api-y-swagger)); la SPA aún no tiene botones para ellas (ver `docs/pending.md`).
   - `GET /api/books/export/csv` acepta los mismos filtros que el listado.
   - `DELETE /api/books/:id` es un soft delete: el libro deja de aparecer en listados, detalle y CSV, pero sigue en la base de datos con `deletedAt`.

Cada creación, edición, eliminación, cambio de imagen y exportación queda registrada en la tabla `AuditLog` (quién, qué acción, sobre qué entidad y cuándo).

---

## 4. API y Swagger

La documentación interactiva OpenAPI está en **http://localhost:3000/api/docs** (JSON en `/api/docs-json`). Para probar rutas protegidas: ejecuta `POST /api/auth/login`, copia el `accessToken` y pégalo en el botón **Authorize**.

Todas las rutas llevan el prefijo `/api` y requieren `Authorization: Bearer <accessToken>`, salvo las marcadas como públicas.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | Pública | `{ email, password }` → `{ accessToken, expiresIn }`. Rate limit: 5 intentos/min (429) |
| `GET` | `/api/health` | Pública | `{ status: "ok" }`; 503 si la DB no responde |
| `GET` | `/api/authors` · `/api/publishers` · `/api/genres` | JWT | Listas `{ id, name }[]` para los selects (solo lectura) |
| `GET` | `/api/books` | JWT | Listado paginado → `{ data, meta: { page, limit, total, totalPages } }` |
| `GET` | `/api/books/export/csv` | JWT | CSV con los mismos filtros, sin paginación (tope de 10 000 filas) |
| `GET` | `/api/books/:id` | JWT | Detalle con autor, editorial y género |
| `POST` | `/api/books` | JWT | Alta (JSON) → 201 |
| `PATCH` | `/api/books/:id` | JWT | Edición parcial |
| `DELETE` | `/api/books/:id` | JWT | Soft delete → 204 |
| `POST` | `/api/books/:id/image` | JWT | Multipart, campo `file`; valida magic bytes y tamaño |
| `GET` | `/uploads/books/<archivo>` | Pública | Imágenes estáticas de solo lectura |

Query params de `GET /api/books` y del export: `page` (1), `limit` (20, máx. 100), `search` (solo título), `genreId`, `publisherId`, `authorId`, `available`, `sortBy` (`title` \| `price` \| `createdAt` \| `author`) y `sortOrder` (`asc` \| `desc`).

Los errores siempre tienen el mismo formato:

```json
{
  "statusCode": 400,
  "message": ["title must be a string"],
  "error": "Bad Request",
  "timestamp": "2026-09-29T22:00:00.000Z",
  "path": "/api/books"
}
```

Ejemplo rápido con `curl`:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cmpc.local","password":"Admin123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/books?sortBy=price&sortOrder=desc"
curl -H "Authorization: Bearer $TOKEN" -o books.csv "http://localhost:3000/api/books/export/csv?available=true"
```

---

## 5. Arquitectura

### 5.1 Vista del sistema

```mermaid
flowchart LR
  subgraph compose [Docker Compose]
    FE["frontend<br/>React SPA servida por nginx<br/>:5173"]
    BE["backend<br/>NestJS API<br/>:3000"]
    DB[("db<br/>PostgreSQL 16<br/>:5432")]
    VOL[/"volumen uploads_data<br/>imágenes"/]
    PGV[/"volumen postgres_data"/]
  end
  Browser["Navegador"]

  Browser -->|"HTML/JS"| FE
  Browser -->|"JSON + Bearer JWT<br/>multipart (imagen)"| BE
  Browser -->|"GET /uploads/*"| BE
  BE -->|"Prisma Client"| DB
  BE --> VOL
  DB --> PGV
```

La SPA corre en el navegador y llama directamente al API (`VITE_API_BASE_URL`); nginx solo sirve los archivos estáticos del build. El backend es el único que accede a la base de datos y al volumen de imágenes.

### 5.2 Capas del backend

```mermaid
flowchart TB
  subgraph http [Capa HTTP]
    Guards["JwtAuthGuard global<br/>+ Throttler en login"]
    Pipes["ValidationPipe global<br/>ImageFileValidationPipe"]
    Controllers["Controllers delgados<br/>+ decoradores Swagger"]
    Filter["HttpExceptionFilter global"]
  end
  subgraph app [Capa de aplicación]
    Services["Services por dominio<br/>Books, Auth, Users, Lookups"]
    Builder["books-query.builder<br/>where / orderBy"]
    Audit["AuditService.log(tx, ...)"]
  end
  subgraph infra [Infraestructura]
    Prisma["PrismaService"]
    Config["ConfigModule (Zod)"]
    Storage["FileStorageService"]
  end

  Guards --> Controllers
  Pipes --> Controllers
  Controllers --> Services
  Filter -.-> Controllers
  Services --> Builder
  Services --> Audit
  Services --> Prisma
  Services --> Storage
  Audit --> Prisma
  Config --> Services
```

- **Módulos por dominio** (`backend/src/modules/`): `config`, `prisma`, `health`, `auth`, `users`, `authors`, `publishers`, `genres`, `books`, `audit`.
- **Controllers** solo mapean HTTP ↔ DTO; la lógica y las transacciones viven en los services.
- **Transacciones**: create/update/delete de libro, cambio de imagen y export escriben el `AuditLog` en la misma `prisma.$transaction`; si la auditoría falla, la mutación hace rollback.
- **Frontend** (`frontend/src/`): `app/` (router y providers), `features/auth` y `features/books` (páginas, hooks de React Query, API, schemas Zod), `shared/` (cliente HTTP con Bearer y manejo de 401, estados de UI, hooks).

### 5.3 Flujo crear libro con imagen

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as BooksController
  participant S as BooksService
  participant DB as PostgreSQL

  UI->>API: POST /api/books (JSON)
  API->>S: create(dto, userId)
  S->>DB: $transaction: book.create + auditLog CREATE
  API-->>UI: 201 BookResponse
  opt hay imagen seleccionada
    UI->>API: POST /api/books/:id/image (multipart)
    alt upload ok
      API-->>UI: 200 BookResponse con imageUrl
    else upload falla
      API-->>UI: 4xx/5xx
      UI->>UI: ofrece reintentar solo el upload (mismo id)
    end
  end
```

---

## 6. Modelo relacional

Fuente de verdad: [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma). Migraciones versionadas en `backend/prisma/migrations/`.

```mermaid
erDiagram
  User ||--o{ AuditLog : "registra"
  Author ||--o{ Book : "escribe"
  Publisher ||--o{ Book : "publica"
  Genre ||--o{ Book : "clasifica"

  User {
    uuid id PK
    string email UK
    string passwordHash
    datetime createdAt
    datetime updatedAt
  }
  Author {
    uuid id PK
    string name UK
    datetime createdAt
    datetime updatedAt
  }
  Publisher {
    uuid id PK
    string name UK
    datetime createdAt
    datetime updatedAt
  }
  Genre {
    uuid id PK
    string name UK
    datetime createdAt
    datetime updatedAt
  }
  Book {
    uuid id PK
    string title
    decimal price "Decimal(10,2)"
    boolean available
    string imagePath "nullable"
    uuid authorId FK
    uuid publisherId FK
    uuid genreId FK
    datetime deletedAt "nullable, soft delete"
    datetime createdAt
    datetime updatedAt
  }
  AuditLog {
    uuid id PK
    uuid userId FK
    enum action "CREATE | UPDATE | DELETE | EXPORT"
    string entity
    string entityId "nullable"
    json metadata "nullable"
    datetime createdAt
  }
```

### Índices

| Índice | Tabla | Para qué |
|--------|-------|----------|
| `email` único | User | Lookup en login |
| `name` único | Author, Publisher, Genre | Evita duplicados; selects ordenados |
| `deletedAt` | Book | Predicado `deletedAt IS NULL` presente en casi todas las consultas |
| `genreId`, `publisherId`, `authorId`, `available` | Book | Filtros del listado y del CSV |
| `title`, `price` | Book | Ordenamiento dinámico (y prefijos de título) |
| `(deletedAt, genreId, publisherId, authorId)` | Book | Patrón típico: activos + filtros combinados |
| `createdAt`, `(entity, entityId)`, `userId` | AuditLog | Consultas por fecha, por entidad y por usuario |

La justificación detallada está en [`specs/design.md` §4](./specs/design.md#4-índices-justificación).

---

## 7. Decisiones de diseño

| Tema | Decisión | Por qué |
|------|----------|---------|
| Autenticación | JWT Bearer de vida corta (`30m`), bcrypt, guard global con `@Public()` para excepciones | Todo protegido por defecto; olvidar un decorador no deja una ruta abierta |
| Fuerza bruta | `@nestjs/throttler` en `POST /auth/login` (5/min → 429) | Mitiga ataques de diccionario sin penalizar el resto del API |
| Precio | `Decimal(10,2)` en DB, serializado como string (`"19.99"`) | Evita errores de redondeo de float en dinero |
| Borrado | Soft delete con `deletedAt` | Conserva historial y trazabilidad con la auditoría |
| Auditoría | Tabla `AuditLog` append-only; `AuditService.log(tx, …)` recibe el cliente transaccional | La auditoría se confirma o revierte junto con la operación |
| Búsqueda | `contains` case-insensitive solo sobre `title` | Alcance acotado en la spec; `pg_trgm` queda como evolución |
| Consulta avanzada | Un builder de `where`/`orderBy` compartido por listado y CSV | Garantiza que el CSV respete exactamente los mismos filtros |
| Imágenes | Endpoint multipart separado, validación por magic bytes (no por `Content-Type`), nombre `<bookId>-<timestamp>.<ext>`, se borra la anterior | No confiar en el cliente; nombres no adivinables por el usuario ni colisiones |
| Crear + imagen | Dos requests (JSON y multipart) con reintento solo del upload | Un fallo de red en la imagen no duplica libros |
| Errores | Filtro global con formato `{ statusCode, message, error, timestamp, path }` | Contrato uniforme para el frontend |
| Observabilidad | `LoggingInterceptor` global: método, ruta, status, latencia y `userId` por request; re-lanza la excepción sin tocarla | Trazabilidad en producción sin duplicar el formateo de errores del filtro |
| Contrato de respuestas | El interceptor **no** envuelve el payload en `{ data, meta }` | El listado ya devuelve su propio `{ data, meta }`: un envelope global lo anidaría dos veces (`data.data`) y además rompería el `text/csv` del export |
| Errores de render | `ErrorBoundary` de React envolviendo el router | React Query cubre los errores de red, pero un throw en render dejaría la SPA en blanco |
| Configuración | Validación de env con Zod al arrancar | Falla rápido y explícito ante configuración inválida |
| Seguridad HTTP | Helmet; `/uploads` de solo lectura, sin listado de directorio y con `nosniff` | Endurecimiento básico listo para producción |
| Frontend | React Query para estado de servidor; react-hook-form + Zod para el formulario | Caché e invalidación declarativas; validación en vivo tipada |
| Lookups | Solo `GET` de autores/editoriales/géneros; se cargan por seed | La spec no pide administrarlos; evita superficie de API innecesaria |

---

## 8. Supuestos (A1–A6)

| ID | Supuesto | Justificación | Evolución posible |
|----|----------|---------------|-------------------|
| **A1** | Relación 1:N: un libro tiene un autor, una editorial y un género; cada uno de ellos puede tener muchos libros. | Cubre el caso habitual de una tienda y mantiene simples los filtros, el orden por autor y el CSV. | N:M libro–autor con tabla intermedia (ver `docs/pending.md`). |
| **A2** | La disponibilidad es un booleano (`available`), no un stock numérico. | El estado de un libro (p. ej. descatalogado o reservado) no depende necesariamente de una cantidad. | Agregar `stock` y derivar o complementar la disponibilidad. |
| **A3** | Usuarios pre-cargados por seed; no hay registro público y hay un único rol. | La app es interna de la tienda; roles avanzados están fuera de alcance. | Endpoint de administración de usuarios y RBAC. |
| **A4** | Las imágenes se guardan en disco, en el volumen Docker `uploads_data`. | Suficiente para local y una sola instancia; sin dependencias externas. | Object storage (S3 o similar) con URLs firmadas. |
| **A5** | El "análisis de datos" se cubre con filtros, ordenamiento y exportación CSV. | Permite analizar en herramientas externas (Excel, BI) sin construir dashboards. | Dashboard con métricas agregadas. |
| **A6** | Los JWT son de vida corta (`30m`) y no hay refresh token. | Limita el impacto de un token filtrado; al expirar, el usuario vuelve a iniciar sesión. | Refresh token rotativo en cookie `httpOnly`. |

---

## 9. Tests y cobertura

Backend con Jest (servicios, controllers, pipes, builder, HTTP con supertest y Prisma mockeado) y frontend con Vitest + Testing Library. Umbral mínimo: **80 % de líneas y statements** en ambos; si baja, el comando falla.

```bash
cd backend && npm install && npm run test:cov    # reporte en backend/coverage/
cd frontend && npm install && npm run test:cov   # reporte en frontend/coverage/
```

Reportes HTML: `backend/coverage/index.html` y `frontend/coverage/index.html` (también `lcov.info`). Detalle en [`docs/coverage.md`](./docs/coverage.md).

Otros checks:

```bash
cd backend && npm run prisma:validate   # valida schema.prisma
./scripts/smoke-compose.sh              # docker compose config
./scripts/smoke-docs.sh                 # Swagger responde 200 (con el stack levantado)
```

---

## 10. Desarrollo local sin Docker

Con Node 22 y un PostgreSQL accesible (por ejemplo solo el servicio `db`: `docker compose up -d db`):

```bash
cp .env.example .env

# Backend
cd backend
npm install
set -a && . ../.env && set +a
npx prisma migrate deploy && npx prisma db seed
npm run start:dev          # http://localhost:3000/api

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

---

## 11. Pendientes

Lo que no se implementó (mejoras P2, evoluciones de los supuestos y brechas conocidas) está en [`docs/pending.md`](./docs/pending.md), con una propuesta de cómo implementarlo.
