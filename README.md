# Cost Manager API

Backend en NestJS v11 para autenticación, gestión financiera personal y administración de usuarios. El servicio integra PostgreSQL, Redis, Keycloak, RabbitMQ y Swagger; además incluye cobertura de pruebas unitarias y análisis estático con SonarQube.

> Descripción de marca, **prompt de logo generado a partir de la descripción del proyecto**, naming candidato y taglines: [`docs/service-description.md`](docs/service-description.md).

## Estado actual

Estado verificado el 15 de agosto de 2026:

- Compila con `npm run build`.
- Bootstrap requiere Redis, Keycloak, PostgreSQL y RabbitMQ (no es standalone).
- Swagger en `/api/v{VERSION}/docs`.
- Módulos: `auth`, `identity`, `banking`, `catalog`, `finance`, `audit`, `notification`, `news`, `mail`, `support`, `intelligence`.
- Panel admin: listado de usuarios con metadata, roles, noticias (CRUD admin), plantillas de correo y broadcast de emails a usuarios activos.
- Umbral de cobertura Jest: ≥80% en lines / functions / statements / branches.
- CI (`Jenkinsfile`): lint → tests+coverage → SonarQube → Docker → **Deploy Vercel** (rama `main`).

## Stack tecnológico


- Framework: NestJS 11
- Runtime: Node.js / TypeScript
- Base de datos: PostgreSQL con TypeORM
- Caché: Redis con `@nestjs/cache-manager`
- Mensajería: RabbitMQ con `@nestjs/microservices`
- WebSockets: Gateway de notificaciones con `@nestjs/websockets`
- Identidad: Keycloak (`user` / `admin`)
- Correo: Nodemailer + react-email
- Documentación: Swagger
- Calidad: Jest (LCOV), SonarQube
- Contenedores: Docker Compose
- Deploy: Docker Hub + Vercel (Jenkins)

## Estructura del proyecto

```
src/
├── app.module.ts
├── main.ts
├── config/                          # Configuraciones globales
├── modules/
│   ├── audit/                       # Registro de auditoría
│   ├── auth/                        # Keycloak + guards (Auth, Admin, Ownership)
│   ├── banking/                     # Cuentas, activos y pasivos
│   ├── catalog/                     # Categorías y subcategorías
│   ├── finance/                     # Transacciones, objetivos, períodos, extractos
│   ├── identity/                    # Usuarios, admin users, perfiles
│   ├── intelligence/                # Resúmenes financieros (entidades)
│   ├── mail/                        # Plantillas + broadcast admin
│   ├── news/                        # Noticias (CRUD admin / lectura auth)
│   ├── notification/                # WebSocket
│   └── support/                     # Soporte
├── shared/
└── test/                            # Specs unitarios (mirror de modules/)
docs/
├── keycloak-roles.md
└── service-description.md           # Brand pack + prompt logo + nombres
```

## Funcionalidad implementada

### Autenticación

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/introspect`
- `POST /auth/change-password`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:sessionId`
- `GET /auth/access-history`
- `POST /auth/encrypt`

**Recuperación de contraseña (flujo OTP)**

- `POST /auth/forgot-password` — genera un OTP de 6 dígitos y lo envía por correo (no revela si el email existe: siempre responde `204`).
- `POST /auth/verify-otp` — valida el código y devuelve un `reset_token` de un solo uso.
- `POST /auth/reset-password` — cambia la contraseña en Keycloak con el `reset_token`.

Detalles del flujo:

- El código se genera con `randomInt` de `node:crypto` (6 dígitos con ceros a la izquierda) y se almacena **hasheado** (SHA-256) en `identity.password_reset_otp`; nunca en claro.
- TTL de 10 minutos, máx. 3 intentos de verificación y un solo OTP activo por usuario (los anteriores se invalidan).
- El correo se envía con Nodemailer + react-email. La plantilla se persiste en `mail.email_template` (clave `otp_password_reset`) **con marcadores** `{{otp}}`, `{{name}}` y `{{year}}`; `sendOtp` los sustituye por el código real de cada envío. Si la plantilla guardada no contiene `{{otp}}` (por ejemplo, versiones previas que incrustaban un código fijo), se renderiza la react-email por defecto con el código real, y al arrancar la app se repara automáticamente la plantilla.
- Con `MAIL_ENABLED=false` (o sin `MAIL_HOST`) no se envía correo real: el envío se registra en logs (modo mock para desarrollo).

### Identidad (usuarios)

