// main.js - SISTEMA PRINCIPAL CON TENSORFLOW.JS (CORREGIDO)
class ForexTradingApp {
constructor() {
    this.currentInstrument = 'EURUSD';
    this.currentData = [];
    this.isTrainingModel = false;
    this.mlModel = null;
    this.tradingSystem = null;
    
    this.chart = new CandlestickChart('candlesContainer');
    this.alertSystem = new TradingAlerts();
    // ELIMINAR: this.signalTracker = new SignalTracker();
    this.signalTracker = null; // CAMBIAR A NULL
    this.manualChecker = null; // AGREGAR
    
    this.dataUpdateInterval = null;
    this.signalUpdateInterval = null;
}

async init() {
    console.log('🚀 Inicializando ML Forex Platform con TensorFlow.js...');
    
    try {
        // 1. Firebase
        await this.initializeFirebase();
        
        // AGREGAR ESTAS 2 LÍNEAS AQUÍ:
        // 2. Inicializar SignalTracker DESPUÉS de Firebase
        this.signalTracker = new SignalTracker();
        this.manualChecker = new ManualSignalChecker(this.signalTracker); // AGREGAR
        
        // 3. Alertas (con protección)
        try {
            await this.alertSystem.init();
        } catch (e) {
            console.warn('Alertas fallaron, continuando...');
        }
        
        // 2. Alertas (con protección)
        try {
            await this.alertSystem.init();
        } catch (e) {
            console.warn('Alertas fallaron, continuando...');
        }
        
        // 3. Datos
        await this.loadRealData();
        
        // 4. CRÍTICO: Modelo TensorFlow
        console.log('Inicializando modelo TensorFlow...');
        await this.initializeTensorFlowModel();
        console.log('Modelo TensorFlow inicializado');
        
        // 5. Trading system
        await this.initializeTradingSystem();
        
        // 6. Resto
        this.setupEventListeners();
        this.setupAutomaticUpdates();
        this.initializeLearningDashboard();
        await this.initializeAutoTraining();
        
        console.log('✅ Todo inicializado');
        this.showNotification('🚀 Sistema activo', 'success');

        // Habilitar botón de entrenamiento
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            trainButton.disabled = false;
            trainButton.style.opacity = '1';
            trainButton.style.cursor = 'pointer';
            trainButton.textContent = 'Entrenar Modelo';
        }
        
    } catch (error) {
        console.error('❌ Error en init:', error);
        console.error('Stack:', error.stack);
        this.showNotification('❌ Error: ' + error.message, 'error');
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
            this.currentData = await getTwelveDataReal(this.currentInstrument, '15min', 5000);
            
            if (!this.currentData || this.currentData.length === 0) {
                throw new Error('No se recibieron datos');
            }

            if (!this.currentData[0].isRealData) {
                throw new Error('Los datos no están marcados como reales');
            }
            
            this.chart.render(this.currentData.slice(-100));
            
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
        const startTime = Date.now();
        
        this.updateDataStatus('🧠 Entrenando modelo TensorFlow...', 'loading');
        
        // Mostrar indicador de progreso
        if (window.trainingProgress) {
            window.trainingProgress.show(this.currentInstrument);
        }

        // Deshabilitar botón de entrenamiento
        const trainButton = document.querySelector('button[onclick="trainModel()"]');
        if (trainButton) {
            trainButton.disabled = true;
            trainButton.textContent = 'Entrenando...';
        }

        try {
            console.log('🧠 Iniciando entrenamiento TensorFlow...');
            console.log(`📊 Datos disponibles: ${this.currentData.length} velas`);
            
            // Entrenar con datos reales
            const result = await this.mlModel.trainOnRealData(this.currentData, 50);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            console.log(`✅ Entrenamiento completado en ${duration}s`);
            console.log(`📊 Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
            console.log(`📉 Loss: ${result.loss.toFixed(4)}`);
            console.log(`🎯 Distribución clases:`, result.classDistribution);
            
            // Marcar como completado en indicador
            if (window.trainingProgress) {
                window.trainingProgress.complete(result.accuracy);
            }
            
            // Actualizar UI
            this.updateModelMetrics();
            this.updateDataStatus(`✅ Modelo entrenado (${(result.accuracy * 100).toFixed(2)}%)`, 'success');
            
            // Notificación con métricas
            this.showNotification(
                `🎯 Modelo entrenado! Accuracy: ${(result.accuracy * 100).toFixed(2)}% en ${duration}s`,
                'success'
            );
            
            // Actualizar dashboard de aprendizaje si existe
// En lugar de updateModelStats, usa:
            if (window.learningDashboard) {
                window.learningDashboard.selectInstrument(this.currentInstrument);
            }
            
        } catch (error) {
            console.error('❌ Error durante entrenamiento:', error);
            console.error('Stack trace:', error.stack);
            
            this.updateDataStatus('❌ Error entrenando modelo', 'error');
            this.showNotification('❌ Error: ' + error.message, 'error');
            
            // Mostrar error en indicador
            if (window.trainingProgress) {
                window.trainingProgress.error(error.message);
            }
        } finally {
            this.isTrainingModel = false;
            
            // Rehabilitar botón
            if (trainButton) {
                trainButton.disabled = false;
                trainButton.textContent = 'Entrenar Ahora';
            }
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
        
        this.updateTradingSignalsDisplay(signal);
        
        await this.saveSignalToFirebase(signal);
        
        // NUEVO: Guardar en sistema de tracking
        if (signal.action !== 'HOLD') {
            await this.signalTracker.saveSignal(signal);
        }
        
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
            await this.loadRealData();
            await this.initializeTensorFlowModel();
            await this.initializeTradingSystem();
            
            this.showNotification(`✅ Cambiado a ${instrument}`, 'success');
            
        } catch (error) {
            console.error('Error cambiando instrumento:', error);
            this.showNotification('❌ Error cambiando instrumento', 'error');
        }
    }

    setupAutomaticUpdates() {
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
        }, 300000);
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
    async showPerformanceStats() {
        const stats = await this.signalTracker.calculatePerformanceStats(30);
        
        // Actualizar métricas en UI
        document.getElementById('performanceWinRate').textContent = stats.winRate.toFixed(1) + '%';
        document.getElementById('performanceTrades').textContent = stats.totalSignals;
        document.getElementById('performanceProfit').textContent = stats.totalPips.toFixed(1) + ' pips';
        
        if (stats.profitFactor > 0) {
            document.getElementById('performanceRR').textContent = stats.profitFactor.toFixed(2);
        }
        
        console.log('Performance Stats (30 días):', stats);
    }

    async showActiveSignals() {
        const signals = await this.signalTracker.getActiveSignals();
        console.log(`Señales activas: ${signals.length}`);
        signals.forEach(s => {
            console.log(`- ${s.action} ${s.instrument} @ ${s.entryPrice} (hace ${this.getTimeAgo(s.generatedAt)})`);
        });
        return signals;
    }

    async showSignalHistory() {
        const history = await this.signalTracker.getSignalHistory(20);
        console.log(`Historial: ${history.length} señales cerradas`);
        history.forEach(s => {
            const result = s.exitReason === 'TARGET_HIT' ? 'WIN' : 
                          s.exitReason === 'STOP_HIT' ? 'LOSS' : 'EXPIRED';
            console.log(`- ${result} ${s.action} ${s.instrument}: ${s.pips?.toFixed(1) || 0} pips`);
        });
        return history;
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    cleanup() {
        if (this.dataUpdateInterval) clearInterval(this.dataUpdateInterval);
        if (this.signalUpdateInterval) clearInterval(this.signalUpdateInterval);
        console.log('Cleanup completado');
    }
}


let app;

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 Iniciando ML Forex Trading Platform con TensorFlow.js...');
    
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

window.addEventListener('error', (event) => {
    console.error('❌ Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rechazada:', event.reason);
});


// AGREGAR AL FINAL DEL ARCHIVO:

async function showPerformanceStats() {
    if (app) await app.showPerformanceStats();
}

async function showActiveSignals() {
    if (app) return await app.showActiveSignals();
}

async function showSignalHistory() {
    if (app) return await app.showSignalHistory();
}

async function checkSignalsManually() {
    if (app && app.manualChecker) {
        await app.manualChecker.checkAllActiveSignals();
    }
}

window.checkSignalsManually = checkSignalsManually;

window.showPerformanceStats = showPerformanceStats;
window.showActiveSignals = showActiveSignals;
window.showSignalHistory = showSignalHistory;

console.log('✅ main.js (TensorFlow) cargado correctamente');
