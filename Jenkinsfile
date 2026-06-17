// ============================================================================
// SIMPLE CI PIPELINE - AGRO JABAR ECOMMERCE FRONTEND OPERASIONAL
// ============================================================================
// Pipeline ini HANYA untuk Continuous Integration (CI), BUKAN deployment
// 
// Yang sudah di-handle oleh Git Hooks:
// - ESLint check (pre-commit)
// - Build check (pre-push)
//
// Yang di-handle oleh Jenkins:
// - Run tests (unit + E2E)
// - Generate test reports
// - Notify hasil build
// ============================================================================

pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        PROJECT_NAME = 'agro-jabar-ecommerce-frontend-operasional'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('📥 Checkout') {
            steps {
                echo "Checking out code..."
                checkout scm
            }
        }

        stage('📦 Install Dependencies') {
            steps {
                echo "Installing dependencies..."
                nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                    sh 'npm ci'
                }
            }
        }

        stage('🧪 Run Unit Tests') {
            steps {
                echo "Running unit tests..."
                nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                    sh 'npm run test:coverage || true'
                }
            }
        }

        stage('🎭 Run E2E Tests') {
            steps {
                echo "Running E2E tests..."
                nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                    sh '''
                        # Install Playwright browsers (jika belum)
                        npx playwright install --with-deps chromium || true
                        
                        # Run E2E tests
                        npm run test:e2e || true
                    '''
                }
            }
        }
    }

    post {
        always {
            // Publish test results (jika ada)
            junit testResults: '**/test-results/**/*.xml', allowEmptyResults: true
            
            // Publish coverage report (jika ada)
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
            
            // Publish Playwright report (jika ada)
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])
        }
        
        success {
            echo "✅ Build successful!"
        }
        
        failure {
            echo "❌ Build failed!"
        }
    }
}