- `POST /user`
- `GET /user`
- `GET /user/:id`
- `PATCH /user/:id`
- `GET /user/public/status`

### Admin — usuarios (requiere rol `admin`)

- `GET /admin/users` — listado paginado con filtros (`search`, `role`, `is_active`, `sortBy`, `last_login_at`, online).
- `GET /admin/users/:id` — detalle admin: PII, metadata, sesiones Keycloak e historial de acceso.
- `PATCH /admin/users/:id/status` — activar / desactivar (revoca sesiones si se desactiva).
- `PATCH /admin/users/:id/roles` — reemplazo de roles de realm (`user` / `admin`), sincronizado con Keycloak + audit log.
- `POST /admin/users/:id/reset-password` — envía email de restablecimiento.
- `DELETE /admin/users/:id/sessions` — revoca todas las sesiones.
- `DELETE /admin/users/:id/sessions/:sessionId` — revoca una sesión.

### Perfil financiero

- `POST /user/:userId/financial-profile`
- `GET /user/:userId/financial-profile`
- `PATCH /user/:userId/financial-profile`
- `DELETE /user/:userId/financial-profile`

### Banca (cuentas, activos y pasivos)

**Cuentas bancarias**
- `POST /users/:userId/bank-accounts`
- `GET /users/:userId/bank-accounts`
- `GET /users/:userId/bank-accounts/:id`
- `PATCH /users/:userId/bank-accounts/:id`
- `DELETE /users/:userId/bank-accounts/:id`

**Activos financieros**
- `POST /users/:userId/financial-assets`
- `GET /users/:userId/financial-assets`
- `GET /users/:userId/financial-assets/:id`
- `PATCH /users/:userId/financial-assets/:id`
- `DELETE /users/:userId/financial-assets/:id`

**Pasivos financieros**
- `POST /users/:userId/financial-liabilities`
- `GET /users/:userId/financial-liabilities`
- `GET /users/:userId/financial-liabilities/:id`
- `PATCH /users/:userId/financial-liabilities/:id`
- `DELETE /users/:userId/financial-liabilities/:id`

### Catálogo (categorías y subcategorías)

**Categorías**
- `POST /catalog/categories`
- `GET /catalog/categories`
- `GET /catalog/categories/:id`
- `PATCH /catalog/categories/:id`

**Subcategorías**
- `POST /users/:userId/catalog/subcategories`
- `GET /users/:userId/catalog/subcategories`
- `GET /users/:userId/catalog/subcategories/:id`
- `PATCH /users/:userId/catalog/subcategories/:id`
- `DELETE /users/:userId/catalog/subcategories/:id`

### Finanzas (transacciones, objetivos y períodos)

**Transacciones**
- `POST /users/:userId/transactions`
- `GET /users/:userId/transactions`
- `GET /users/:userId/transactions/:id`
- `PATCH /users/:userId/transactions/:id`
- `DELETE /users/:userId/transactions/:id`

**Objetivos financieros**
- `POST /users/:userId/financial-objectives`
- `GET /users/:userId/financial-objectives`
- `GET /users/:userId/financial-objectives/:id`
- `PATCH /users/:userId/financial-objectives/:id`
- `DELETE /users/:userId/financial-objectives/:id`

**Pagos de objetivos**
- `POST /users/:userId/financial-objectives/:objectiveId/payments`
- `GET /users/:userId/financial-objectives/:objectiveId/payments`
- `GET /users/:userId/financial-objectives/:objectiveId/payments/:id`
- `DELETE /users/:userId/financial-objectives/:objectiveId/payments/:id`

**Períodos financieros**
- `POST /users/:userId/financial-periods`
- `GET /users/:userId/financial-periods`
- `GET /users/:userId/financial-periods/:id`
- `PATCH /users/:userId/financial-periods/:id/close`

### Noticias

- `GET /news` / `GET /news/:id` — lectura (usuario autenticado).
- `POST /news` / `PATCH /news/:id` / `DELETE /news/:id` — **solo admin**.

### Correo (plantillas + broadcast)

- `GET /email-templates/:key` — obtiene plantilla (custom o default OTP).
- `PUT /email-templates/:key` — crear/actualizar plantilla (**solo admin**).
- `POST /admin/emails/broadcast` — crea un correo tipo noticia (`subject` + `html_body`) y lo envía a **todos los usuarios activos**; persiste la plantilla con key `broadcast_<timestamp>`. Marcadores: `{{name}}`, `{{year}}`. (**solo admin**)

### Auditoría

- `GET /audit`
- `GET /audit/user/:userId`

