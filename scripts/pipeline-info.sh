#!/bin/bash

# Script para obtener información del pipeline de Jenkins
# Uso: ./scripts/pipeline-info.sh [BUILD_NUMBER]

set -e

JENKINS_URL="${JENKINS_URL:-http://localhost:8081}"
JOB_NAME="restaurant-tickets-pipeline"
BUILD_NUMBER="${1:-lastBuild}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que Jenkins esté accesible
if ! curl -s "${JENKINS_URL}" > /dev/null; then
    print_error "No se puede conectar a Jenkins en ${JENKINS_URL}"
    echo "Asegúrate de que Jenkins esté corriendo: docker-compose up -d jenkins"
    exit 1
fi

print_header "Información del Pipeline - Restaurant Tickets"

# Obtener información del build
BUILD_URL="${JENKINS_URL}/job/${JOB_NAME}/${BUILD_NUMBER}"
BUILD_API="${BUILD_URL}/api/json"

print_info "Obteniendo información del build..."
BUILD_INFO=$(curl -s "${BUILD_API}")

if [ -z "$BUILD_INFO" ] || echo "$BUILD_INFO" | grep -q "Not Found"; then
    print_error "Build no encontrado"
    exit 1
fi

# Parsear información
BUILD_NUM=$(echo "$BUILD_INFO" | grep -o '"number":[0-9]*' | cut -d':' -f2)
BUILD_RESULT=$(echo "$BUILD_INFO" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
BUILD_DURATION=$(echo "$BUILD_INFO" | grep -o '"duration":[0-9]*' | cut -d':' -f2)
BUILD_TIMESTAMP=$(echo "$BUILD_INFO" | grep -o '"timestamp":[0-9]*' | cut -d':' -f2)

# Convertir duración a segundos
DURATION_SEC=$((BUILD_DURATION / 1000))

# Convertir timestamp a fecha legible
BUILD_DATE=$(date -d "@$((BUILD_TIMESTAMP / 1000))" 2>/dev/null || date -r "$((BUILD_TIMESTAMP / 1000))" 2>/dev/null || echo "N/A")

print_header "Estado del Build"

echo "Build Number: #${BUILD_NUM}"
echo "Resultado: ${BUILD_RESULT:-Running}"
echo "Duración: ${DURATION_SEC}s"
echo "Fecha: ${BUILD_DATE}"
echo "URL: ${BUILD_URL}"

# Obtener información de stages
print_header "Etapas del Pipeline"

STAGES_API="${BUILD_URL}/wfapi/describe"
STAGES_INFO=$(curl -s "${STAGES_API}")

if [ ! -z "$STAGES_INFO" ]; then
    echo "$STAGES_INFO" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read stage; do
        STATUS=$(echo "$STAGES_INFO" | grep -A 10 "\"name\":\"$stage\"" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 | head -1)
        DURATION=$(echo "$STAGES_INFO" | grep -A 10 "\"name\":\"$stage\"" | grep -o '"durationMillis":[0-9]*' | cut -d':' -f2 | head -1)
        
        if [ ! -z "$DURATION" ]; then
            DURATION_SEC=$((DURATION / 1000))
            case "$STATUS" in
                "SUCCESS")
                    print_success "$stage (${DURATION_SEC}s)"
                    ;;
                "FAILED")
                    print_error "$stage (${DURATION_SEC}s)"
                    ;;
                "IN_PROGRESS")
                    print_info "$stage (ejecutándose...)"
                    ;;
                *)
                    echo "  - $stage: $STATUS"
                    ;;
            esac
        fi
    done
fi

# Obtener tests
print_header "Resultados de Tests"

TESTS_API="${BUILD_URL}/testReport/api/json"
TESTS_INFO=$(curl -s "${TESTS_API}")

if [ ! -z "$TESTS_INFO" ] && ! echo "$TESTS_INFO" | grep -q "Not Found"; then
    TOTAL=$(echo "$TESTS_INFO" | grep -o '"totalCount":[0-9]*' | cut -d':' -f2)
    PASSED=$(echo "$TESTS_INFO" | grep -o '"passCount":[0-9]*' | cut -d':' -f2)
    FAILED=$(echo "$TESTS_INFO" | grep -o '"failCount":[0-9]*' | cut -d':' -f2)
    SKIPPED=$(echo "$TESTS_INFO" | grep -o '"skipCount":[0-9]*' | cut -d':' -f2)
    
    echo "Total: $TOTAL"
    print_success "Pasados: $PASSED"
    if [ "$FAILED" -gt 0 ]; then
        print_error "Fallidos: $FAILED"
    else
        echo "Fallidos: $FAILED"
    fi
    echo "Omitidos: $SKIPPED"
    
    if [ ! -z "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
        PERCENTAGE=$((PASSED * 100 / TOTAL))
        echo "Tasa de éxito: ${PERCENTAGE}%"
    fi
else
    print_info "No hay información de tests disponible"
fi

# Información de contenedores
print_header "Estado de Contenedores"

if command -v docker &> /dev/null; then
    echo "Contenedores Docker:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "restaurant-tickets|NAMES" || echo "No hay contenedores corriendo"
    
    echo ""
    echo "Imágenes Docker:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "restaurant-tickets-api" || echo "No hay imágenes encontradas"
else
    print_info "Docker no está disponible"
fi

# Health check
print_header "Health Check"

if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1; then
    print_success "API está respondiendo correctamente"
    curl -s "http://localhost:3000/health" | head -5
else
    print_error "API no está respondiendo en http://localhost:3000/health"
fi

# Enlaces útiles
print_header "Enlaces Útiles"

echo "Jenkins Dashboard: ${JENKINS_URL}"
echo "Build Details: ${BUILD_URL}"
echo "Console Output: ${BUILD_URL}/console"
echo "Test Report: ${BUILD_URL}/testReport"
echo "API Health: http://localhost:3000/health"
echo "API Docs: http://localhost:3000/docs"

echo ""

