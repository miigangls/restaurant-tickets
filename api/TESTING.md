# Guía de Testing

Este documento describe cómo ejecutar las pruebas automatizadas del proyecto.

## Tipos de Tests

### Tests Unitarios

Los tests unitarios prueban componentes individuales (servicios, controladores) de forma aislada usando mocks.

**Ubicación**: `src/**/*.spec.ts`

**Ejecutar**:

```bash
npm run test:unit
```

### Tests E2E (End-to-End)

Los tests E2E prueban la aplicación completa, incluyendo la base de datos.

**Ubicación**: `test/**/*.e2e-spec.ts`

**Ejecutar**:

```bash
npm run test:e2e
```

## Configuración de Base de Datos para Tests

Los tests E2E requieren una base de datos PostgreSQL. Por defecto, se usa la base de datos `ticketsdb_test`.

### Configuración Manual

1. Asegúrate de que PostgreSQL esté corriendo:

```bash
docker-compose up -d db
```

2. Crea la base de datos de prueba:

```bash
docker exec restaurant-tickets-db psql -U postgres -c "CREATE DATABASE ticketsdb_test;"
```

3. Configura las variables de entorno:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketsdb_test?schema=public"
export JWT_SECRET="test_secret"
export JWT_EXPIRES_IN="1d"
export NODE_ENV=test
```

4. Ejecuta las migraciones:

```bash
npx prisma migrate deploy
```

5. Ejecuta los tests:

```bash
npm run test:e2e
```

## Scripts Disponibles

- `npm test` - Ejecuta todos los tests unitarios
- `npm run test:watch` - Ejecuta tests en modo watch
- `npm run test:unit` - Ejecuta solo tests unitarios
- `npm run test:e2e` - Ejecuta solo tests E2E
- `npm run test:cov` - Ejecuta tests y genera reporte de cobertura
- `npm run test:ci` - Ejecuta tests en modo CI (con cobertura y workers limitados)

## Ejecutar Tests en Jenkins

El pipeline de Jenkins ejecuta automáticamente:

1. **Setup de Base de Datos**: Inicia la base de datos y crea `ticketsdb_test`
2. **Tests Unitarios**: Ejecuta todos los tests unitarios
3. **Tests E2E**: Ejecuta los tests end-to-end
4. **Coverage Report**: Genera y publica el reporte de cobertura

## Estructura de Tests

```
api/
├── src/
│   ├── auth/
│   │   └── auth.service.spec.ts      # Tests unitarios de AuthService
│   ├── tickets/
│   │   └── tickets.service.spec.ts   # Tests unitarios de TicketsService
│   ├── orders/
│   │   └── orders.service.spec.ts    # Tests unitarios de OrdersService
│   ├── payments/
│   │   └── payments.service.spec.ts   # Tests unitarios de PaymentsService
│   └── users/
│       └── users.service.spec.ts       # Tests unitarios de UsersService
└── test/
    ├── setup.ts                       # Utilidades para tests E2E
    ├── setup-jest.ts                  # Configuración global de Jest
    ├── auth.e2e-spec.ts               # Tests E2E de autenticación
    ├── tickets.e2e-spec.ts            # Tests E2E de tickets
    └── orders.e2e-spec.ts             # Tests E2E de órdenes
```

## Cobertura de Tests

Los tests cubren:

- ✅ Autenticación (registro, login)
- ✅ Gestión de tickets (CRUD)
- ✅ Creación de órdenes
- ✅ Cálculo de impuestos (19%)
- ✅ Validación de stock
- ✅ Gestión de pagos
- ✅ Validaciones de entrada
- ✅ Manejo de errores

## Troubleshooting

### Error: "Cannot connect to database"

- Verifica que PostgreSQL esté corriendo: `docker-compose ps`
- Verifica la variable `DATABASE_URL`
- Asegúrate de que la base de datos de prueba exista

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Error: "Migrations not applied"

```bash
npx prisma migrate deploy
```

### Limpiar base de datos de prueba

```bash
docker exec restaurant-tickets-db psql -U postgres -c "DROP DATABASE IF EXISTS ticketsdb_test;"
docker exec restaurant-tickets-db psql -U postgres -c "CREATE DATABASE ticketsdb_test;"
```
