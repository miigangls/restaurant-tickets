# Restaurant Tickets API

Sistema de venta y gestión de tickets de restaurante construido con NestJS, Prisma, PostgreSQL y Docker.

## 📋 Descripción

API REST para gestión de tickets (productos del menú), órdenes y pagos de restaurante. Incluye autenticación JWT, validaciones, documentación Swagger y CI/CD.

## 🏗️ Módulos

- **Auth**: Registro y login con JWT
- **Users**: Gestión de usuarios y perfiles
- **Tickets**: Catálogo de productos del menú
- **Orders**: Creación de órdenes con cálculo automático de impuestos (19%)
- **Payments**: Procesamiento de pagos simulados

## 📦 Requisitos Previos

- Node.js 20+
- Docker y Docker Compose
- npm o yarn

## 🚀 Cómo Correr en Local

### 1. Iniciar servicios (DB y Adminer)

```bash
docker compose up -d
```

### 2. Configurar variables de entorno

```bash
cp api/.env.example api/.env
```

### 3. Instalar dependencias y configurar base de datos

```bash
cd api
npm ci
npx prisma generate
npm run migrate
npm run seed
```

### 4. Iniciar servidor de desarrollo

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000` y la documentación Swagger en `http://localhost:3000/docs`.

## 📚 Documentación API

Una vez iniciada la aplicación, accede a la documentación Swagger en:
- **Desarrollo**: `http://localhost:3000/docs`

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con cobertura
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev        # Inicia en modo desarrollo con hot-reload

# Producción
npm run build            # Compila la aplicación
npm start                # Inicia en modo producción

# Base de datos
npm run migrate          # Ejecuta migraciones
npm run prisma:generate  # Genera Prisma Client
npm run seed             # Pobla la base de datos

# Calidad de código
npm run lint             # Ejecuta ESLint
npm run format           # Formatea código con Prettier

# Docker
npm run start:docker     # Construye y ejecuta en Docker
```

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT. Para autenticarte:

1. Registra un usuario en `POST /auth/register` o usa las credenciales del seed:
   - Admin: `admin@demo.com` / `Admin123!`

2. Realiza login en `POST /auth/login`

3. Usa el token recibido en el header:
   ```
   Authorization: Bearer <token>
   ```

## 🌐 Endpoints Principales

### Auth
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login

### Tickets (Públicos)
- `GET /tickets` - Listar tickets activos
- `GET /tickets/:id` - Obtener ticket por ID

### Tickets (Protegidos, ADMIN recomendado)
- `POST /tickets` - Crear ticket
- `PATCH /tickets/:id` - Actualizar ticket
- `DELETE /tickets/:id` - Eliminar ticket (soft delete)

### Orders (Protegidos)
- `POST /orders` - Crear orden
- `GET /orders/me` - Obtener órdenes del usuario actual
- `GET /orders/:id` - Obtener orden por ID

### Payments (Protegidos)
- `POST /payments` - Registrar pago
- `GET /payments/:id` - Obtener pago por ID

### Users (Protegidos)
- `GET /users/me` - Obtener perfil actual
- `GET /users/:id` - Obtener usuario por ID
- `PATCH /users/me` - Actualizar perfil

## 🐳 Despliegue con Docker

### Desarrollo

```bash
docker compose up -d
```

### Producción

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Estructura de Base de Datos

### Modelos principales:
- **User**: Usuarios del sistema (roles: ADMIN, CUSTOMER)
- **Ticket**: Productos del menú (catálogo)
- **Order**: Órdenes de pedidos
- **OrderItem**: Items dentro de una orden
- **Payment**: Pagos asociados a órdenes

## 🔄 CI/CD

El proyecto incluye GitHub Actions workflow que ejecuta:
- Instalación de dependencias
- Generación de Prisma Client
- Migraciones de base de datos
- Build de la aplicación
- Tests

## 📝 Estándares de Calidad

- Código comentado solo donde aporta contexto
- DTOs fuertemente tipados con class-validator
- Errores claros (BadRequest, Unauthorized, etc.)
- No secretos en el repo; usar .env.example
- Commits atómicos y descriptivos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