### Infraestructura transversal

- Filtro global de excepciones HTTP.
- Interceptores globales de respuesta y manejo de errores.
- Servicio de logging con fallback local en la carpeta `logs`.
- Caché Redis para lectura de usuarios.
- Configuración de transporte RabbitMQ al arrancar la aplicación.
- Gateway WebSocket para notificaciones en tiempo real.
- `AdminGuard` restringe endpoints de administración al rol Keycloak `admin`.

## Requisitos

- Node.js 22 recomendado para mantener consistencia con la imagen de Docker.
- PostgreSQL accesible desde la API.
- Redis accesible en el host configurado.
- RabbitMQ accesible para inicializar el microservicio RMQ.
- Keycloak accesible para autenticación y administración de usuarios.

## Variables de entorno

Variables mínimas alineadas con el código actual:

```env
PORT=3000
VERSION=1
NODE_ENV=LOCAL

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=cost_manager

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
USER_CACHE_TTL_MS=60000

RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=cost_manager_queue
RABBITMQ_QUEUE_DURABLE=true

KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cost_manager_realm
KEYCLOAK_CLIENT_ID=cost_manager_api
KEYCLOAK_SECRET=tu_cliente_secreto

COOKIE_SECRET=my-super-secret
CORS_ORIGINS=http://localhost:3000
CSRF_SECRET=csrf-super-secret

# Correo (OTP de recuperación de contraseña). Con MAIL_ENABLED=false el envío
# se registra en logs y no se hace (modo mock para desarrollo).
MAIL_ENABLED=false
MAIL_HOST=smtp.example.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=no-reply@example.com
MAIL_PASS=secret
MAIL_FROM="Cost Manager <no-reply@cost-manager.local>"

LOG_SERVICE_URL=http://localhost:3000
SERVICE_NAME=cost-manager
LOG_MAX_RETRIES=3
APP_DEV=true
```

Si habilitas análisis local con SonarQube, también necesitas completar `sonar-project.properties` con tus credenciales o token.

## Infraestructura local

El `docker-compose.yml` levanta los siguientes servicios auxiliares:

- RabbitMQ en `5672` y panel en [http://localhost:15672](http://localhost:15672)
- Redis en `6379`
- Keycloak en [http://localhost:8080](http://localhost:8080)
- SonarQube en [http://localhost:9000](http://localhost:9000)

PostgreSQL no se levanta en Docker Compose; debes tener una instancia externa disponible.

Para iniciar la infraestructura auxiliar:

```bash
docker-compose up -d
```

## Ejecución local

Instala dependencias:

```bash
npm install --legacy-peer-deps
```

Compila el proyecto:

```bash
npm run build
```

Inicia el backend en modo desarrollo:

```bash
npm run start:dev
```

Con la infraestructura disponible, la API queda expuesta en [http://localhost:3000/api/v1](http://localhost:3000/api/v1) y Swagger en [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs).

Nota operativa: hoy el arranque falla inmediatamente si Redis no responde en el host configurado.

## Testing y calidad

Scripts disponibles:

- `npm test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:e2e`
- `npm run sonar` — lee `SONAR_TOKEN` de `.env.sonar` o del entorno (`scripts/sonar.js`)

Umbral global de cobertura (Jest): **≥80%** en branches, functions, lines y statements.

Flujo sugerido:

```bash
npm run test:cov
npm run sonar
```

## CI / CD (Jenkins)

El `Jenkinsfile` ejecuta:

1. Checkout → Install → Lint → Tests + coverage  
2. SonarQube + Quality Gate  
3. Build Docker image (+ push a Docker Hub en `main`)  
4. **Deploy Vercel** en `main` (`vercel pull` → `build` → `deploy --prebuilt --prod`)

Credenciales Jenkins esperadas: `dockerhub-creds`, `vercel-token`, `vercel-org-id`, `vercel-project-id`.

## Observaciones

- Swagger tags: `auth`, `users`, `admin / users`, `admin / emails`, `financial-profile`, `banking`, `catalog`, `finance`, `audit`, `news`, `mail`, `support`.
- El módulo `intelligence` contiene entidades de resumen y está pendiente de servicios/controladores.
- Plantilla OTP: `src/modules/mail/templates/otp-password-reset.tsx`; plantillas custom y broadcasts en `mail.email_template`.
- Roles Keycloak: ver [`docs/keycloak-roles.md`](docs/keycloak-roles.md).
- Brand / logo / naming: ver [`docs/service-description.md`](docs/service-description.md).
