// main.js - VERSIÓN COMPLETA CON SISTEMA DE TRADING AVANZADO
class ForexTradingApp {
    constructor() {
        this.currentInstrument = 'USDZAR';
        this.currentData = [];
        this.isTrainingModel = false;
        this.usingRealData = false;
        this.tradingSystem = null;
        
        // Inicializar componentes PRIMERO
        this.chart = new CandlestickChart('candlesContainer');
        this.dataGenerator = new MarketDataGenerator();
        this.mlModel = new ForexMLModel();
        this.alertSystem = new TradingAlerts();
        
        // Inicializar trading system DESPUÉS
        this.tradingSystem = new AdvancedTradingSystem();
        
        this.dataUpdateInterval = null;
        this.signalUpdateInterval = null;
    }

    // ✅ INICIALIZAR CON SISTEMA AVANZADO
    async init() {
        console.log('🚀 Inicializando ML Forex Platform con Sistema de Trading Avanzado...');
        
        try {
            await this.alertSystem.init();
            await this.loadRealData();
            
            this.setupEventListeners();
            this.setupUpdateIntervals();
            
            // Iniciar sistema de trading
            await this.initializeTradingSystem();
            
            console.log('✅ Aplicación inicializada correctamente con Sistema de Trading');
            this.showNotification('🚀 Sistema de Trading Avanzado activo', 'success');
            
        } catch (error) {
            console.error('❌ Error inicializando aplicación:', error);
            this.showNotification('❌ Error iniciando, usando simulación', 'error');
            await this.loadSimulatedData();
        }
    }

    // ✅ INICIALIZAR SISTEMA DE TRADING
// En main.js - MODIFICAR initializeTradingSystem:

async initializeTradingSystem() {
    console.log('🎯 Inicializando sistema de trading con persistencia...');
    
    // Mostrar estado del modelo cargado
    if (this.tradingSystem.mlModel.isTrained) {
        const stats = this.tradingSystem.mlModel.getEvolutionStats();
        console.log('📊 Modelo cargado desde persistencia:', stats);
        
        // Actualizar UI con métricas de evolución
        this.updateEvolutionMetrics(stats);
    }
    
    if (this.currentData.length >= 50) {
        setTimeout(() => {
            this.generateAdvancedSignal();
        }, 3000);
    }
    
    this.updateTradingStats();
}

// ✅ NUEVA FUNCIÓN: ACTUALIZAR MÉTRICAS DE EVOLUCIÓN
updateEvolutionMetrics(stats) {
    const evolutionElement = document.getElementById('evolutionMetrics');
    if (!evolutionElement) return;
    
    evolutionElement.innerHTML = `
        <div style="background: rgba(0, 245, 255, 0.1); padding: 15px; border-radius: 10px; margin-top: 10px;">
            <h4 style="color: #00f5ff; margin-bottom: 10px;">📈 Evolución del Modelo</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8em;">
                <div>Sesiones: <strong>${stats.trainingSessions}</strong></div>
                <div>Accuracy: <strong>${(stats.currentAccuracy * 100).toFixed(1)}%</strong></div>
                <div>Predicciones: <strong>${stats.totalPredictions}</strong></div>
                <div>Tendencia: <strong style="color: ${
                    stats.performanceTrend === 'improving' ? '#00ff88' : 
                    stats.performanceTrend === 'declining' ? '#ff4757' : '#ffa726'
                }">${stats.performanceTrend}</strong></div>
            </div>
        </div>
    `;
}

