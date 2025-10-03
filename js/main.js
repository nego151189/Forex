// main.js - SISTEMA PRINCIPAL CON TENSORFLOW.JS (SIN SIMULACIÓN)
class ForexTradingApp {
    constructor() {
        this.currentInstrument = 'EURUSD';
        this.currentData = [];
        this.isTrainingModel = false;
        this.mlModel = null;
        this.tradingSystem = null;
        
        // Componentes
        this.chart = new CandlestickChart('candlesContainer');
        this.alertSystem = new TradingAlerts();
        
        // Intervalos
        this.dataUpdateInterval = null;
        this.signalUpdateInterval = null;
    }

    async init() {
        console.log('🚀 Inicializando ML Forex Platform con TensorFlow.js...');
        
        try {
            // Inicializar Firebase primero
            await this.initializeFirebase();
            
            // Inicializar sistema de alertas
            await this.alertSystem.init();
            
            // Cargar datos reales iniciales
            await this.loadRealData();
            
            // Inicializar modelo TensorFlow
            await this.initializeTensorFlowModel();
            
            // Inicializar sistema de trading
            await this.initializeTradingSystem();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Iniciar actualizaciones automáticas
            this.setupAutomaticUpdates();
            
            // Inicializar dashboard de aprendizaje
            this.initializeLearningDashboard();
            
            // Inicializar sistema de entrenamiento automático
            await this.initializeAutoTraining();
            
            console.log('✅ Aplicación inicializada correctamente con TensorFlow.js');
            this.showNotification('🚀 Sistema TensorFlow ML activo', 'success');
            
        } catch (error) {
            console.error('❌ Error crítico durante inicialización:', error);
            this.showNotification('❌ Error crítico: ' + error.message, 'error');
        }
    }

    async initializeFirebase() {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase no está cargado');
        }

        if (!firebase.apps.length) {
            const config = {
                apiKey: "AIzaSyAJKmrK6R4SNxzS1mtaLFmhozdAwLUoluU",
                authDomain: "forex-3ac1c.firebaseapp.com",
                projectId: "forex-3ac1c",
                storageBucket: "forex-3ac1c.firebasestorage.app",
                messagingSenderId: "1081545249171",
                appId: "1:1081545249171:web:00439967530acb956e5866"
            };
            firebase.initializeApp(config);
        }

