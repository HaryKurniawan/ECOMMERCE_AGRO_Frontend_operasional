pipeline {
    agent any

    stages {

        // Opsional: aktifkan kalau nanti mau Dependency-Check lagi
        /*
        stage('OWASP Dependency-Check') {
            steps {
                withCredentials([
                    string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')
                ]) {
                    sh '''
                        rm -rf dependency-check-report
                        mkdir -p dependency-check-report

                        docker run --rm \
                          -u $(id -u):$(id -g) \
                          -v "$WORKSPACE:/src" \
                          -v "/var/jenkins_home/dependency-check-data:/usr/share/dependency-check/data" \
                          owasp/dependency-check:latest \
                          --project "Ecommerce Frontend Operasional" \
                          --scan /src \
                          --exclude "**/node_modules/**" \
                          --exclude "**/.next/**" \
                          --exclude "**/coverage/**" \
                          --nvdApiKey "$NVD_API_KEY" \
                          --format "HTML" \
                          --format "JSON" \
                          --out /src/dependency-check-report || true
                    '''
                }
            }
        }
        */

        stage('Build Docker Image') {
            steps {
                withCredentials([
                    file(credentialsId: 'frontend-operasional-env', variable: 'ENV_FILE')
                ]) {
                    sh '''
                        set -e

                        echo "Menyalin environment file..."
                        cp "$ENV_FILE" .env.local

                        echo "Build image frontend operasional..."
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

                        echo "Menghapus container lama..."
                        docker stop agro-frontend-operasional || true
                        docker rm agro-frontend-operasional || true

                        echo "Menjalankan container baru..."
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

                    echo "Memastikan container berjalan..."
                    docker ps \
                      --filter "name=agro-frontend-operasional" \
                      --filter "status=running" \
                      --format "{{.Names}}" | grep -qx "agro-frontend-operasional"

                    echo "Memeriksa HTTP aplikasi..."
                    for i in 1 2 3 4 5; do
                      if curl -fsS http://127.0.0.1:3002/ > /dev/null; then
                        echo "Health check berhasil."
                        exit 0
                      fi

                      echo "Belum siap, mencoba lagi dalam 5 detik..."
                      sleep 5
                    done

                    echo "Health check gagal."
                    docker logs agro-frontend-operasional --tail 100 || true
                    exit 1
                '''
            }
        }

        stage('OWASP ZAP Baseline Scan') {
            steps {
                sh '''
                    set +e

                    echo "Menjalankan OWASP ZAP baseline scan..."
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

                    ZAP_EXIT_CODE=$?

                    echo "ZAP selesai dengan kode: $ZAP_EXIT_CODE"
                    echo "Report tetap akan di-upload ke Jenkins."

                    exit 0
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '''
                dependency-check-report/*.html,
                dependency-check-report/*.json,
                zap-operasional-report.html,
                zap-operasional-report.json
            ''', allowEmptyArchive: true

            sh 'docker image prune -f || true'
        }

        success {
            echo 'Frontend Operasional berhasil dideploy dan security scan selesai.'
        }

        failure {
            echo 'Pipeline gagal. Log container:'
            sh 'docker logs agro-frontend-operasional --tail 100 || true'
        }
    }
}