# Cost Manager API

Microservicio avanzado construido sobre **NestJS v11** para la administración de finanzas, perfiles y flujos transaccionales. Esta API integra patrones de diseño de software empresarial e implementa soluciones de infraestructura escalables para caché, analítica de calidad de código y gestión identitaria (SSO).

---

## 🛠️ Stack Tecnológico

- **Framework:** NestJS (TypeScript / Node.js)
- **Base de Datos:** PostgreSQL + TypeORM
- **Caché en Memoria:** Redis (`@nestjs/cache-manager`)
- **Autenticación (SSO):** Keycloak
- **Calidad de Código y Seguridad:** SonarQube (LTS Community)
- **Contenerización:** Docker Compose

---

## 🚀 Guía de Inicio

### 1. Variables de Entorno
Clona este repositorio. En la raíz del proyecto, debes configurar tu archivo local `.env` basado en el entorno de desarrollo:

```env
# Ejemplo de variables requeridas
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=tu_secreto
KEYCLOAK_URL=http://localhost:8080/auth
KEYCLOAK_REALM=cost_manager_realm
KEYCLOAK_CLIENT_ID=cost_manager_api
```

*(Si habilitas escaneos estáticos locales también necesitarás crear el archivo `sonar-project.properties` con tu `sonar.login`).*

### 2. Levantar la Infraestructura Aislada (Docker)
Este proyecto incluye un entorno Docker pre-configurado para levantar todos los microservicios satélite que NestJS necesita para orquestarse con éxito.

En la raíz del proyecto, ejecuta la infraestructura auxiliar (Keycloak, Redis y SonarQube) con:

```bash
docker-compose up -d
```

*(Nota: Este entorno asume que manejas PostgreSQL por fuera, por ejemplo, usando un servidor local de PgAdmin. Asegúrate de tener disponible la base de datos `cost_manager` en el puerto `5432`).*

### 3. Levantar la Aplicación (NestJS)

Una vez que los contenedores estén sanos, instala las dependencias de Node. Por las políticas estrictas de Node 18+ y versiones de Keycloak, instala ignorando _peer dependencies_ de legacy bindings:

```bash
npm install --legacy-peer-deps
```

Levanta el servidor local en modo _watch_ de desarrollo:

```bash
npm run start:dev
```

La aplicación central estará escuchando en el puerto 3000:
👉 **http://localhost:3000/api/v1**

---

## 🧪 Testing y Calidad (SonarQube)

El proyecto restringe el código que no cumple con el **80% de un Quality Gate**. 

Para asegurar el paso a entornos productivos y descubrir vulnerabilidades o Code Smells, usa la suite en el siguiente orden:

1. **Generar reporte LCOV:**
   ```bash
   npm run test:cov
   ```

2. **Escanear en SonarQube:**
   *(Asegúrate de que `docker-compose up` esté rodando y hayas agregado tu login).*
   ```bash
   npm run sonar
   ```

Revisa tu dashboard analítico local en [http://localhost:9000](http://localhost:9000).