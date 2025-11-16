#!/bin/bash

# Restaurant Tickets - Deployment Script
# This script handles the deployment of the application

set -e

echo "========================================="
echo "Restaurant Tickets - Deployment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
APP_NAME="restaurant-tickets"

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

print_success "Docker compose file found"

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down || true
print_success "Containers stopped"

# Pull latest images (if using registry)
# print_info "Pulling latest images..."
# docker-compose -f $COMPOSE_FILE pull || true

# Start database first
print_info "Starting database..."
docker-compose -f $COMPOSE_FILE up -d db
print_success "Database started"

# Wait for database to be ready
print_info "Waiting for database to be ready..."
sleep 10

# Check database health
max_retries=30
counter=0
until docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -eq $max_retries ]; then
        print_error "Database failed to start after $max_retries attempts"
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""
print_success "Database is ready"

# Run database migrations
print_info "Running database migrations..."
cd api
if npx prisma migrate deploy; then
    print_success "Migrations completed"
else
    print_error "Migrations failed"
    exit 1
fi

# Run database seed (optional)
print_info "Seeding database..."
if npx prisma db seed; then
    print_success "Database seeded"
else
    print_info "Database seed skipped or already seeded"
fi

cd ..

# Start API
print_info "Starting API..."
docker-compose -f $COMPOSE_FILE up -d api
print_success "API started"

# Wait for API to be ready
print_info "Waiting for API to be ready..."
sleep 15

# Health check
print_info "Running health check..."
max_retries=30
counter=0
until curl -f http://localhost:3000/health > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -eq $max_retries ]; then
        print_error "API health check failed after $max_retries attempts"
        print_info "Checking API logs..."
        docker-compose -f $COMPOSE_FILE logs api
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""
print_success "API is healthy"

# Show running containers
print_info "Running containers:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "========================================="
print_success "Deployment completed successfully!"
echo "========================================="
echo ""
echo "Application URLs:"
echo "  - API: http://localhost:3000"
echo "  - API Docs: http://localhost:3000/api"
echo "  - Adminer (DB): http://localhost:8080"
echo "  - Jenkins: http://localhost:8081"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  - Stop all: docker-compose -f $COMPOSE_FILE down"
echo "  - Restart API: docker-compose -f $COMPOSE_FILE restart api"
echo ""
