# Requirements: CMPC-libros

Aplicación web para digitalizar el inventario de la tienda CMPC-libros.
Stack: React + TypeScript, NestJS + TypeScript, PostgreSQL con Prisma, Docker.

## 0. Contexto y criterios de evaluación

- Se valora arquitectura, calidad del código y decisiones técnicas más que completitud.
- Todo debe pensarse para un ambiente productivo real.
- Los supuestos se documentan y justifican (sección 8 y README).
- Lo que no se alcance a implementar se documenta en `docs/pending.md` explicando cómo se implementaría.

## 1. Modelo de dominio

Un **libro** tiene: título, autor, editorial, precio, disponibilidad y género (más una imagen opcional).

| ID | Requisito |
|----|-----------|
| REQ-D1 | Autor, editorial y género son entidades propias relacionadas con el libro (modelo normalizado). |
| REQ-D2 | El precio se guarda como decimal exacto (no float). |
| REQ-D3 | La disponibilidad es un dato del libro (ver supuesto A2). |
| REQ-D4 | Los libros usan soft delete (`deletedAt`); los registros no se eliminan físicamente. |
| REQ-D5 | Cada libro admite una sola imagen. |

## 2. Frontend (React + TypeScript)

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| REQ-F1 | Login de autenticación | Formulario email/contraseña; guarda el token JWT; rutas protegidas redirigen al login; manejo de sesión expirada. |
| REQ-F2 | Listado de libros | Tabla o grilla con los libros paginados. |
| REQ-F2.1 | Filtrado avanzado | Filtra por género, editorial, autor y disponibilidad, combinables entre sí. |
| REQ-F2.2 | Ordenamiento dinámico | Ordena por múltiples campos (título, precio, autor, etc.) asc/desc. |
| REQ-F2.3 | Paginación del lado del servidor | Cada cambio de página consulta al backend; muestra el total. |
| REQ-F2.4 | Búsqueda en tiempo real con debounce | Busca mientras se escribe, con debounce (~300 ms) y sin peticiones por cada tecla. |
| REQ-F3 | Formulario de alta/edición | Un solo formulario para crear y editar. |
| REQ-F3.1 | Validación reactiva | Errores por campo en vivo; el envío se bloquea si es inválido. |
| REQ-F3.2 | Carga de una imagen por libro | Valida tipo y tamaño; muestra vista previa. |
| REQ-F3.3 | Autor existente o nuevo | En alta/edición se puede elegir un autor del catálogo o registrar uno nuevo por nombre. |
| REQ-F4 | Detalle del libro | Vista con todos los datos del libro, incluida la imagen. |
| REQ-F5 | Estados de UI | Loading, vacío y error en listado y formularios. |
| REQ-F6 | Error boundary global | Un error no controlado al renderizar no deja la app en blanco: se muestra una pantalla de fallback con opción de recuperarse. |

## 3. Backend (NestJS + TypeScript)

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| REQ-B1 | Arquitectura modular y escalable (SOLID) | Módulos por dominio (auth, users, books, authors, publishers, genres, audit); controladores delgados, lógica en servicios, DTOs y validación. |
| REQ-B2 | Autenticación JWT | Login que emite un token; guard global; contraseñas hasheadas (bcrypt/argon2). |
| REQ-B3 | CRUD RESTful de libros | GET (lista y detalle), POST, PUT/PATCH y DELETE con códigos HTTP correctos. |
| REQ-B3.1 | Listado con consulta avanzada | Acepta query params de filtros, orden, paginación y búsqueda de texto. |
| REQ-B3.2 | Subida de imagen | Endpoint que recibe la imagen, la valida y la almacena (ver supuesto A4). |
| REQ-B4 | Exportación CSV | Endpoint autenticado que exporta libros (respeta filtros), excluye los eliminados y escapa bien los campos. |
| REQ-B5 | Soft delete | DELETE marca `deletedAt`; las consultas normales lo excluyen. |
| REQ-B6 | Logging de auditoría | Registra quién, qué operación, sobre qué entidad y cuándo, para crear, editar, eliminar y exportar. |
| REQ-B7 | Manejo de errores | Filtro global de excepciones y formato de error consistente. |
| REQ-B8 | Configuración | Variables de entorno validadas al arrancar; sin secretos en el código. |
| REQ-B9 | Interceptor global | Interceptor de NestJS en el pipeline de respuestas: registra método, ruta, status y latencia de cada request, y correlaciona el log con el usuario autenticado cuando existe. No altera el contrato de los endpoints. |