    // ✅ GENERAR SEÑAL AVANZADA DE TRADING
    async generateAdvancedSignal() {
        if (this.currentData.length < 50) {
            this.showNotification('❌ Datos insuficientes para generar señal', 'error');
            return;
        }

        try {
            console.log('🎯 Generando señal de trading avanzada...');
            this.updateDataStatus('🎯 Analizando mercado...', 'loading');
            
            const signal = await this.tradingSystem.generateTradingSignal(
                this.currentInstrument, 
                this.currentData
            );
            
            // Mostrar señal en la interfaz
            this.updateTradingSignalsDisplay(signal);
            
            // Actualizar estadísticas
            this.updateTradingStats();
            
            // Mostrar notificación si la señal es fuerte
            if (signal.confidence > 0.7 && signal.action !== 'HOLD') {
                this.showNotification(
                    `🎯 ${signal.action} | Conf: ${(signal.confidence * 100).toFixed(1)}% | R/R: ${signal.riskReward.toFixed(2)}:1`,
                    'success'
                );
            }
            
            this.updateDataStatus(`✅ Señal ${signal.action} generada`, 'success');
            
        } catch (error) {
            console.error('❌ Error generando señal avanzada:', error);
            this.updateDataStatus('❌ Error generando señal', 'error');
        }
    }

