#!/bin/bash

# ============================================================
# Script de instalación y configuración de ArgoCD
# ============================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 Instalación de ArgoCD                               ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Crear namespace de ArgoCD
echo -e "${YELLOW}[1/5] Creando namespace de ArgoCD...${NC}"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# 2. Instalar ArgoCD
echo -e "${YELLOW}[2/5] Instalando ArgoCD...${NC}"
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Esperar a que los pods estén listos
echo -e "${YELLOW}[3/5] Esperando a que ArgoCD esté listo...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# 4. Obtener contraseña inicial
echo -e "${YELLOW}[4/5] Obteniendo credenciales...${NC}"
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ ArgoCD instalado correctamente                      ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Usuario: admin                                            ║${NC}"
echo -e "${GREEN}║  Password: ${ARGOCD_PASSWORD}${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# 5. Exponer ArgoCD (para acceso local)
echo -e "${YELLOW}[5/5] Para acceder a ArgoCD UI, ejecuta:${NC}"
echo ""
echo "  kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo ""
echo "  Luego accede a: https://localhost:8080"
echo ""

# Instalar ArgoCD CLI (opcional)
echo -e "${YELLOW}¿Deseas instalar ArgoCD CLI? (y/n)${NC}"
read -r INSTALL_CLI

if [ "$INSTALL_CLI" = "y" ]; then
    echo "Instalando ArgoCD CLI..."
    
    # Detectar sistema operativo
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
        sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
        rm argocd-linux-amd64
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install argocd
    fi
    
    echo -e "${GREEN}✅ ArgoCD CLI instalado${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup completado!${NC}"