        console.log('✅ Firebase inicializado');
    }

    async initializeTensorFlowModel() {
        console.log(`🧠 Inicializando modelo TensorFlow para ${this.currentInstrument}...`);
        
        try {
            this.mlModel = new ForexTensorFlowModel(this.currentInstrument);
            
            // Intentar cargar modelo existente
            const loaded = await this.mlModel.loadModelFromFirebase();
            
            if (loaded && this.mlModel.isTrained) {
                console.log(`✅ Modelo cargado - Accuracy: ${(this.mlModel.accuracy * 100).toFixed(2)}%`);
                this.updateModelMetrics();
            } else {
                console.log('📝 Modelo nuevo - Necesita entrenamiento');
                this.showNotification('Modelo nuevo - Entrenar para empezar', 'info');
            }
            
        } catch (error) {
            console.error('Error inicializando modelo TensorFlow:', error);
            throw error;
        }
    }

    async initializeTradingSystem() {
        console.log('🎯 Inicializando sistema de trading avanzado...');
        
        this.tradingSystem = new AdvancedTradingSystem(this.currentInstrument, this.mlModel);
        
        console.log('✅ Sistema de trading inicializado');
    }

    async initializeAutoTraining() {
        if (typeof initializeAutoTraining === 'function') {
            await initializeAutoTraining();
            console.log('✅ Sistema de entrenamiento automático activado');
        }
    }

    initializeLearningDashboard() {
        const dashboardContainer = document.getElementById('learningDashboardContainer');
        if (dashboardContainer && typeof initializeLearningDashboard === 'function') {
            initializeLearningDashboard('learningDashboardContainer');
            console.log('✅ Dashboard de aprendizaje inicializado');
        }
    }

    async loadRealData() {
        console.log(`📊 Cargando datos REALES para ${this.currentInstrument}...`);
        
        this.chart.showLoadingState();
        this.updateDataStatus('🌐 Conectando a Twelve Data...', 'loading');
        
        try {
            // SOLO DATOS REALES - 5000 velas
            this.currentData = await getTwelveDataReal(this.currentInstrument, '15min', 5000);
            
            if (!this.currentData || this.currentData.length === 0) {
                throw new Error('No se recibieron datos');
            }

            // Validar que son datos reales
            if (!this.currentData[0].isRealData) {
                throw new Error('Los datos no están marcados como reales');
            }
            
            // Renderizar en chart (últimas 100 velas visibles)
            this.chart.render(this.currentData.slice(-100));
            
            // Actualizar UI
            this.updateCurrentPrice();
            this.updateDataStatus(`✅ ${this.currentData.length} velas REALES cargadas`, 'success');
            this.updateCandleCount();
            
            console.log(`✅ Datos REALES cargados: ${this.currentData.length} velas`);
            console.log(`📈 Rango: ${this.currentData[0].date} a ${this.currentData[this.currentData.length - 1].date}`);
            
        } catch (error) {
            console.error('❌ Error cargando datos reales:', error);
            this.updateDataStatus(`❌ Error: ${error.message}`, 'error');
            this.showNotification('Error cargando datos: ' + error.message, 'error');
            throw error;
        }
    }

    async trainModel() {
        if (this.isTrainingModel) {
            this.showNotification('⏳ El modelo ya se está entrenando...', 'warning');
            return;
        }

        if (this.currentData.length < 200) {
            this.showNotification('❌ Se necesitan al menos 200 datos reales para entrenar', 'error');
            return;
        }

        this.isTrainingModel = true;
        this.updateDataStatus('🧠 Entrenando modelo TensorFlow...', 'loading');
        
        // ✅ Mostrar indicador de progreso
        if (window.trainingProgress) {
            window.trainingProgress.show(this.currentInstrument);
        }

        try {
            console.log('🧠 Iniciando entrenamiento TensorFlow...');
            
            // Entrenar con datos reales
            const result = await this.mlModel.trainOnRealData(this.currentData, 30);
            
            console.log(`✅ Entrenamiento completado - Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
            
            // ✅ Marcar como completado en indicador
            if (window.trainingProgress) {
                window.trainingProgress.complete(result.accuracy);
            }
            
            // Actualizar UI
            this.updateModelMetrics();
            this.updateDataStatus(`✅ Modelo entrenado (${(result.accuracy * 100).toFixed(2)}%)`, 'success');
            this.showNotification(`🎯 Modelo entrenado! Accuracy: ${(result.accuracy * 100).toFixed(2)}%`, 'success');
            
        } catch (error) {
            console.error('❌ Error durante entrenamiento:', error);
            this.updateDataStatus('❌ Error entrenando modelo', 'error');
            this.showNotification('❌ Error: ' + error.message, 'error');
            
            // ✅ Mostrar error en indicador
            if (window.trainingProgress) {
                window.trainingProgress.error(error.message);
            }
        } finally {
            this.isTrainingModel = false;
        }
    }

    async generatePrediction() {
        if (!this.mlModel || !this.mlModel.isTrained) {
            this.showNotification('⚠️ Entrena el modelo primero', 'warning');
            return;
        }

        if (this.currentData.length < 60) {
            this.showNotification('❌ Datos insuficientes para predicción', 'error');
            return;
        }

        try {
            console.log('🔮 Generando predicción TensorFlow...');
            
            const prediction = await this.mlModel.predict(this.currentData);
            
            // Actualizar UI con predicción
            this.updatePredictionDisplay(prediction);
            
            console.log(`✅ Predicción: ${prediction.direction} (${prediction.confidence.toFixed(1)}%)`);
            
        } catch (error) {
            console.error('Error generando predicción:', error);
            this.showNotification('❌ Error en predicción', 'error');
        }
    }

    async generateAdvancedSignal() {
        if (!this.mlModel || !this.mlModel.isTrained) {
            this.showNotification('⚠️ Entrena el modelo TensorFlow primero', 'warning');
            return;
        }

        if (this.currentData.length < 100) {
            this.showNotification('❌ Datos insuficientes (mínimo 100)', 'error');
            return;
        }

        try {
            console.log('🎯 Generando señal avanzada de trading...');
            this.updateDataStatus('🎯 Analizando mercado...', 'loading');
            
            const signal = await this.tradingSystem.generateTradingSignal(
                this.currentInstrument,
                this.currentData
            );
            
            // Mostrar señal en interfaz
            this.updateTradingSignalsDisplay(signal);
            
            // Guardar señal en Firebase
            await this.saveSignalToFirebase(signal);
            
            // Mostrar notificación si es fuerte
            if (signal.confidence > 0.70 && signal.riskReward >= 1.5 && signal.action !== 'HOLD') {
                this.showNotification(
                    `🎯 ${signal.action} | Conf: ${(signal.confidence * 100).toFixed(1)}% | R/R: ${signal.riskReward.toFixed(2)}:1`,
                    'success'
                );
            }
            
            this.updateDataStatus(`✅ Señal ${signal.action} generada`, 'success');
            
        } catch (error) {
            console.error('❌ Error generando señal:', error);
            this.updateDataStatus('❌ Error generando señal', 'error');
        }
    }

    async saveSignalToFirebase(signal) {
        try {
            await firebase.firestore()
                .collection('trading_signals')
                .doc(signal.id)
                .set({
                    ...signal,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            console.log('✅ Señal guardada en Firebase');
        } catch (error) {
            console.error('Error guardando señal:', error);
        }
    }

    updateTradingSignalsDisplay(signal) {
        const signalsContainer = document.getElementById('tradingSignals');
        if (!signalsContainer) return;
        
        const signalElement = this.createSignalElement(signal);
        signalsContainer.innerHTML = signalElement + signalsContainer.innerHTML;
        
        // Limitar a 5 señales
        const allSignals = signalsContainer.querySelectorAll('.trading-signal');
        if (allSignals.length > 5) {
            allSignals[allSignals.length - 1].remove();
        }
    }

    createSignalElement(signal) {
        const riskRewardClass = signal.riskReward >= 2 ? 'high-rr' : signal.riskReward >= 1.5 ? 'medium-rr' : 'low-rr';
        const confidenceClass = signal.confidence > 0.8 ? 'high' : signal.confidence > 0.6 ? 'medium' : 'low';
        
        return `
            <div class="trading-signal ${signal.action.toLowerCase()}">
                <div class="signal-header">
                    <span class="signal-action">${signal.action}</span>
                    <span class="signal-confidence confidence-${confidenceClass}">
                        ${(signal.confidence * 100).toFixed(1)}%
                    </span>
                </div>
                
                <div class="signal-levels">
                    <div class="level">
                        <span>🎯 Entrada:</span>
                        <span class="price">${signal.entryPrice.toFixed(5)}</span>
                    </div>
                    <div class="level">
                        <span>🛑 Stop Loss:</span>
                        <span class="price">${signal.stopLoss.toFixed(5)}</span>
                    </div>
                    <div class="level">
                        <span>💰 Take Profit:</span>
                        <span class="price">${signal.takeProfit.toFixed(5)}</span>
                    </div>
                </div>
                
                <div class="signal-metrics">
                    <span class="rr-ratio ${riskRewardClass}">R/R: ${signal.riskReward.toFixed(2)}:1</span>
                    <span class="position-size">Tamaño: ${signal.positionSize.toFixed(1)}%</span>
                </div>
                
                <div class="signal-footer">
                    <span class="instrument">${signal.instrument}</span>
                    <span class="timestamp">Ahora</span>
                </div>
            </div>
        `;
    }

    updatePredictionDisplay(prediction) {
        const directionElement = document.getElementById('direction');
        if (directionElement) {
            const directionText = {
                'BUY': '↗ ALCISTA',
                'SELL': '↘ BAJISTA',
                'HOLD': '→ NEUTRAL'
            };
            
            directionElement.textContent = directionText[prediction.direction];
            directionElement.className = `confidence-${prediction.confidence > 80 ? 'high' : prediction.confidence > 60 ? 'medium' : 'low'}`;
        }
        
        const probabilityElement = document.getElementById('probability');
        if (probabilityElement) {
            probabilityElement.textContent = `${prediction.confidence.toFixed(1)}%`;
            probabilityElement.className = `confidence-${prediction.confidence > 80 ? 'high' : prediction.confidence > 60 ? 'medium' : 'low'}`;
        }
    }

    updateModelMetrics() {
        if (!this.mlModel) return;
        
        const info = this.mlModel.getModelInfo();
        
        // Actualizar accuracy metric
        const accuracyElement = document.getElementById('accuracyMetric');
        if (accuracyElement) {
            accuracyElement.textContent = `${(info.accuracy * 100).toFixed(1)}%`;
            accuracyElement.className = `metric-value confidence-${info.accuracy > 0.7 ? 'high' : info.accuracy > 0.6 ? 'medium' : 'low'}`;
        }
    }

    updateDataStatus(message, type = 'info') {
        const statusText = document.getElementById('statusText');
        const colors = {
            loading: '#00f5ff',
            success: '#00ff88', 
            error: '#ff4757',
            warning: '#ffa726',
            info: '#00f5ff'
        };
        
        if (statusText) {
            statusText.textContent = message;
            statusText.style.color = colors[type] || colors.info;
        }
        
        const sourceText = document.getElementById('sourceText');
        if (sourceText) {
            sourceText.textContent = 'TwelveData-Real';
            sourceText.style.color = '#00ff88';
        }
    }

    updateCandleCount() {
        const candleCount = document.getElementById('candleCount');
        if (candleCount) {
            candleCount.textContent = `${this.currentData.length} reales`;
        }
    }

    updateCurrentPrice() {
        if (this.currentData.length === 0) return;
        
        const lastCandle = this.currentData[this.currentData.length - 1];
        const currentPrice = parseFloat(lastCandle.close);
        
        let change = 0;
        let changePercent = 0;
        
        if (this.currentData.length > 1) {
            const prevPrice = parseFloat(this.currentData[this.currentData.length - 2].close);
            change = currentPrice - prevPrice;
            changePercent = (change / prevPrice) * 100;
        }
        
        const chartTitle = document.getElementById('chartTitle');
        if (chartTitle) {
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(5)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            const changeClass = change >= 0 ? 'price-up' : 'price-down';
            
            chartTitle.innerHTML = `
                ${this.currentInstrument} - DATOS REALES
                <div style="font-size: 0.8em; margin-top: 5px;">
                    <span style="color: #00f5ff; font-weight: bold;">${currentPrice.toFixed(5)}</span>
                    <span class="${changeClass}" style="margin-left: 10px;">${changeText}</span>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const instrumentSelect = document.getElementById('instrumentSelect');
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', () => {
                this.changeInstrument(instrumentSelect.value);
            });
        }
    }

    async changeInstrument(instrument) {
        this.currentInstrument = instrument;
        console.log(`📊 Cambiando a ${instrument}...`);
        
        try {
            // Cargar datos reales del nuevo instrumento
            await this.loadRealData();
            
            // Reinicializar modelo TensorFlow para nuevo instrumento
            await this.initializeTensorFlowModel();
            
            // Reinicializar sistema de trading
            await this.initializeTradingSystem();
            
            this.showNotification(`✅ Cambiado a ${instrument}`, 'success');
            
        } catch (error) {
            console.error('Error cambiando instrumento:', error);
            this.showNotification('❌ Error cambiando instrumento', 'error');
        }
    }

    setupAutomaticUpdates() {
        // Actualizar datos cada 5 minutos
        this.dataUpdateInterval = setInterval(async () => {
            try {
                const newData = await getTwelveDataReal(this.currentInstrument, '15min', 10);
                
                if (newData && newData.length > 0) {
                    const lastTimestamp = this.currentData[this.currentData.length - 1].timestamp;
                    const newCandles = newData.filter(c => c.timestamp > lastTimestamp);
                    
                    if (newCandles.length > 0) {
                        this.currentData = [...this.currentData, ...newCandles].slice(-5000);
                        this.chart.render(this.currentData.slice(-100));
                        this.updateCurrentPrice();
                        console.log(`🔄 ${newCandles.length} nuevas velas actualizadas`);
                    }
                }
            } catch (error) {
                console.warn('Error actualizando datos:', error);
            }
        }, 300000); // 5 minutos
    }

    showNotification(message, type = 'info') {
        this.alertSystem.showInAppNotification(message, type);
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(tabName)) {
                tab.classList.add('active');
            }
        });
    }

    enableNotifications() {
        this.alertSystem.requestNotificationPermission();
    }

    testAlert() {
        this.alertSystem.testAlert();
    }

    cleanup() {
        if (this.dataUpdateInterval) clearInterval(this.dataUpdateInterval);
        if (this.signalUpdateInterval) clearInterval(this.signalUpdateInterval);
        console.log('🧹 Cleanup completado');
    }
}