    // ✅ ACTUALIZAR ESTADÍSTICAS DE TRADING
    updateTradingStats() {
        const stats = this.tradingSystem.getPerformanceStats();
        
        // Actualizar UI con estadísticas
        const statsElement = document.getElementById('tradingStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8em;">
                    <div>Señales: <strong>${stats.totalSignals}</strong></div>
                    <div>Operaciones: <strong>${stats.totalTrades}</strong></div>
                    <div>Win Rate: <strong style="color: #00ff88">${stats.winRate}</strong></div>
                    <div>R/R Prom: <strong>${stats.avgRiskReward}</strong></div>
                </div>
            `;
        }
    }

    // ✅ ACTUALIZAR INTERFAZ DE SEÑALES
    updateTradingSignalsDisplay(signal) {
        const signalsContainer = document.getElementById('tradingSignals');
        if (!signalsContainer) return;
        
        const signalElement = this.createSignalElement(signal);
        
        // Agregar nueva señal al inicio
        signalsContainer.innerHTML = signalElement + signalsContainer.innerHTML;
        
        // Limitar a 5 señales visibles
        const allSignals = signalsContainer.querySelectorAll('.trading-signal');
        if (allSignals.length > 5) {
            allSignals[allSignals.length - 1].remove();
        }
    }

    // ✅ CREAR ELEMENTO DE SEÑAL
    createSignalElement(signal) {
        const riskRewardClass = signal.riskReward >= 2 ? 'high-rr' : signal.riskReward >= 1.5 ? 'medium-rr' : 'low-rr';
        const confidenceClass = signal.confidence > 0.8 ? 'high' : signal.confidence > 0.6 ? 'medium' : 'low';
        const timeAgo = this.getTimeAgo(signal.timestamp);
        
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
                        <span class="price">${signal.entryPrice.toFixed(4)}</span>
                    </div>
                    <div class="level">
                        <span>🛑 Stop Loss:</span>
                        <span class="price">${signal.stopLoss.toFixed(4)}</span>
                    </div>
                    <div class="level">
                        <span>💰 Take Profit:</span>
                        <span class="price">${signal.takeProfit.toFixed(4)}</span>
                    </div>
                </div>
                
                <div class="signal-metrics">
                    <span class="rr-ratio ${riskRewardClass}">R/R: ${signal.riskReward.toFixed(2)}:1</span>
                    <span class="position-size">Tamaño: ${signal.positionSize.toFixed(1)}%</span>
                </div>
                
                <div class="signal-footer">
                    <span class="instrument">${signal.instrument}</span>
                    <span class="timestamp">${timeAgo}</span>
                </div>
            </div>
        `;
    }

    // ✅ CALCULAR TIEMPO TRANSCURRIDO
    getTimeAgo(timestamp) {
        const now = new Date();
        const signalTime = new Date(timestamp);
        const diff = now - signalTime;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `Hace ${hours}h`;
        if (minutes > 0) return `Hace ${minutes}m`;
        return 'Ahora';
    }

    // ✅ CARGA DATOS REALES DESDE TWELVE DATA
// En main.js - MODIFICA loadRealData para cargar más datos:
async loadRealData() {
    console.log(`📊 Cargando datos REALES para ${this.currentInstrument}...`);
    
    this.chart.showLoadingState();
    this.updateDataStatus('🌐 Conectando a Twelve Data...', 'loading');
    
    try {
        // CARGAR MÁS DATOS (200 en lugar de 100)
        this.currentData = await getTwelveDataReal(this.currentInstrument, '15min', 200);
        this.usingRealData = true;
        
        // Validar datos
        this.validateRealData();
        
        // Actualizar UI
        this.chart.render(this.currentData.slice(-100)); // Mostrar solo últimos 100 en gráfico
        this.updateCurrentPrice();
        this.updateDataStatus(`✅ ${this.currentData.length} velas REALES cargadas`, 'success');
        this.updateCandleCount();
        
        console.log(`✅ Datos REALES cargados: ${this.currentData.length} velas`);
        
    } catch (error) {
        console.error('❌ Error cargando datos reales:', error);
        this.updateDataStatus(`❌ Error: ${error.message}`, 'error');
        throw error;
    }
}

    // ✅ FALLBACK A DATOS SIMULADOS
    async loadSimulatedData() {
        console.log('🔄 Usando datos simulados...');
        
        this.updateDataStatus('🎮 Cargando datos simulados...', 'warning');
        
        this.currentData = this.dataGenerator.generateHistoricalData(this.currentInstrument, 100);
        this.usingRealData = false;
        
        this.chart.render(this.currentData);
        this.updateCurrentPrice();
        this.updateDataStatus('⚠️ Usando datos simulados', 'warning');
        this.updateCandleCount();
        
        console.log('✅ Datos simulados cargados');
    }

    // ✅ VALIDAR CALIDAD DE DATOS REALES
    validateRealData() {
        if (!this.currentData || this.currentData.length === 0) {
            throw new Error('No se recibieron datos');
        }
        
        const first = this.currentData[0];
        if (!first.isRealData) {
            throw new Error('Datos no marcados como reales');
        }
        
        // Verificar precios realistas
        const prices = this.currentData.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        if (minPrice <= 0 || maxPrice <= 0) {
            throw new Error('Precios inválidos en datos');
        }
        
        console.log('🔍 Validación OK:', {
            velas: this.currentData.length,
            rangoPrecio: `${minPrice.toFixed(4)} - ${maxPrice.toFixed(4)}`,
            fuente: first.source
        });
    }

    // ✅ ACTUALIZAR ESTADO DE DATOS EN UI
    updateDataStatus(message, type = 'info') {
        const statusElement = document.getElementById('dataStatus');
        const statusText = document.getElementById('statusText');
        
        if (!statusElement || !statusText) return;
        
        const colors = {
            loading: '#00f5ff',
            success: '#00ff88', 
            error: '#ff4757',
            warning: '#ffa726',
            info: '#00f5ff'
        };
        
        statusText.textContent = message;
        statusText.style.color = colors[type] || colors.info;
        
        // Actualizar fuente de datos
        const sourceText = document.getElementById('sourceText');
        if (sourceText) {
            sourceText.textContent = this.usingRealData ? 'TwelveData-Real' : 'Simulación';
            sourceText.style.color = this.usingRealData ? '#00ff88' : '#ffa726';
        }
    }

    // ✅ ACTUALIZAR CONTADOR DE VELAS
    updateCandleCount() {
        const candleCount = document.getElementById('candleCount');
        if (candleCount) {
            candleCount.textContent = `${this.currentData.length} ${this.usingRealData ? 'reales' : 'simuladas'}`;
        }
    }

    // ✅ ACTUALIZAR PRECIO ACTUAL EN UI
    updateCurrentPrice() {
        if (this.currentData.length === 0) return;
        
        const lastCandle = this.currentData[this.currentData.length - 1];
        const currentPrice = parseFloat(lastCandle.close);
        
        // Calcular cambio vs vela anterior
        let change = 0;
        let changePercent = 0;
        
        if (this.currentData.length > 1) {
            const prevPrice = parseFloat(this.currentData[this.currentData.length - 2].close);
            change = currentPrice - prevPrice;
            changePercent = (change / prevPrice) * 100;
        }
        
        // Actualizar en header del gráfico
        const chartTitle = document.getElementById('chartTitle');
        if (chartTitle) {
            const decimals = this.currentInstrument === 'XAUUSD' ? 2 : 4;
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(decimals)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            const changeClass = change >= 0 ? 'price-up' : 'price-down';
            
            chartTitle.innerHTML = `
                ${this.currentInstrument} - ${this.usingRealData ? 'DATOS REALES' : 'Simulación'}
                <div style="font-size: 0.8em; margin-top: 5px;">
                    <span style="color: #00f5ff; font-weight: bold;">${currentPrice.toFixed(decimals)}</span>
                    <span class="${changeClass}" style="margin-left: 10px;">${changeText}</span>
                </div>
            `;
        }
    }

    // ✅ CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Selector de instrumento original
        const instrumentSelect = document.getElementById('instrumentSelect');
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', () => {
                this.changeInstrument(instrumentSelect.value);
            });
        }
        
        // Selector de fuente de datos (nuevo)
        const dataSourceSelect = document.getElementById('dataSourceSelect');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', (e) => {
                if (e.target.value === 'real') {
                    this.loadRealData();
                } else {
                    this.loadSimulatedData();
                }
            });
        }
        
        // Configuración de alertas
        this.setupAlertEventListeners();
    }

    // ✅ CONFIGURAR EVENT LISTENERS DE ALERTAS
    setupAlertEventListeners() {
        // Slider de confianza si existe
        const confidenceSlider = document.getElementById('confidenceThreshold');
        const confidenceValue = document.getElementById('confidenceValue');
        
        if (confidenceSlider && confidenceValue) {
            confidenceSlider.addEventListener('input', (e) => {
                confidenceValue.textContent = e.target.value + '%';
            });
        }
    }

    // ✅ CONFIGURAR INTERVALOS DE ACTUALIZACIÓN
    setupUpdateIntervals() {
        // Actualizar datos cada 2 minutos si son reales
        if (this.usingRealData) {
            this.setupRealTimeUpdates();
        }
        
        // Generar señales cada 5 minutos
        this.signalUpdateInterval = setInterval(() => {
            if (this.currentData.length >= 50) {
                this.generateAdvancedSignal();
            }
        }, 5 * 60 * 1000); // 5 minutos
        
        // Limpiar alertas cada 5 minutos
        setInterval(() => {
            this.alertSystem.cleanup();
        }, 5 * 60 * 1000);
    }

    // ✅ ACTUALIZACIÓN EN TIEMPO REAL (solo para datos reales)
    setupRealTimeUpdates() {
        // Actualizar cada 2 minutos para no exceder límites de API
        this.dataUpdateInterval = setInterval(async () => {
            if (!this.usingRealData) return;
            
            try {
                const newData = await getTwelveDataReal(this.currentInstrument, '15min', 5);
                if (newData && newData.length > 0) {
                    // Agregar nuevas velas (evitando duplicados)
                    const lastTimestamp = this.currentData[this.currentData.length - 1].timestamp;
                    const newCandles = newData.filter(candle => candle.timestamp > lastTimestamp);
                    
                    if (newCandles.length > 0) {
                        this.currentData = [...this.currentData, ...newCandles].slice(-100);
                        this.chart.render(this.currentData);
                        this.updateCurrentPrice();
                        this.updateCandleCount();
                        
                        console.log('🔄 Datos actualizados en tiempo real:', newCandles.length, 'nuevas velas');
                    }
                }
            } catch (error) {
                console.warn('Error actualización tiempo real:', error);
            }
        }, 120000); // 2 minutos
    }

    // ✅ CAMBIAR INSTRUMENTO
    async changeInstrument(instrument) {
        this.currentInstrument = instrument;
        
        try {
            if (this.usingRealData) {
                await this.loadRealData();
            } else {
                await this.loadSimulatedData();
            }
            
            // Reiniciar sistema de trading para nuevo instrumento
            this.tradingSystem = new AdvancedTradingSystem();
            this.initializeTradingSystem();
            
        } catch (error) {
            console.error('Error cambiando instrumento:', error);
            this.showNotification('❌ Error cargando instrumento', 'error');
        }
    }

    // ✅ PROBAR CONEXIÓN REAL
    async testRealConnection() {
        this.updateDataStatus('🧪 Probando conexión...', 'loading');
        
        try {
            const result = await testTwelveDataConnection();
            this.updateDataStatus(result.message, result.success ? 'success' : 'error');
            this.showNotification(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            this.updateDataStatus('❌ Error probando conexión', 'error');
            this.showNotification('❌ Error probando conexión', 'error');
        }
    }

    // ✅ ENTRENAR MODELO ML
    async trainModel() {
        if (this.isTrainingModel) {
            this.showNotification('⏳ El modelo ya se está entrenando...', 'warning');
            return;
        }

        if (this.currentData.length < 50) {
            this.showNotification('❌ Datos insuficientes. Carga más datos primero.', 'error');
            return;
        }

        this.isTrainingModel = true;
        this.updateDataStatus('🧠 Entrenando modelo IA...', 'loading');
        
        const trainButton = document.querySelector('button[onclick="trainModel()"]');
        if (trainButton) {
            const originalText = trainButton.textContent;
            trainButton.textContent = '🧠 Entrenando...';
            trainButton.disabled = true;

            try {
                console.log('🧠 Iniciando entrenamiento del modelo ML...');
                const accuracy = await this.mlModel.trainWithBacktest(this.currentData);
                
                this.updateModelMetrics(accuracy);
                this.updateDataStatus(`✅ Modelo entrenado (${(accuracy.accuracy * 100).toFixed(1)}%)`, 'success');
                this.showNotification(`🎯 Modelo entrenado! Precisión: ${(accuracy.accuracy * 100).toFixed(1)}%`, 'success');
                
            } catch (error) {
                console.error('Error entrenando modelo:', error);
                this.updateDataStatus('❌ Error entrenando modelo', 'error');
                this.showNotification('❌ Error entrenando el modelo: ' + error.message, 'error');
            } finally {
                this.isTrainingModel = false;
                trainButton.textContent = originalText;
                trainButton.disabled = false;
            }
        }
    }

    // ✅ ACTUALIZAR MÉTRICAS DEL MODELO EN UI
    updateModelMetrics(accuracy) {
        // Actualizar precisión en las tarjetas de métricas
        const metricCards = document.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            const valueElement = card.querySelector('.metric-value');
            const labelElement = card.querySelector('.metric-label');
            
            if (valueElement && labelElement) {
                if (labelElement.textContent.includes('Precisión')) {
                    valueElement.textContent = `${(accuracy.accuracy * 100).toFixed(1)}%`;
                    valueElement.className = `metric-value confidence-${accuracy.accuracy > 0.7 ? 'high' : accuracy.accuracy > 0.6 ? 'medium' : 'low'}`;
                } else if (labelElement.textContent.includes('Pips')) {
                    valueElement.textContent = `+${Math.floor(accuracy.totalProfit * 100)}`;
                }
            }
        });
    }

    // ✅ GENERAR PREDICCIÓN ML BÁSICA
    generatePrediction() {
        if (!this.mlModel.isTrained) {
            this.showNotification('⚠️ Entrena el modelo primero', 'warning');
            return;
        }

        if (this.currentData.length < 30) {
            this.showNotification('❌ Datos insuficientes para predicción', 'error');
            return;
        }

        try {
            console.log('🔮 Generando predicción ML...');
            
            // Calcular características técnicas
            const features = TechnicalIndicators.calculateFeatures(this.currentData);
            const prediction = this.mlModel.predict(this.currentData, features);
            
            // Actualizar UI con predicción
            this.updatePredictionDisplay(prediction);
            
            console.log(`✅ Predicción generada: ${prediction.direction} (${prediction.confidence.toFixed(1)}%)`);
            
        } catch (error) {
            console.error('Error generando predicción:', error);
            this.showNotification('❌ Error generando predicción', 'error');
        }
    }

    // ✅ ACTUALIZAR DISPLAY DE PREDICCIÓN BÁSICA
    updatePredictionDisplay(prediction) {
        const direction = prediction.direction;
        const confidence = prediction.confidence;
        
        // Actualizar dirección
        const directionElement = document.getElementById('direction');
        if (directionElement) {
            const directionText = {
                'BUY': '↗ ALCISTA',
                'SELL': '↘ BAJISTA',
                'HOLD': '→ NEUTRAL'
            };
            
            directionElement.textContent = directionText[direction];
            directionElement.className = `confidence-${confidence > 80 ? 'high' : confidence > 60 ? 'medium' : 'low'}`;
        }
        
        // Actualizar probabilidad
        const probabilityElement = document.getElementById('probability');
        if (probabilityElement) {
            probabilityElement.textContent = `${confidence.toFixed(1)}%`;
            probabilityElement.className = `confidence-${confidence > 80 ? 'high' : confidence > 60 ? 'medium' : 'low'}`;
        }
        
        // Actualizar precios objetivo
        const decimals = this.currentInstrument === 'XAUUSD' ? 2 : 4;
        const targetElement = document.getElementById('targetPrice');
        if (targetElement) {
            targetElement.textContent = prediction.targetPrice.toFixed(decimals);
        }
    }

    // ✅ ALTERNAR TABS
    switchTab(tabName) {
        // Ocultar todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remover clase active de todos los tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Mostrar contenido seleccionado
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Activar tab seleccionado
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(tabName)) {
                tab.classList.add('active');
            }
        });
    }

    // ✅ HABILITAR NOTIFICACIONES
    async enableNotifications() {
        await this.alertSystem.requestNotificationPermission();
    }

    // ✅ PROBAR ALERTA
    testAlert() {
        this.alertSystem.testAlert();
    }

    // ✅ MOSTRAR NOTIFICACIÓN
    showNotification(message, type = 'info') {
        this.alertSystem.showInAppNotification(message, type);
    }

    // ✅ LIMPIAR RECURSOS
    cleanup() {
        if (this.dataUpdateInterval) {
            clearInterval(this.dataUpdateInterval);
        }
        if (this.signalUpdateInterval) {
            clearInterval(this.signalUpdateInterval);
        }
        console.log('🧹 Cleanup completado');
    }
}

