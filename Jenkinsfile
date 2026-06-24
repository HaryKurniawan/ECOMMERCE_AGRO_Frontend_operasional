pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                withCredentials([
                    file(credentialsId: 'frontend-operasional-env', variable: 'ENV_FILE')
                ]) {
                    sh '''
                        set -e
                        cp "$ENV_FILE" .env.local
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
                        set -e

                        docker stop agro-frontend-operasional || true
                        docker rm agro-frontend-operasional || true

                        docker run -d \
                          --name agro-frontend-operasional \
                          --restart unless-stopped \
                          --network 1panel-network \
                          --env-file "$ENV_FILE" \
                          -p 3002:3004 \
                          agro-frontend-operasional
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    echo "Menunggu aplikasi menyala..."
                    sleep 10

                    docker ps \
                      --filter "name=agro-frontend-operasional" \
                      --filter "status=running" \
                      --format "{{.Names}}" | grep -qx "agro-frontend-operasional"

                    for i in 1 2 3 4 5; do
                      if curl -fsS http://127.0.0.1:3002/ > /dev/null; then
                        echo "Health check berhasil."
                        exit 0
                      fi

                      echo "Belum siap, coba lagi 5 detik..."
                      sleep 5
                    done

                    docker logs agro-frontend-operasional --tail 100 || true
                    exit 1
                '''
            }
        }

        stage('OWASP ZAP Baseline Scan') {
            steps {
                sh '''
                    set +e

                    rm -f zap-operasional-report.html zap-operasional-report.json

                    docker run --rm \
                      --network host \
                      -v "$WORKSPACE:/zap/wrk:rw" \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap-baseline.py \
                      -t http://127.0.0.1:3002/ \
                      -r zap-operasional-report.html \
                      -J zap-operasional-report.json \
                      -I

                    echo "ZAP scan selesai."
                    exit 0
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'zap-operasional-report.html,zap-operasional-report.json', allowEmptyArchive: true
        }

        success {
            echo 'Deploy Frontend Operasional dan ZAP baseline scan selesai.'
        }

        failure {
            echo 'Pipeline gagal. Menampilkan log container:'
            sh 'docker logs agro-frontend-operasional --tail 100 || true'
        }
    }
}