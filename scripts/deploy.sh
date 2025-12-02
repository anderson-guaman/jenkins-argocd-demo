#!/bin/bash

# ============================================================
# Script para desplegar la aplicación en ArgoCD
# ============================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 Desplegando aplicación en ArgoCD                    ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Crear namespace de la aplicación
echo -e "${YELLOW}[1/4] Creando namespace...${NC}"
kubectl apply -f k8s/namespace.yaml

# 2. Crear secret de LaunchDarkly
echo -e "${YELLOW}[2/4] Creando secrets...${NC}"
echo -e "${YELLOW}⚠️  Asegúrate de actualizar k8s/secret.yaml con tu SDK Key real de LaunchDarkly${NC}"
kubectl apply -f k8s/secret.yaml

# 3. Crear proyecto de ArgoCD
echo -e "${YELLOW}[3/4] Creando proyecto en ArgoCD...${NC}"
kubectl apply -f argocd/project.yaml

# 4. Crear aplicación de ArgoCD
echo -e "${YELLOW}[4/4] Creando aplicación en ArgoCD...${NC}"
kubectl apply -f argocd/application.yaml

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Aplicación desplegada en ArgoCD                     ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  La sincronización automática está habilitada              ║${NC}"
echo -e "${GREEN}║  Cualquier cambio en Git se desplegará automáticamente     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# Mostrar estado
echo ""
echo -e "${YELLOW}Estado de la aplicación:${NC}"
kubectl get application demo-app -n argocd -o wide 2>/dev/null || echo "Aplicación creándose..."

echo ""
echo -e "${YELLOW}Para monitorear el despliegue:${NC}"
echo "  kubectl get pods -n demo -w"
echo ""
echo "  argocd app get demo-app"