// Instancia global
let app;

// Funciones globales
async function loadRealData() {
    if (app) await app.loadRealData();
}

async function trainModel() {
    if (app) await app.trainModel();
}

async function generatePrediction() {
    if (app) await app.generatePrediction();
}

async function generateAdvancedSignal() {
    if (app) await app.generateAdvancedSignal();
}

function enableNotifications() {
    if (app) app.enableNotifications();
}

function testAlert() {
    if (app) app.testAlert();
}

function switchTab(tabName) {
    if (app) app.switchTab(tabName);
}

async function testTwelveConnection() {
    await testTwelveDataConnection();
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 Iniciando ML Forex Trading Platform con TensorFlow.js...');
    
    // Verificar dependencias críticas
    if (typeof tf === 'undefined') {
        console.error('❌ TensorFlow.js no está cargado!');
        alert('ERROR: TensorFlow.js no está cargado. Verifica que el script esté en index.html');
        return;
    }
    
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase no está cargado!');
        alert('ERROR: Firebase no está cargado. Verifica que el script esté en index.html');
        return;
    }
    
    console.log('✅ TensorFlow.js versión:', tf.version.tfjs);
    console.log('✅ Firebase versión:', firebase.SDK_VERSION);
    
    app = new ForexTradingApp();
    await app.init();
    
    window.forexApp = app;
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('❌ Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rechazada:', event.reason);
});

console.log('✅ main.js (TensorFlow) cargado correctamente');