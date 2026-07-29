# Cost Manager API

Backend en NestJS v11 para autenticación, gestión financiera personal y administración de usuarios. El servicio integra PostgreSQL, Redis, Keycloak, RabbitMQ y Swagger; además incluye cobertura de pruebas unitarias y análisis estático con SonarQube.

## Estado actual

Estado verificado el 26 de abril de 2026 sobre esta rama:

- La aplicación compila correctamente con `npm run build`.
- El arranque en desarrollo alcanza la inicialización de Nest, pero falla si Redis no está disponible localmente.
- El bootstrap conecta Redis, Keycloak, PostgreSQL y un microservicio RabbitMQ; no es un backend standalone sin infraestructura.
- Swagger se publica en `/api/v{VERSION}/docs`.
- Están implementados los módulos `auth`, `identity`, `banking`, `catalog`, `finance`, `audit` y `notification`.
- La suite unitaria está mayormente verde, pero `npm test -- --runInBand` sigue fallando en `test/modules/indetity/controllers/user.controller.spec.ts` por resolución de dependencias de `AuthGuard` en el test.

## Stack tecnológico

- Framework: NestJS 11
- Runtime: Node.js / TypeScript
- Base de datos: PostgreSQL con TypeORM
- Caché: Redis con `@nestjs/cache-manager`
- Mensajería: RabbitMQ con `@nestjs/microservices`
- WebSockets: Gateway de notificaciones con `@nestjs/websockets`
- Identidad: Keycloak
- Documentación: Swagger
- Calidad: Jest, cobertura LCOV, SonarQube
- Contenedores: Docker Compose

## Estructura del proyecto

```
src/
├── app.module.ts
├── main.ts
├── config/                          # Configuraciones globales
│   ├── cors.config.ts
│   ├── csrf.config.ts
│   ├── data-source.ts
│   ├── database.config.ts
│   ├── helmet.config.ts
│   ├── keycloak.config.ts
│   ├── rabbitmq.config.ts
│   ├── redis.config.ts
│   └── swagger.config.ts
├── modules/
│   ├── audit/                       # Registro de auditoría
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── service/
│   ├── auth/                        # Autenticación con Keycloak
│   │   ├── controller/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── interfaces/
│   │   └── service/
│   ├── banking/                     # Cuentas bancarias, activos y pasivos
│   │   ├── controller/
│   │   ├── dto/
│   │   │   ├── bank-account/
│   │   │   ├── financial-asset/
│   │   │   └── financial-liability/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── service/
│   ├── catalog/                     # Categorías y subcategorías
│   │   ├── controller/
│   │   ├── dto/
│   │   │   ├── category/
│   │   │   └── subcategory/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── service/
│   ├── finance/                     # Transacciones, objetivos y períodos
│   │   ├── controller/
│   │   ├── dto/
│   │   │   ├── financial-objective/
│   │   │   ├── financial-period/
│   │   │   ├── objective-payment/
│   │   │   └── transaction-record/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── service/
│   ├── identity/                    # Usuarios y perfiles financieros
│   │   ├── controller/
│   │   ├── dto/
│   │   │   ├── financial-profile/
│   │   │   └── user/
│   │   ├── entities/
│   │   ├── interfaces/
│   │   ├── repositories/
│   │   └── service/
│   ├── intelligence/                # Entidades de resumen financiero (en desarrollo)
│   │   └── entities/
│   └── notification/                # Gateway WebSocket de notificaciones
│       ├── constants/
│       ├── filters/
│       ├── gateway/
│       ├── interfaces/
│       └── service/
├── shared/                          # Módulo compartido transversal
│   ├── dto/
│   ├── enums/
│   ├── filters/
│   ├── helpers/
│   ├── interceptors/
│   └── services/
└── test/                            # Pruebas unitarias
    ├── config/
    ├── modules/
    │   ├── auth/
    │   │   ├── controllers/
    │   │   ├── decorators/
    │   │   ├── guards/
    │   │   └── services/
    │   └── indetity/
    │       ├── controllers/
    │       ├── repositories/
    │       └── services/
    └── shared/
        ├── filters/
        ├── helpers/
        ├── interceptors/
        └── services/
```

## Funcionalidad implementada

### Autenticación

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/introspect`

### Identidad (usuarios)

- `POST /user`
- `GET /user`
- `GET /user/:id`
- `PATCH /user/:id`
- `GET /user/public/status`

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
- `npm run sonar`

Estado observado:

- `npm run build`: OK.
- `npm test -- --runInBand`: falla en pruebas del controlador de usuarios por dependencias no resueltas de `AuthGuard`.
- `test/config/rabbitmq.config.spec.ts`: pasa.

Flujo sugerido para calidad:

```bash
npm run test:cov
```

```bash
npm run sonar
```

## Observaciones

- El proyecto usa Swagger con las etiquetas `auth`, `users`, `financial-profile`, `banking`, `catalog`, `finance` y `audit`.
- El módulo `intelligence` contiene únicamente entidades (`financial-summary`, `summary-category-breakdown`, `tax-summary`) y está pendiente de implementación de servicios y controladores.
- El directorio de pruebas de identidad mantiene el nombre `indetity` en varios archivos; el README conserva esa referencia al describir el fallo actual porque así está en el repositorio.
