# Arquitectura y modelo de datos

Complemento del [`README.md`](../README.md). Diagramas de capas, flujo de alta con imagen, modelo relacional e índices (REQ-DOC3, REQ-DOC4).

---

## Vista del sistema

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

---

## Capas del backend

```mermaid
flowchart TB
  subgraph http [Capa HTTP]
    Guards["JwtAuthGuard global<br/>+ Throttler en login"]
    Pipes["ValidationPipe global<br/>ImageFileValidationPipe"]
    Controllers["Controllers delgados<br/>+ decoradores Swagger"]
    Filter["HttpExceptionFilter global"]
    Logs["LoggingInterceptor + TransformInterceptor"]
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
  Logs -.-> Controllers
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
- **Observabilidad y contrato HTTP** (REQ-B9): `LoggingInterceptor` registra método, ruta, status, latencia y `userId`. `TransformInterceptor` envuelve JSON de éxito en `{ success, data, statusCode, timestamp, path }` (con `meta` aplanado en listados). CSV, 204 y Swagger se omiten. Cómo verlo: [`auditoria-y-observabilidad.md`](./auditoria-y-observabilidad.md).
- **Frontend** (`frontend/src/`): `app/` (router y providers), `features/auth` y `features/books`, `shared/` (cliente HTTP con Bearer, unwrap del envelope y 401, estados de UI, hooks).

---

## Flujo crear libro con imagen

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

## Modelo relacional

Fuente de verdad: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). Migraciones versionadas en `backend/prisma/migrations/`.

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

`AuditLog` es append-only: las operaciones se consultan en esa tabla, no hay UPDATE/DELETE de auditoría en la app. Cómo inspeccionarla: [`auditoria-y-observabilidad.md`](./auditoria-y-observabilidad.md).

---

## Índices

| Índice | Tabla | Para qué |
|--------|-------|----------|
| `email` único | User | Lookup en login |
| `name` único | Author, Publisher, Genre | Evita duplicados; selects ordenados |
| `deletedAt` | Book | Predicado `deletedAt IS NULL` presente en casi todas las consultas |
| `genreId`, `publisherId`, `authorId`, `available` | Book | Filtros del listado y del CSV |
| `title`, `price` | Book | Ordenamiento dinámico (y prefijos de título) |
| `(deletedAt, genreId, publisherId, authorId)` | Book | Patrón típico: activos + filtros combinados |
| `createdAt`, `(entity, entityId)`, `userId` | AuditLog | Consultas por fecha, por entidad y por usuario |

La justificación detallada está en [`specs/design.md` §4](../specs/design.md#4-índices-justificación).
