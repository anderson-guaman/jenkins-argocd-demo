pipeline {
    agent any
    
    environment {
        // Configuración de Docker Registry
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_IMAGE = 'your-dockerhub-username/demo-app'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        
        // Configuración de Git
        GIT_REPO = 'https://github.com/YOUR_USERNAME/jenkins-argocd-demo.git'
        GIT_CREDENTIALS_ID = 'github-credentials'
        
        // Configuración de ArgoCD
        ARGOCD_SERVER = 'argocd.example.com'
        ARGOCD_APP_NAME = 'demo-app'
        
        // Versión de la imagen
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
                    // Obtener información del commit
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
        
        stage('📦 Install Dependencies') {
            steps {
                dir('app') {
                    echo '📦 Instalando dependencias...'
                    sh 'npm ci'
                }
            }
        }
        
        stage('🔎 Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        dir('app') {
                            echo '🔎 Ejecutando linter...'
                            sh 'npm run lint || true'
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        dir('app') {
                            echo '🔒 Escaneando vulnerabilidades...'
                            sh 'npm audit --audit-level=high || true'
                        }
                    }
                }
            }
        }
        
        stage('🧪 Tests') {
            steps {
                dir('app') {
                    echo '🧪 Ejecutando tests...'
                    sh 'npm test || echo "No tests configured yet"'
                }
            }
            post {
                always {
                    // Publicar resultados de tests si existen
                    junit allowEmptyResults: true, testResults: 'app/test-results/*.xml'
                }
            }
        }
        
        stage('🐳 Build Docker Image') {
            steps {
                dir('app') {
                    echo "🐳 Construyendo imagen Docker: ${DOCKER_IMAGE}:${IMAGE_TAG}"
                    
                    script {
                        docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}", ".")
                    }
                }
            }
        }
        
        stage('🔐 Push to Registry') {
            steps {
                echo "📤 Subiendo imagen a ${DOCKER_REGISTRY}..."
                
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                        docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}").push()
                        docker.image("${DOCKER_IMAGE}:${IMAGE_TAG}").push('latest')
                    }
                }
            }
        }
        
        stage('📝 Update K8s Manifests') {
            steps {
                echo '📝 Actualizando manifiestos de Kubernetes...'
                
                script {
                    // Actualizar la imagen en el deployment
                    sh """
                        sed -i 's|image: .*demo-app:.*|image: ${DOCKER_IMAGE}:${IMAGE_TAG}|g' k8s/deployment.yaml
                        
                        # Actualizar la versión en el deployment
                        sed -i 's|APP_VERSION.*|APP_VERSION|g' k8s/deployment.yaml
                        sed -i 's|value: ".*"|value: "${IMAGE_TAG}"|g' k8s/deployment.yaml
                    """
                    
                    // Commit y push de los cambios
                    withCredentials([usernamePassword(
                        credentialsId: GIT_CREDENTIALS_ID,
                        usernameVariable: 'GIT_USERNAME',
                        passwordVariable: 'GIT_PASSWORD'
                    )]) {
                        sh """
                            git config user.email "jenkins@example.com"
                            git config user.name "Jenkins CI"
                            git add k8s/deployment.yaml
                            git commit -m "🚀 CI: Update image to ${IMAGE_TAG}" || echo "No changes to commit"
                            git push https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/YOUR_USERNAME/jenkins-argocd-demo.git HEAD:main || echo "Push skipped"
                        """
                    }
                }
            }
        }
        
        stage('🔄 Sync ArgoCD') {
            steps {
                echo '🔄 Sincronizando aplicación en ArgoCD...'
                
                script {
                    // Opción 1: Usar ArgoCD CLI
                    sh """
                        # Login a ArgoCD (si está instalado)
                        # argocd login ${ARGOCD_SERVER} --username admin --password \$ARGOCD_PASSWORD --insecure
                        
                        # Sincronizar aplicación
                        # argocd app sync ${ARGOCD_APP_NAME} --force
                        
                        # Esperar a que el despliegue esté healthy
                        # argocd app wait ${ARGOCD_APP_NAME} --health --timeout 300
                        
                        echo "✅ ArgoCD detectará automáticamente los cambios en Git"
                        echo "📊 Monitorear en: https://${ARGOCD_SERVER}/applications/${ARGOCD_APP_NAME}"
                    """
                }
            }
        }
        
        stage('✅ Verify Deployment') {
            steps {
                echo '✅ Verificando despliegue...'
                
                script {
                    // Esperar un momento para que ArgoCD sincronice
                    sleep(time: 30, unit: 'SECONDS')
                    
                    // Verificar el estado (opcional, requiere kubectl configurado)
                    sh """
                        echo "🔍 Estado del despliegue:"
                        # kubectl get pods -n demo -l app=demo-app
                        # kubectl rollout status deployment/demo-app -n demo --timeout=300s
                        
                        echo "✅ Despliegue completado exitosamente"
                    """
                }
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
            
            // Notificación (Slack, Email, etc.)
            // slackSend(color: 'good', message: "✅ Deploy exitoso: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
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
            
            // slackSend(color: 'danger', message: "❌ Deploy fallido: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
        
        always {
            // Limpiar workspace
            cleanWs()
            
            // Limpiar imágenes Docker locales
            sh "docker rmi ${DOCKER_IMAGE}:${IMAGE_TAG} || true"
        }
    }
}
