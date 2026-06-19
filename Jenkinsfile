pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                withCredentials([
                    file(credentialsId: 'frontend-operasional-env', variable: 'ENV_FILE')
                ]) {
                    sh '''
                    cp $ENV_FILE .env.local

                    docker build -t agro-frontend-operasional .
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    file(credentialsId: 'frontend-operasional-env', variable: 'ENV_FILE')
                ]) {
                    sh '''
                    docker stop agro-frontend-operasional || true
                    docker rm agro-frontend-operasional || true

                    docker run -d \
                    --name agro-frontend-operasional \
                    --network 1panel-network \
                    --env-file $ENV_FILE \
                    -p 3002:3004 \
                    agro-frontend-operasional
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                sleep 10
                docker ps | grep agro-frontend-operasional
                '''
            }
        }

    }

    post {
        success {
            echo 'Frontend deployment successful!'
        }

        failure {
            echo 'Frontend deployment failed!'
            sh 'docker logs agro-frontend-operasional --tail 100 || true'
        }
    }
}