## 4. Base de datos (PostgreSQL + Prisma)

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| REQ-DB1 | Prisma como capa de acceso | `schema.prisma` declarativo, migraciones versionadas y cliente tipado. |
| REQ-DB2 | Modelo normalizado | Relaciones apropiadas entre libros, autores, editoriales, géneros y usuarios. |
| REQ-DB3 | Índices | Sobre las columnas de filtro, orden y búsqueda frecuentes, justificados en `design.md`. |
| REQ-DB4 | Transacciones | Operaciones críticas (ej. creación de libro con sus relaciones y registro de auditoría) en una transacción. |
| REQ-DB5 | Seed | Datos iniciales: usuario de prueba y libros de ejemplo. |

## 5. Testing

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| REQ-T1 | Tests unitarios de frontend | Componentes y servicios/hooks (Vitest o Jest + Testing Library). |
| REQ-T2 | Tests unitarios de backend | Servicios y controladores de NestJS (Jest). |
| REQ-T3 | Cobertura | Al menos 80 %, con el reporte incluido. |

## 6. DevOps y despliegue

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| REQ-O1 | docker-compose | Un `docker-compose.yml` levanta frontend, backend y PostgreSQL con un solo comando. |
| REQ-O2 | Migraciones y seed automáticos | Se ejecutan al iniciar el entorno. |
| REQ-O3 | Configuración por entorno | `.env.example` documentado. |
| REQ-O4 | SPA servida con fallback de rutas | El servidor estático del frontend devuelve `index.html` en cualquier ruta que no corresponda a un archivo existente. Entrar directo o recargar una URL profunda (`/login`, `/books/:id`) responde 200 y la resuelve el router del cliente, no 404. Los assets con hash (`/assets/*`) sí devuelven 404 cuando no existen. |

## 7. Documentación

| ID | Requisito |
|----|-----------|
| REQ-DOC1 | `README.md` con instalación y configuración, guía de uso, arquitectura y decisiones de diseño. |
| REQ-DOC2 | API documentada con Swagger/OpenAPI. |
| REQ-DOC3 | Diagrama de arquitectura del sistema. |
| REQ-DOC4 | Modelo relacional de la base de datos (imagen o dbdiagram.io). |
| REQ-DOC5 | `docs/pending.md`: lo no implementado y cómo se implementaría. |

## 8. Supuestos (a validar y documentar en el README)

- **A1.** Relación 1:N: un libro tiene un solo autor, una editorial y un género; un autor (o editorial, o género) puede tener muchos libros. Evolución posible: N:M para libros con varios autores.
- **A2.** La disponibilidad es un booleano (disponible/no disponible), no un stock numérico, porque el estado de un libro no depende necesariamente de un stock. Evolución posible: agregar cantidad en inventario.
- **A3.** El acceso es con usuarios pre-cargados (seed); no hay registro público. Rol único.
- **A4.** Las imágenes se guardan en disco/volumen Docker en local. En producción irían a un almacenamiento de objetos (S3 o similar).
- **A5.** "Análisis de datos" se cubre con filtros, ordenamiento y exportación CSV. Métricas o dashboards quedan como mejora (documentada en `pending.md`).
- **A6.** Los tokens JWT son de vida corta. Refresh token: mejora si el tiempo lo permite.

## 9. Prioridades

- **P0 (núcleo):** REQ-B2, B3, DB1, DB2, F1, F2, F3, T3, O1, O4, DOC1.
- **P1:** REQ-B4, B5, B6, B9, DB4, F2.4, F3.2, F6, DOC2 a DOC4.
- **P2 (si sobra tiempo o solo documentar):** refresh token, dashboard, CI/CD, caché.

## 10. Fuera de alcance

Pagos, carrito de compras, roles y permisos avanzados, multi-tienda.
