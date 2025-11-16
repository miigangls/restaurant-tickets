pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo "Obteniendo código desde GitHub..."
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo "Construyendo la aplicación..."
                sh 'echo "Simulación de build completada"'
            }
        }

        stage('Test') {
            steps {
                echo "Ejecutando pruebas..."
                sh 'echo "Simulación de pruebas exitosas"'
            }
        }

        stage('Deploy') {
            steps {
                echo "Realizando despliegue..."
                sh 'echo "Simulación de despliegue exitoso"'
            }
        }
    }

    post {
        success {
            echo "Pipeline completado correctamente."
        }
        failure {
            echo "El pipeline falló."
        }
    }
}
