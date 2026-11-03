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
                    docker rm -f classconnect-backend classconnect-frontend || true
                    docker-compose -f docker-compose.yml up -d --build --remove-orphans
                '''
            }
        }
    }
    stage('Verify Deployment') {
        steps {
            sh '''
                set -eu
                echo "Waiting for backend..."
                for i in $(seq 1 30); do
                    if curl -fsS http://localhost:5001/api/health; then
                        echo "Backend is healthy!"
                        break
                    fi
                    if [ "$i" -eq 30 ]; then
                        echo "Backend health check failed!"
                        docker logs --tail 100 classconnect-backend
                        exit 1
                    fi
                    sleep 2
                done
                echo "Checking frontend..."
                curl -fsS http://localhost:5173 > /dev/null
                echo "Frontend is healthy!"
            '''
        }
    }
}
post {
    success {
        echo 'ClassConnect CI/CD deployment successful!'
    }
    failure {
        echo 'ClassConnect deployment failed!'
    }
}

}
