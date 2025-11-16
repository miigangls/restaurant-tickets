#!/bin/bash

# Restaurant Tickets - Jenkins Setup Script
# This script helps configure Jenkins for the first time

set -e

echo "========================================="
echo "Jenkins Setup for Restaurant Tickets"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Start Jenkins
print_info "Starting Jenkins..."
docker-compose up -d jenkins

print_success "Jenkins is starting..."

# Wait for Jenkins to start
print_info "Waiting for Jenkins to be ready (this may take a minute)..."
sleep 30

# Get initial admin password
print_info "Retrieving initial admin password..."
if docker exec restaurant-tickets-jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null; then
    echo ""
    print_success "Jenkins is ready!"
else
    print_info "Jenkins is still starting. Please wait a moment and run:"
    echo "docker exec restaurant-tickets-jenkins cat /var/jenkins_home/secrets/initialAdminPassword"
fi

echo ""
echo "========================================="
echo "Jenkins Setup Instructions"
echo "========================================="
echo ""
echo "1. Open Jenkins in your browser:"
echo "   http://localhost:8081"
echo ""
echo "2. Use the initial admin password shown above"
echo ""
echo "3. Install suggested plugins"
echo ""
echo "4. Create your first admin user"
echo ""
echo "5. Create a new Pipeline job:"
echo "   - Click 'New Item'"
echo "   - Enter name: 'restaurant-tickets-pipeline'"
echo "   - Select 'Pipeline'"
echo "   - In Pipeline section, select 'Pipeline script from SCM'"
echo "   - SCM: Git"
echo "   - Repository URL: (your git repository or local path)"
echo "   - Script Path: Jenkinsfile"
echo ""
echo "6. Required Jenkins Plugins:"
echo "   - Docker Pipeline"
echo "   - Pipeline"
echo "   - Git"
echo "   - NodeJS (optional)"
echo ""
echo "7. Build the job to run the pipeline!"
echo ""
print_info "For local development without Git, you can paste the Jenkinsfile"
print_info "content directly in the Pipeline script section."
echo ""
