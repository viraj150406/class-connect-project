pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Deploy') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'classconnect-backend-env',
                        variable: 'BACKEND_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu

                        cp "$BACKEND_ENV_FILE" backend/.env

                        trap 'rm -f backend/.env' EXIT

                        docker-compose -f docker-compose.yml up -d --build --remove-orphans
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "Checking Docker containers..."

                    docker ps

                    echo "Checking backend..."

                    curl -f http://localhost:5001/api/health

                    echo "Checking frontend..."

                    curl -f http://localhost:5173
                '''
            }
        }
    }

    post {
        success {
            echo 'ClassConnect deployed successfully!'
        }

        failure {
            echo 'Deployment failed. Check Console Output.'
        }
    }
}
