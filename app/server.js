const express = require('express');
const LaunchDarkly = require('@launchdarkly/node-server-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// LaunchDarkly SDK Key (usar variable de entorno en producción)
const LD_SDK_KEY = process.env.LAUNCHDARKLY_SDK_KEY || 'sdk-your-key-here';

// Inicializar cliente de LaunchDarkly
let ldClient;

async function initLaunchDarkly() {
    try {
        ldClient = LaunchDarkly.init(LD_SDK_KEY);
        await ldClient.waitForInitialization();
        console.log('LaunchDarkly inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando LaunchDarkly:', error.message);
        console.log(' Continuando sin LaunchDarkly (modo fallback)');
        ldClient = null;
    }
}

// Middleware para parsear JSON
app.use(express.json());

// Contexto de usuario para LaunchDarkly
const getContext = (userId = 'anonymous') => ({
    kind: 'user',
    key: userId,
    name: `User ${userId}`,
    custom: {
        environment: process.env.NODE_ENV || 'development'
    }
});

// Endpoint principal
app.get('/', async (req, res) => {
    const userId = req.query.userId || 'anonymous';
    const context = getContext(userId);
    
    // Feature Flags
    let newUIEnabled = false;
    let darkModeEnabled = false;
    let betaFeaturesEnabled = false;
    
    if (ldClient) {
        try {
            newUIEnabled = await ldClient.variation('new-ui-feature', context, false);
            darkModeEnabled = await ldClient.variation('dark-mode', context, false);
            betaFeaturesEnabled = await ldClient.variation('beta-features', context, false);
        } catch (error) {
            console.error('Error obteniendo feature flags:', error);
        }
    }
    
    res.json({
        message: '🚀  Microservicio  Jenkins + ArgoCD + LaunchDarkly Demo pruebaaaa anderson ',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        user: userId,
        featureFlags: {
            newUIEnabled,
            darkModeEnabled,
            betaFeaturesEnabled
        }
    });
});

// Endpoint de health check para Kubernetes
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Endpoint de readiness para Kubernetes
app.get('/ready', async (req, res) => {
    const isReady = ldClient ? ldClient.initialized() : true;
    
    if (isReady) {
        res.status(200).json({ status: 'ready' });
    } else {
        res.status(503).json({ status: 'not ready' });
    }
});

// Endpoint para ver todos los feature flags
app.get('/features', async (req, res) => {
    const userId = req.query.userId || 'anonymous';
    const context = getContext(userId);
    
    if (!ldClient) {
        return res.json({
            message: 'LaunchDarkly no está configurado',
            fallbackMode: true,
            features: {
                'new-ui-feature': false,
                'dark-mode': false,
                'beta-features': false
            }
        });
    }
    
    const features = {
        'new-ui-feature': await ldClient.variation('new-ui-feature', context, false),
        'dark-mode': await ldClient.variation('dark-mode', context, false),
        'beta-features': await ldClient.variation('beta-features', context, false)
    };
    
    res.json({
        user: userId,
        features,
        launchDarklyConnected: ldClient.initialized()
    });
});

// Endpoint para simular diferentes usuarios (demo de canary/targeting)
app.get('/demo/:userType', async (req, res) => {
    const userType = req.params.userType;
    const context = getContext(userType);
    
    let features = {
        'new-ui-feature': false,
        'dark-mode': false,
        'beta-features': false
    };
    
    if (ldClient) {
        features = {
            'new-ui-feature': await ldClient.variation('new-ui-feature', context, false),
            'dark-mode': await ldClient.variation('dark-mode', context, false),
            'beta-features': await ldClient.variation('beta-features', context, false)
        };
    }
    
    // Renderizar respuesta según feature flags
    const response = {
        userType,
        message: features['new-ui-feature'] 
            ? '🎉 ¡Bienvenido a la Nueva UI!' 
            : '👋 Bienvenido a la UI Clásica',
        theme: features['dark-mode'] ? 'dark' : 'light',
        betaAccess: features['beta-features'],
        features
    };
    
    res.json(response);
});

// Iniciar servidor
async function startServer() {
    await initLaunchDarkly();
    
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║     🚀 Jenkins + ArgoCD + LaunchDarkly Demo                ║
║     Servidor corriendo en puerto ${PORT}                       ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  • GET /          - Info principal + feature flags         ║
║  • GET /health    - Health check                           ║
║  • GET /ready     - Readiness check                        ║
║  • GET /features  - Ver todos los feature flags            ║
║  • GET /demo/:user - Demo por tipo de usuario              ║
╚════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer();

// Cerrar conexión de LaunchDarkly al terminar
process.on('SIGTERM', () => {
    if (ldClient) {
        ldClient.close();
    }
    process.exit(0);
});
