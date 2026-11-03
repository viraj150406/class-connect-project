pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'docker build -t classconnect-frontend:latest ./frontend'
            }
        }

        stage('Build Backend') {
            steps {
                sh 'docker build -t classconnect-backend:latest ./backend'
            }
        }

        stage('Success') {
            steps {
                echo 'ClassConnect Docker images built successfully!'
            }
        }
    }
}
