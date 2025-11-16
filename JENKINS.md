# Jenkins CI/CD Configuration

Este documento describe cómo configurar y usar Jenkins para el proyecto Restaurant Tickets.

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Proyecto clonado localmente
- Puertos 8081 y 50000 disponibles

## 🚀 Inicio Rápido

### 1. Iniciar Jenkins

```bash
# Opción 1: Usar el script de configuración
chmod +x jenkins-setup.sh
./jenkins-setup.sh

# Opción 2: Usar docker-compose directamente
docker-compose up -d jenkins
```

### 2. Acceder a Jenkins

1. Abrir en el navegador: http://localhost:8081
2. Obtener la contraseña inicial:

```bash
docker exec restaurant-tickets-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 3. Configuración Inicial

1. Pegar la contraseña inicial
2. Seleccionar "Install suggested plugins"
3. Crear usuario administrador
4. Configurar URL de Jenkins (dejar por defecto: http://localhost:8081)

## 🔧 Configurar el Pipeline

### Opción A: Pipeline desde SCM (Repositorio Git)

1. **Nuevo Job**

   - Click en "New Item"
   - Nombre: `restaurant-tickets-pipeline`
   - Tipo: "Pipeline"
   - Click "OK"

2. **Configuración del Pipeline**
   - En la sección "Pipeline":
     - Definition: `Pipeline script from SCM`
     - SCM: `Git`
     - Repository URL: `(URL de tu repositorio)`
     - Branch: `*/main` (o tu rama principal)
     - Script Path: `Jenkinsfile`
   - Click "Save"

### Opción B: Pipeline Script Directo (Para desarrollo local)

1. **Nuevo Job**

   - Click en "New Item"
   - Nombre: `restaurant-tickets-pipeline`
   - Tipo: "Pipeline"
   - Click "OK"

2. **Configuración del Pipeline**
   - En la sección "Pipeline":
     - Definition: `Pipeline script`
     - Copiar el contenido de `Jenkinsfile` en el campo "Script"
   - Click "Save"

## 📦 Plugins Necesarios

Los siguientes plugins son necesarios para ejecutar el pipeline:

- **Pipeline** (instalado por defecto)
- **Docker Pipeline** - Para construir y ejecutar contenedores Docker
- **Git** (instalado por defecto)
- **Workspace Cleanup Plugin** - Para limpiar el workspace

### Instalar Plugins

1. Ir a "Manage Jenkins" → "Manage Plugins"
2. Tab "Available"
3. Buscar y seleccionar los plugins necesarios
4. Click "Install without restart"

## 🏗️ Estructura del Pipeline

El pipeline incluye las siguientes etapas:

1. **Checkout** - Obtiene el código fuente
2. **Environment Setup** - Configura variables de entorno
3. **Install Dependencies** - Instala dependencias de npm
4. **Lint** - Ejecuta el linter
5. **Generate Prisma Client** - Genera el cliente de Prisma
6. **Build** - Compila la aplicación
7. **Test** - Ejecuta las pruebas
8. **Build Docker Image** - Construye la imagen Docker
9. **Stop Old Containers** - Detiene contenedores antiguos
10. **Database Migration** - Ejecuta migraciones de base de datos
11. **Deploy** - Despliega la aplicación
12. **Clean Up** - Limpia imágenes antiguas

## 🔄 Ejecutar el Pipeline

### Desde Jenkins UI

1. Ir a tu job `restaurant-tickets-pipeline`
2. Click "Build Now"
3. Ver el progreso en "Build History"
4. Click en el número de build para ver detalles
5. Click en "Console Output" para ver logs detallados

### Configurar Webhooks (Opcional)

Para ejecutar el pipeline automáticamente en cada push:

1. En la configuración del job:

   - Sección "Build Triggers"
   - Marcar "GitHub hook trigger for GITScm polling" (para GitHub)
   - O "Poll SCM" con schedule: `H/5 * * * *` (revisa cada 5 minutos)

2. Configurar webhook en GitHub/GitLab:
   - URL: `http://your-server:8081/github-webhook/`
   - Content type: `application/json`
   - Events: `Just the push event`

## 🐳 Variables de Entorno

El pipeline usa las siguientes variables de entorno (configurables en Jenkinsfile):