// ✅ FUNCIONES GLOBALES PARA LLAMAR DESDE HTML
let app;

function loadRealData() {
    if (app) app.loadRealData();
}

function loadSimulatedData() {
    if (app) app.loadSimulatedData();
}

function testRealConnection() {
    if (app) app.testRealConnection();
}

function loadInstrumentData() {
    if (app) {
        const instrument = document.getElementById('instrumentSelect').value;
        app.changeInstrument(instrument);
    }
}

function trainModel() {
    if (app) app.trainModel();
}

function generatePrediction() {
    if (app) app.generatePrediction();
}

function generateAdvancedSignal() {
    if (app) app.generateAdvancedSignal();
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

// ✅ INICIALIZAR APLICACIÓN CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 Iniciando ML Forex Trading Platform con Sistema Avanzado...');
    
    app = new ForexTradingApp();
    await app.init();
    
    // Hacer disponible globalmente para debugging
    window.forexApp = app;
});

// ✅ MANEJAR ERRORES GLOBALES
window.addEventListener('error', (event) => {
    console.error('❌ Error global:', event.error);
    if (window.forexApp) {
        window.forexApp.showNotification('❌ Error inesperado en la aplicación', 'error');
    }
});

// ✅ MANEJAR ERRORES DE PROMESAS
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rechazada:', event.reason);
    if (window.forexApp) {
        window.forexApp.showNotification('❌ Error en operación asíncrona', 'error');
    }
});

console.log('✅ main.js cargado correctamente');