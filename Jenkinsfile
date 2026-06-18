pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                sh '''
                docker build -t agro-frontend-operasional .
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                docker stop agro-frontend-operasional || true
                docker rm agro-frontend-operasional || true

                docker run -d \
                --name agro-frontend-operasional \
                --network 1panel-network \
                -p 3002:3004 \
                agro-frontend-operasional
                '''
            }
        }

    }

    post {
        success {
            echo 'Deployment successful!'
        }

        failure {
            echo 'Deployment failed!'
            sh 'docker logs agro-frontend-operasional --tail 100 || true'
        }
    }
}