```groovy
environment {
    DOCKER_REGISTRY = 'docker.io'
    IMAGE_NAME = 'restaurant-tickets-api'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    POSTGRES_DB = 'ticketsdb'
    POSTGRES_USER = 'postgres'
    POSTGRES_PASSWORD = 'postgres'
}
```

### Configurar Credenciales Seguras

Para producción, es recomendable usar Jenkins Credentials:

1. Ir a "Manage Jenkins" → "Manage Credentials"
2. Click en "(global)"
3. Click "Add Credentials"
4. Agregar:
   - Database password
   - JWT Secret
   - Docker registry credentials (si usas registry privado)

Luego actualizar el Jenkinsfile:

```groovy
environment {
    POSTGRES_PASSWORD = credentials('postgres-password')
    JWT_SECRET = credentials('jwt-secret')
}
```

## 📊 Monitoreo y Logs

### Ver logs de la aplicación

```bash
# Logs del API
docker-compose -f docker-compose.prod.yml logs -f api

# Logs de Jenkins
docker-compose logs -f jenkins

# Logs de la base de datos
docker-compose -f docker-compose.prod.yml logs -f db
```

### Verificar estado de los contenedores

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Health Check

```bash
# Verificar que la API está funcionando
curl http://localhost:3000/health

# Verificar documentación de la API
curl http://localhost:3000/api
```

## 🔐 Configuración de Seguridad

### Cambiar puerto de Jenkins (si es necesario)

Editar `docker-compose.yml`:

```yaml
jenkins:
  ports:
    - "9090:8080" # Cambiar puerto externo
    - "50000:50000"
```

### Habilitar autenticación en Adminer

Editar `docker-compose.prod.yml` para agregar variables de entorno de seguridad.

## 🚨 Troubleshooting

### Jenkins no inicia

```bash
# Ver logs de Jenkins
docker logs restaurant-tickets-jenkins

# Reiniciar Jenkins
docker-compose restart jenkins
```

### Error de permisos con Docker

El contenedor Jenkins corre como root para poder acceder al Docker socket. Si hay problemas:

```bash
# Verificar permisos del socket
ls -l /var/run/docker.sock

# En el host, agregar permisos (si es necesario)
sudo chmod 666 /var/run/docker.sock
```

### Pipeline falla en stage de Database Migration

```bash
# Verificar que la base de datos está corriendo
docker-compose ps db

# Verificar logs de la base de datos
docker-compose logs db

# Intentar migración manual
cd api
npx prisma migrate deploy
```

### No se puede acceder a la aplicación después del deployment

```bash
# Verificar que los contenedores están corriendo
docker-compose -f docker-compose.prod.yml ps

# Verificar logs del API
docker-compose -f docker-compose.prod.yml logs api

# Verificar que el puerto no está ocupado
lsof -i :3000
```

## 📝 Scripts Útiles

### deploy.sh

Script de deployment manual:

```bash
chmod +x deploy.sh
./deploy.sh
```

Este script:

- Detiene contenedores existentes
- Inicia la base de datos
- Ejecuta migraciones
- Inicia la API
- Verifica health check

### jenkins-setup.sh

Script para configuración inicial de Jenkins:

```bash
chmod +x jenkins-setup.sh
./jenkins-setup.sh
```

## 🔄 Workflow Recomendado

1. **Desarrollo Local**

   ```bash
   cd api
   npm install
   npm run start:dev
   ```

2. **Commit y Push**

   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin main
   ```

3. **Jenkins Pipeline**

   - Se activa automáticamente (con webhook)
   - O ejecutar manualmente desde Jenkins UI

4. **Verificar Deployment**
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 Referencias

- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Docker Pipeline Plugin](https://plugins.jenkins.io/docker-workflow/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🤝 Contribuir

Para agregar nuevas etapas al pipeline:

1. Editar `Jenkinsfile`
2. Agregar el nuevo stage:

```groovy
stage('Nuevo Stage') {
    steps {
        script {
            echo 'Ejecutando nuevo stage...'
            // Tu código aquí
        }
    }
}
```

3. Commit y push
4. Ejecutar el pipeline para probar

## 📞 Soporte

Para problemas o preguntas:

- Revisar logs: `docker-compose logs -f`
- Verificar documentación de Jenkins
- Revisar issues en el repositorio
