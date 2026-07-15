pipeline {
    agent any

    environment {
        // Atur port dan nama container
        APP_PORT = "3004"
        CONTAINER_NAME = "agro-frontend-operasional"
        ENV_CRED_ID = "agro_env_frontend_ops"
        IMAGE_NAME = "${CONTAINER_NAME}-image"
    }

    stages {
        // stage('OWASP Dependency-Check') { ... }

        stage('Build Docker Image') {
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CRED_ID}", variable: 'ENV_FILE')
                ]) {
                    sh '''
                    # Hapus sisa file lama (jika ada) untuk mencegah Permission Denied
                    rm -f .env.local || true
                    cp $ENV_FILE .env.local
                    docker build -t ${IMAGE_NAME} .
                    '''
                }
            }
        }

        stage('Deploy (Safe Restart)') {
            steps {
                sh '''
                TEST_CONTAINER="${CONTAINER_NAME}-tester"
                
                echo "=== Memulai Proses Deploy Anti-Downtime ==="
                docker rm -f $TEST_CONTAINER || true

                echo "1. Menyalakan versi baru di latar belakang..."
                docker run -d \
                --name $TEST_CONTAINER \
                --network agro-network \
                --env-file .env.local \
                ${IMAGE_NAME}

                echo "2. Menunggu 10 detik..."
                sleep 10

                if [ "$(docker inspect -f '{{.State.Running}}' $TEST_CONTAINER)" = "true" ]; then
                    echo "3. UJI COBA SUKSES! Mengalihkan traffic..."
                    docker rm -f ${CONTAINER_NAME} || true
                    docker rm -f $TEST_CONTAINER || true
                    
                    docker run -d \
                    --name ${CONTAINER_NAME} \
                    --network agro-network \
                    --env-file .env.local \
                    --restart always \
                    -p ${APP_PORT}:3004 \
                    ${IMAGE_NAME}

                    echo "=== Deploy ${CONTAINER_NAME} BERHASIL ==="
                else
                    echo "=== GAGAL: Aplikasi baru crash ==="
                    docker logs $TEST_CONTAINER
                    docker rm -f $TEST_CONTAINER
                    exit 1
                fi
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'dependency-check-report/*.html', allowEmptyArchive: true
        }
        success {
            echo "${CONTAINER_NAME} deployment successful!"
        }
        failure {
            echo "${CONTAINER_NAME} deployment failed!"
            sh 'docker logs ${CONTAINER_NAME} --tail 100 || true'
        }
    }
}