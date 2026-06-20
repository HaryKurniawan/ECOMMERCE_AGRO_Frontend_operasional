pipeline {
    agent any

    stages {

        // stage('OWASP Dependency-Check') {
        //     steps {
        //         withCredentials([
        //             string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')
        //         ]) {
        //             sh '''
        //             if [ -n "$NVD_API_KEY" ]; then
        //               echo "API Key ditemukan"
        //             else
        //               echo "API Key kosong"
        //               exit 1
        //             fi
                    
        //             echo "Running OWASP Dependency-Check for Frontend Operasional..."
        //             docker run --rm \\
        //                 -u \$(id -u):\$(id -g) \\
        //                 -v "\$(pwd):/src" \\
        //                 -v "/var/jenkins_home/dependency-check-data:/usr/share/dependency-check/data" \\
        //                 owasp/dependency-check:latest \\
        //                 --project "Ecommerce Frontend Operasional" \\
        //                 --scan /src \\
        //                 --exclude "**/node_modules/**" \\
        //                 --exclude "**/.next/**" \\
        //                 --exclude "**/coverage/**" \\
        //                 --nvdApiKey \$NVD_API_KEY \\
        //                 --format "HTML" \\
        //                 --format "JSON" \\
        //                 --out /src/dependency-check-report || true
        //             '''
        //         }
        //     }
        // }

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
        always {
            dependencyCheckPublisher pattern: 'dependency-check-report/dependency-check-report.json'
            archiveArtifacts artifacts: 'dependency-check-report/*.html', allowEmptyArchive: true
        }

        success {
            echo 'Frontend deployment successful!'
        }

        failure {
            echo 'Frontend deployment failed!'
            sh 'docker logs agro-frontend-operasional --tail 100 || true'
        }
    }
}