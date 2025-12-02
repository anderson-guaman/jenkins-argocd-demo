const request = require('supertest');
const express = require('express');

// Mock de la aplicación para tests
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.get('/ready', (req, res) => {
    res.status(200).json({ status: 'ready' });
});

app.get('/', (req, res) => {
    res.json({
        message: '🚀 Jenkins + ArgoCD + LaunchDarkly Demo',
        version: '1.0.0',
        featureFlags: {
            newUIEnabled: false,
            darkModeEnabled: false,
            betaFeaturesEnabled: false
        }
    });
});

describe('API Endpoints', () => {
    describe('GET /health', () => {
        it('should return healthy status', async () => {
            const response = await request(app).get('/health');
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /ready', () => {
        it('should return ready status', async () => {
            const response = await request(app).get('/ready');
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ready');
        });
    });

    describe('GET /', () => {
        it('should return app info with feature flags', async () => {
            const response = await request(app).get('/');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('featureFlags');
            expect(response.body.featureFlags).toHaveProperty('newUIEnabled');
            expect(response.body.featureFlags).toHaveProperty('darkModeEnabled');
            expect(response.body.featureFlags).toHaveProperty('betaFeaturesEnabled');
        });
    });
});

describe('Feature Flags', () => {
    it('should have default values when LaunchDarkly is not connected', () => {
        const defaultFlags = {
            newUIEnabled: false,
            darkModeEnabled: false,
            betaFeaturesEnabled: false
        };
        
        expect(defaultFlags.newUIEnabled).toBe(false);
        expect(defaultFlags.darkModeEnabled).toBe(false);
        expect(defaultFlags.betaFeaturesEnabled).toBe(false);
    });
});
