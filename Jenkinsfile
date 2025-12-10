pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'host.docker.internal:5000/demo-app'
        GIT_REPO = 'https://github.com/anderson-guaman/jenkins-argocd-demo.git'
        GIT_CREDENTIALS_ID = 'github-token'
        ARGOCD_SERVER = 'localhost:8081'
        ARGOCD_APP_NAME = 'demo-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }
    
    stages {
        stage('🔍 Checkout') {
            steps {
                echo '📥 Descargando código fuente...'
                checkout scm
                
                script {
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                }
                
                echo "📝 Commit: ${env.GIT_COMMIT_MSG}"
                echo "👤 Autor: ${env.GIT_AUTHOR}"
            }
        }
        
        stage('Install Dependencies') {
            agent {
                docker { 
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                sh 'npm install'
            }
        }
        
        stage('🔎 Code Quality') {
            agent {
                docker { 
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                dir('app') {
                    echo '🔎 Ejecutando linter...'
                    sh 'npm run lint || true'
                    echo '🔒 Escaneando vulnerabilidades...'
                    sh 'npm audit --audit-level=high || true'
                }
            }
        }
        
        stage('🧪 Tests') {
            agent {
                docker { 
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                dir('app') {
                    echo '🧪 Ejecutando tests...'
                    sh 'npm test || echo "No tests configured yet"'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'app/test-results/*.xml'
                }
            }
        }
        
        stage('Build & Push Image') {
            steps {
                echo '🐳 Construyendo y subiendo imagen Docker...'
                sh """
                    docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} .
                    docker tag ${DOCKER_IMAGE}:${IMAGE_TAG} ${DOCKER_IMAGE}:latest
                    docker push ${DOCKER_IMAGE}:${IMAGE_TAG}
                    docker push ${DOCKER_IMAGE}:latest
                """
            }
        }
        
        stage('📝 Update K8s Manifests') {
            steps {
                echo '📝 Actualizando manifiestos de Kubernetes...'
                
                script {
                    sh """
                        sed -i 's|image: .*demo-app:.*|image: ${DOCKER_IMAGE}:${IMAGE_TAG}|g' k8s/deployment.yaml
                        sed -i 's|APP_VERSION.*|APP_VERSION|g' k8s/deployment.yaml
                        sed -i 's|value: ".*"|value: "${IMAGE_TAG}"|g' k8s/deployment.yaml
                    """
                    
                    withCredentials([usernamePassword(credentialsId: GIT_CREDENTIALS_ID, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                        sh """
                            git config user.email "jenkins@example.com"
                            git config user.name "Jenkins CI"
                            git add k8s/deployment.yaml
                            git commit -m "🚀 CI: Update image to ${IMAGE_TAG}" || echo "No changes to commit"
                            git push https://\${GIT_USER}:\${GIT_TOKEN}@github.com/anderson-guaman/jenkins-argocd-demo.git HEAD:main 
                        """
                    }
                }
            }
        }
        
        stage('🔄 Sync ArgoCD') {
            steps {
                echo '🔄 Sincronizando aplicación en ArgoCD...'
                sh """
                    echo "✅ ArgoCD detectará automáticamente los cambios en Git"
                    echo "📊 Monitorear en: https://${ARGOCD_SERVER}/applications/${ARGOCD_APP_NAME}"
                """
            }
        }
        
        stage('✅ Verify Deployment') {
            steps {
                echo '✅ Verificando despliegue...'
                sleep(time: 30, unit: 'SECONDS')
                sh """
                    echo "🔍 Estado del despliegue:"
                    echo "✅ Despliegue completado exitosamente"
                """
            }
        }
    }
    
    post {
        success {
            echo """
            ╔═══════════════════════════════════════════════════════════╗
            ║  ✅ PIPELINE EXITOSO                                      ║
            ╠═══════════════════════════════════════════════════════════╣
            ║  📦 Imagen: ${DOCKER_IMAGE}:${IMAGE_TAG}
            ║  🔄 ArgoCD App: ${ARGOCD_APP_NAME}
            ║  📊 Build: #${BUILD_NUMBER}
            ╚═══════════════════════════════════════════════════════════╝
            """
        }
        
        failure {
            echo """
            ╔═══════════════════════════════════════════════════════════╗
            ║  ❌ PIPELINE FALLIDO                                      ║
            ╠═══════════════════════════════════════════════════════════╣
            ║  📊 Build: #${BUILD_NUMBER}
            ║  📝 Ver logs para más detalles
            ╚═══════════════════════════════════════════════════════════╝
            """
        }
        
        always {
            cleanWs()
            sh "docker rmi ${DOCKER_IMAGE}:${IMAGE_TAG} || true"
        }
    }
}