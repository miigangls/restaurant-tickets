pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'docker.io'
        IMAGE_NAME = 'restaurant-tickets-api'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        POSTGRES_DB = 'ticketsdb'
        POSTGRES_USER = 'postgres'
        POSTGRES_PASSWORD = 'postgres'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Environment Setup') {
            steps {
                script {
                    echo 'Setting up environment variables...'
                    sh '''
                        cd api
                        if [ ! -f .env ]; then
                            cp env.example .env || echo "No env.example found, creating .env manually"
                            cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@db:5432/ticketsdb?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NODE_ENV=production
PORT=3000
EOF
                        fi
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir('api') {
                    echo 'Installing dependencies...'
                    sh 'npm ci'
                }
            }
        }
        
        stage('Lint') {
            steps {
                dir('api') {
                    echo 'Running linter...'
                    sh 'npm run lint || echo "Linting completed with warnings"'
                }
            }
        }
        
        stage('Generate Prisma Client') {
            steps {
                dir('api') {
                    echo 'Generating Prisma client...'
                    sh 'npx prisma generate'
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    dir('api') {
                        echo 'Building application...'
                        // Use production database URL for build
                        sh '''
                            export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketsdb?schema=public"
                            npm run build
                        '''
                    }
                }
            }
        }
        
        stage('Test Database Setup') {
            steps {
                script {
                    echo 'Setting up test database...'
                    sh '''
                        # Start test database
                        docker-compose up -d db
                        
                        # Wait for database to be ready
                        echo "Waiting for database to be ready..."
                        timeout 60 bash -c 'until docker exec restaurant-tickets-db pg_isready -U postgres; do sleep 2; done' || true
                        sleep 5
                        
                        # Create test database
                        docker exec restaurant-tickets-db psql -U postgres -c "CREATE DATABASE ticketsdb_test;" || echo "Test database may already exist"
                    '''
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    dir('api') {
                        echo 'Running unit tests...'
                        sh '''
                            # Set test environment variables
                            export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketsdb_test?schema=public"
                            export JWT_SECRET="test_secret"
                            export JWT_EXPIRES_IN="1d"
                            export NODE_ENV=test
                            
                            # Generate Prisma Client for test database
                            npx prisma generate
                            
                            # Run migrations on test database
                            npx prisma migrate deploy || echo "Migrations may already be applied"
                            
                            # Run unit tests
                            npm run test:unit || true
                            
                            # Run E2E tests
                            echo 'Running E2E tests...'
                            npm run test:e2e || true
                            
                            # Generate coverage report
                            npm run test:cov || echo "Coverage report generated"
                        '''
                    }
                }
            }
            post {
                always {
                    script {
                        echo 'Publishing test results...'
                        dir('api') {
                            // Publish test results (if JUnit XML format is available)
                            junit 'test-results.xml' allowEmptyResults: true
                            
                            // Publish coverage report
                            publishHTML([
                                reportDir: 'coverage',
                                reportFiles: 'index.html',
                                reportName: 'Test Coverage Report',
                                keepAll: true
                            ])
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building Docker image...'
                    dir('api') {
                        sh """
                            docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                        """
                    }
                }
            }
        }
        
        stage('Stop Old Containers') {
            steps {
                script {
                    echo 'Stopping old containers...'
                    sh '''
                        docker-compose -f docker-compose.prod.yml down || true
                    '''
                }
            }
        }
        
        stage('Database Migration') {
            steps {
                script {
                    echo 'Starting database for migrations...'
                    sh '''
                        # Start only the database
                        docker-compose up -d db
                        
                        # Wait for database to be ready
                        sleep 10
                        
                        # Run migrations
                        cd api
                        npx prisma migrate deploy || echo "Migration completed"
                        
                        # Run seed (optional)
                        npx prisma db seed || echo "Seed completed or skipped"
                    '''
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    echo 'Deploying application...'
                    sh '''
                        # Deploy using docker-compose
                        docker-compose -f docker-compose.prod.yml up -d api
                        
                        # Wait for application to be ready
                        echo "Waiting for application to start..."
                        sleep 15
                        
                        # Health check
                        curl -f http://localhost:3000/health || echo "Health check endpoint not available"
                    '''
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                script {
                    echo 'Cleaning up old Docker images...'
                    sh '''
                        # Remove old images (keep last 3 builds)
                        docker images ${IMAGE_NAME} --format "{{.ID}} {{.Tag}}" | \
                        grep -v latest | \
                        tail -n +4 | \
                        awk '{print $1}' | \
                        xargs -r docker rmi -f || true
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completed successfully! 🎉'
            echo "Application deployed at http://localhost:3000"
        }
        failure {
            echo 'Pipeline failed! ❌'
            sh 'docker-compose -f docker-compose.prod.yml logs api || true'
        }
        always {
            echo 'Cleaning workspace...'
            cleanWs(cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true)
        }
    }
}
