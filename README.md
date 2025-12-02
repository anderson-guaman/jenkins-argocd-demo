# Jenkins + ArgoCD + LaunchDarkly Demo

## Integración DevOps: CI/CD con Feature Flags

Este proyecto demuestra la integración completa de un flujo de trabajo DevOps moderno utilizando:

- **Jenkins**: Pipeline de Integración Continua (CI)
- **ArgoCD**: Despliegue Continuo con GitOps y sincronización automática
- **LaunchDarkly**: Gestión de Feature Flags para despliegues controlados

---

## Tabla de Contenidos

1. [Arquitectura](#-arquitectura)
2. [Requisitos Previos](#-requisitos-previos)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Configuración](#-configuración)
5. [Pipeline de Jenkins](#-pipeline-de-jenkins)
6. [ArgoCD - GitOps](#-argocd---gitops)
7. [LaunchDarkly - Feature Flags](#-launchdarkly---feature-flags)
8. [Conclusión: Estrategia de Despliegue](#-conclusión-estrategia-de-despliegue)

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO CI/CD COMPLETO                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────────┐
  │          │     │          │     │          │     │                      │
  │   Git    │────▶│ Jenkins  │────▶│ Docker   │────▶│   Container          │
  │  (Push)  │     │   (CI)   │     │ Registry │     │   Registry           │
  │          │     │          │     │          │     │                      │
  └──────────┘     └────┬─────┘     └──────────┘     └──────────────────────┘
                        │
                        │ Actualiza manifiestos K8s
                        ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                              GitOps Repository                            │
  │   ┌─────────────────────────────────────────────────────────────────┐    │
  │   │  k8s/deployment.yaml  │  k8s/service.yaml  │  k8s/configmap.yaml │    │
  │   └─────────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────────┘
                        │
                        │ Detecta cambios automáticamente
                        ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                              ArgoCD                                       │
  │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
  │   │ Sync Automático │    │   Self-Heal     │    │   Monitoring    │      │
  │   │    ✓ Enabled    │    │   ✓ Enabled     │    │   ✓ Enabled     │      │
  │   └─────────────────┘    └─────────────────┘    └─────────────────┘      │
  └──────────────────────────────────────────────────────────────────────────┘
                        │
                        │ Despliega a Kubernetes
                        ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          Kubernetes Cluster                               │
  │                                                                          │
  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
  │   │   Pod 1     │     │   Pod 2     │     │   Pod 3     │               │
  │   │  demo-app   │     │  demo-app   │     │  demo-app   │               │
  │   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘               │
  │          │                   │                   │                       │
  │          └───────────────────┼───────────────────┘                       │
  │                              │                                           │
  │                              ▼                                           │
  │                    ┌─────────────────┐                                   │
  │                    │  LaunchDarkly   │                                   │
  │                    │  Feature Flags  │                                   │
  │                    └─────────────────┘                                   │
  │                              │                                           │
  │          ┌───────────────────┼───────────────────┐                       │
  │          ▼                   ▼                   ▼                       │
  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
  │   │ new-ui-flag │     │ dark-mode   │     │ beta-access │               │
  │   │   ✓/✗       │     │   ✓/✗       │     │   ✓/✗       │               │
  │   └─────────────┘     └─────────────┘     └─────────────┘               │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Requisitos Previos

- **Kubernetes Cluster** (Minikube, Kind, EKS, GKE, AKS)
- **Jenkins** (v2.x o superior)
- **Docker** instalado
- **kubectl** configurado
- **ArgoCD CLI** (opcional)
- **Cuenta en LaunchDarkly** (trial gratuito disponible)

---

## 📁 Estructura del Proyecto

```
jenkins-argocd-demo/
├── app/                          # Código fuente de la aplicación
│   ├── server.js                 # Servidor Express con LaunchDarkly
│   ├── server.test.js            # Tests unitarios
│   ├── package.json              # Dependencias Node.js
│   ├── Dockerfile                # Imagen Docker
│   └── jest.config.js            # Configuración de tests
├── k8s/                          # Manifiestos de Kubernetes
│   ├── namespace.yaml            # Namespace
│   ├── deployment.yaml           # Deployment
│   ├── service.yaml              # Services
│   ├── configmap.yaml            # ConfigMap
│   └── secret.yaml               # Secret (LaunchDarkly SDK Key)
├── argocd/                       # Configuración de ArgoCD
│   ├── application.yaml          # ArgoCD Application
│   └── project.yaml              # ArgoCD Project
├── scripts/                      # Scripts de utilidad
│   ├── setup-argocd.sh           # Instalación de ArgoCD
│   └── deploy.sh                 # Script de despliegue
├── Jenkinsfile                   # Pipeline de CI/CD
├── .gitignore                    # Archivos ignorados
└── README.md                     # Este archivo
```

---

## ⚙ Configuración

### 1. Configurar LaunchDarkly

1. Crear cuenta en [LaunchDarkly](https://launchdarkly.com)
2. Crear un proyecto nuevo
3. Crear los siguientes Feature Flags:

| Flag Key | Nombre | Tipo | Valor Default |
|----------|--------|------|---------------|
| `new-ui-feature` | Nueva UI | Boolean | `false` |
| `dark-mode` | Modo Oscuro | Boolean | `false` |
| `beta-features` | Funciones Beta | Boolean | `false` |

4. Copiar el **SDK Key** del environment

### 2. Configurar Secret de Kubernetes

Editar `k8s/secret.yaml` con tu SDK Key:

```yaml
stringData:
  sdk-key: "sdk-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

### 3. Configurar Jenkins

1. Instalar plugins necesarios:
   - Docker Pipeline
   - Git
   - Kubernetes CLI

2. Configurar credenciales:
   - `docker-hub-credentials`: Usuario/password de Docker Hub
   - `github-credentials`: Token de GitHub

3. Crear nuevo Pipeline apuntando al Jenkinsfile

### 4. Instalar ArgoCD

```bash
# Ejecutar script de instalación
chmod +x scripts/setup-argocd.sh
./scripts/setup-argocd.sh

# O manualmente:
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 5. Desplegar Aplicación

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 🔧 Pipeline de Jenkins

El Jenkinsfile implementa las siguientes etapas:

```
┌─────────────────────────────────────────────────────────────────┐
│                    JENKINS PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│  1. 🔍 Checkout          → Descarga código de Git               │
│  2. 📦 Install           → npm ci                                │
│  3. 🔎 Code Quality      → Lint + Security Scan (paralelo)      │
│  4. 🧪 Tests             → Jest unit tests                       │
│  5. 🐳 Build Docker      → Construye imagen                      │
│  6. 🔐 Push Registry     → Sube a Docker Hub                     │
│  7. 📝 Update Manifests  → Actualiza deployment.yaml            │
│  8. 🔄 Sync ArgoCD       → Trigger sincronización               │
│  9. ✅ Verify            → Verificación del despliegue          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 ArgoCD - GitOps

### Características Implementadas

| Característica | Estado | Descripción |
|----------------|--------|-------------|
| **Sincronización Automática** | ✅ Habilitada | ArgoCD detecta cambios en Git y despliega automáticamente |
| **Self-Heal** | ✅ Habilitado | Si alguien modifica el cluster manualmente, ArgoCD revierte los cambios |
| **Prune** | ✅ Habilitado | Elimina recursos que ya no están definidos en Git |
| **Retry Policy** | ✅ Configurado | Reintentos automáticos en caso de fallo |

### Monitoreo del Estado

```bash
# Ver estado de la aplicación
argocd app get demo-app

# Ver en la UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Acceder a https://localhost:8080
```

### Estados de Sincronización

- **Synced**: El cluster está sincronizado con Git
- **OutOfSync**: Hay diferencias pendientes
- **Unknown**: No se puede determinar el estado
- **Progressing**: Sincronización en proceso

---

## 🚩 LaunchDarkly - Feature Flags

### Feature Flags Implementados

| Flag | Propósito | Estrategia |
|------|-----------|------------|
| `new-ui-feature` | Habilitar nueva interfaz | **Canary Release** - Liberar gradualmente |
| `dark-mode` | Modo oscuro | **A/B Testing** - Probar preferencias |
| `beta-features` | Funciones beta | **Dark Launch** - Usuarios seleccionados |

### Endpoints de la Aplicación

```bash
# Info general con flags
GET /

# Health check
GET /health

# Ver todos los feature flags
GET /features?userId=user123

# Demo por tipo de usuario
GET /demo/beta-tester
GET /demo/regular-user
```

### Ejemplo de Respuesta

```json
{
  "message": "🚀 Jenkins + ArgoCD + LaunchDarkly Demo",
  "version": "1.0.0",
  "featureFlags": {
    "newUIEnabled": true,
    "darkModeEnabled": false,
    "betaFeaturesEnabled": true
  }
}
```

---

## 📊 Conclusión: Estrategia de Despliegue

### ¿Qué estrategias de despliegue estamos implementando con LaunchDarkly?

Con la integración de LaunchDarkly en nuestra aplicación, estamos implementando **múltiples estrategias de despliegue** que pueden utilizarse según el caso de uso:

---

### 1. 🐤 **Canary Release** (Liberación Canaria)

**Implementación**: Flag `new-ui-feature`

```
Flujo del Canary Release:
                                    
  100% ────────────────────────────────────────▶
   │                              ┌─────────┐
   │                         ┌───▶│ Nueva   │
   │    ┌─────────┐    20%  │    │ Versión │
   │    │ Feature │─────────┘    └─────────┘
   │    │  Flag   │
   │    └────┬────┘         ┌─────────────┐
   │         │    80%       │   Versión   │
   │         └─────────────▶│   Estable   │
   │                        └─────────────────┘
  0% 
```

**¿Cómo funciona?**
- Desplegamos el código de la nueva UI a todos los pods
- LaunchDarkly controla qué porcentaje de usuarios ve la nueva UI
- Comenzamos con 5-10% de usuarios
- Si no hay errores, incrementamos gradualmente (20%, 50%, 100%)
- Si hay problemas, desactivamos instantáneamente el flag

**Ventajas:**
- ✅ Rollback instantáneo sin redespliegue
- ✅ Métricas de comportamiento antes del lanzamiento completo
- ✅ Reducción del riesgo de fallos masivos

---

### 2. 🌑 **Dark Launch** (Lanzamiento Oscuro)

**Implementación**: Flag `beta-features`

```
Dark Launch:

  ┌──────────────────────────────────────────────────┐
  │              TODOS LOS USUARIOS                  │
  │  ┌────────────────────────────────────────────┐  │
  │  │         Código desplegado                  │  │
  │  │    (nueva funcionalidad oculta)            │  │
  │  └────────────────────────────────────────────┘  │
  │                      │                           │
  │          Feature Flag: beta-features             │
  │                      │                           │
  │         ┌────────────┴────────────┐             │
  │         ▼                         ▼             │
  │   ┌───────────┐           ┌───────────┐        │
  │   │  VISIBLE  │           │  OCULTO   │        │
  │   │  (5%)     │           │  (95%)    │        │
  │   │ Beta      │           │ Usuarios  │        │
  │   │ Testers   │           │ Normales  │        │
  │   └───────────┘           └───────────┘        │
  └──────────────────────────────────────────────────┘
```

**¿Cómo funciona?**
- El código nuevo está desplegado en producción
- Solo usuarios específicos (beta testers) pueden acceder
- Targeting por: email, ID de usuario, atributos personalizados
- La funcionalidad está "oscura" para el público general

**Ventajas:**
- ✅ Probar en producción sin afectar usuarios normales
- ✅ Feedback temprano de usuarios selectos
- ✅ El código ya está en producción cuando se active

---

### 3. 🔬 **A/B Testing**

**Implementación**: Flag `dark-mode`

```
A/B Testing:

        ┌───────────────────────────────────────┐
        │          TRÁFICO TOTAL                │
        │              100%                     │
        └───────────────────┬───────────────────┘
                            │
                    Feature Flag
                     dark-mode
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
        ┌───────────┐             ┌───────────┐
        │ Grupo A   │             │ Grupo B   │
        │   50%     │             │   50%     │
        │           │             │           │
        │  Tema     │             │  Tema     │
        │  Claro    │             │  Oscuro   │
        └─────┬─────┘             └─────┬─────┘
              │                         │
              ▼                         ▼
        ┌───────────┐             ┌───────────┐
        │ Métricas  │             │ Métricas  │
        │ - CTR     │             │ - CTR     │
        │ - Tiempo  │             │ - Tiempo  │
        │ - Conv.   │             │ - Conv.   │
        └───────────┘             └───────────┘
                    │
                    ▼
            ┌───────────────┐
            │   ANÁLISIS    │
            │  Estadístico  │
            └───────────────┘
```

**¿Cómo funciona?**
- División aleatoria de usuarios en grupos
- Cada grupo ve una variante diferente
- Medición de métricas clave (engagement, conversión)
- Decisión basada en datos

**Ventajas:**
- ✅ Decisiones basadas en datos reales
- ✅ Experimentación continua
- ✅ Optimización iterativa

---

### 📋 Resumen de Estrategias

| Estrategia | Flag | Caso de Uso | Control de Rollout |
|------------|------|-------------|-------------------|
| **Canary Release** | `new-ui-feature` | Nuevas funcionalidades grandes | Por porcentaje |
| **Dark Launch** | `beta-features` | Features experimentales | Por targeting |
| **A/B Testing** | `dark-mode` | Optimización UX | Por experimento |

---

### 🎯 Beneficios de LaunchDarkly en nuestro flujo

1. **Desacoplamiento Deploy vs Release**: El código se despliega, pero la funcionalidad se libera controladamente
2. **Rollback Instantáneo**: Sin necesidad de redespliegue
3. **Experimentación Segura**: Probar en producción con riesgo mínimo
4. **Personalización**: Diferentes experiencias para diferentes usuarios
5. **Métricas en Tiempo Real**: Visibilidad del impacto de cada feature

---

## 🔗 Referencias

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [LaunchDarkly Documentation](https://docs.launchdarkly.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

## 👥 Equipo

**Proyecto de Integración DevOps - CI/CD Progreso 2**

---

## 📝 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.
