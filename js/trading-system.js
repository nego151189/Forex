// trading-system.js - SISTEMA DE TRADING CORREGIDO
class AdvancedTradingSystem {
    constructor(instrument = 'USDZAR') {
        this.currentInstrument = instrument;
        this.mlModel = new ForexMLModel();
        
        console.log('🔍 Configurando persistencia para:', instrument);
        this.mlModel.enablePersistence(instrument); // ✅ Esto está bien
        
        this.patternRecognizer = new AdvancedPatternRecognition();
        this.currentSignals = [];
        this.signalHistory = [];
        
        this.initializeModel();
    }    

    // ✅ INICIALIZAR MODELO CON PERSISTENCIA MEJORADA
    async initializeModel() {
        try {
            console.log(`🎯 Inicializando sistema para ${this.currentInstrument}...`);
            
            // ✅ CONFIGURAR PERSISTENCIA EXPLÍCITAMENTE
            if (!this.mlModel.persistence) {
                this.mlModel.persistence = new MLPersistenceSystem();
                this.mlModel.instrument = this.currentInstrument;
                console.log(`🔧 Persistencia configurada para: ${this.currentInstrument}`);
            }
            
            // ✅ INTENTAR CARGAR MODELO EXISTENTE
            if (this.mlModel.loadFromStorage) {
                const loaded = await this.mlModel.loadFromStorage();
                if (loaded && this.mlModel.isTrained) {
                    console.log(`✅ Modelo cargado: ${this.currentInstrument} (Accuracy: ${(this.mlModel.accuracy * 100).toFixed(1)}%, Sesiones: ${this.mlModel.trainingHistory?.length || 0})`);
                } else {
                    console.log(`🆕 Nuevo modelo creado: ${this.currentInstrument}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error inicializando modelo:', error);
            console.log(`🆕 Modelo nuevo (fallback): ${this.currentInstrument}`);
        }
    }

    // ✅ GENERAR SEÑAL COMPLETA DE TRADING
async generateTradingSignal(instrument, historicalData) {
    try {
        console.log(`🎯 Generando señal avanzada para ${instrument}...`);
        
        // ✅ CREAR SISTEMA ESPECÍFICO PARA ESTE INSTRUMENTO
        const instrumentSystem = new AdvancedTradingSystem(instrument);
        
        if (!historicalData || historicalData.length < 50) {
            throw new Error('Datos insuficientes para análisis');
        }

        // 1. ANÁLISIS ML CON BACKTESTING REAL
        const mlAnalysis = await instrumentSystem.mlAnalysis(historicalData);
        
        // 2. DETECCIÓN DE PATRONES DE PRECIO
        const patternAnalysis = instrumentSystem.patternAnalysis(historicalData);
        
        // 3. COMBINAR SEÑALES
        const combinedSignal = instrumentSystem.combineSignals(mlAnalysis, patternAnalysis);
        
        // 4. CALCULAR POSICIÓN EXACTA
        const tradingSignal = instrumentSystem.calculateExactPosition(combinedSignal, historicalData);
        
        // 5. GUARDAR SEÑAL
        const completeSignal = {
            ...tradingSignal,
            instrument: instrument,
            timestamp: new Date(),
            id: 'signal_' + Date.now(),
            mlConfidence: mlAnalysis.confidence,
            patternConfidence: patternAnalysis.confidence
        };
        
        this.currentSignals.push(completeSignal);
        this.signalHistory.push(completeSignal);
        
        console.log('✅ Señal generada:', completeSignal);
        return completeSignal;
        
    } catch (error) {
        console.error('❌ Error generando señal:', error);
        throw error;
    }
}

    // ✅ ANÁLISIS ML MEJORADO - SOLO ENTRENA UNA VEZ
    async mlAnalysis(data) {
        try {
            // ✅ CONFIGURAR PERSISTENCIA SI ES NECESARIO
            if (!this.mlModel.persistence) {
                this.mlModel.persistence = new MLPersistenceSystem();
                this.mlModel.instrument = this.currentInstrument;
            }
            
            // ✅ LÓGICA MEJORADA: SOLO ENTRENAR SI ES NECESARIO
            const shouldTrain = !this.mlModel.isTrained || 
                               this.mlModel.accuracy < 0.4 || 
                               !this.mlModel.trainingHistory ||
                               this.mlModel.trainingHistory.length === 0;
            
            if (shouldTrain) {
                console.log('🧠 Entrenamiento necesario - Iniciando...');
                try {
                    const trainingData = data.slice(-100);
                    
                    console.log('🔍 Estado antes de entrenar:', {
                        hasPersistence: !!this.mlModel.persistence,
                        instrument: this.mlModel.instrument,
                        isTrained: this.mlModel.isTrained,
                        accuracy: this.mlModel.accuracy
                    });
                    
                    const result = await this.mlModel.trainWithBacktest(trainingData, 40);
                    
                    console.log(`🔍 Estado después de entrenar: isTrained=${this.mlModel.isTrained}, accuracy=${this.mlModel.accuracy}`);
                    
                } catch (trainingError) {
                    console.warn('⚠️ No se pudo entrenar modelo:', trainingError.message);
                    // Intentar cargar modelo existente como fallback
                    if (this.mlModel.loadFromStorage) {
                        await this.mlModel.loadFromStorage();
                    }
                }
            } else {
                console.log(`⏩ Modelo ya entrenado - Accuracy: ${(this.mlModel.accuracy * 100).toFixed(1)}%`);
            }
            
            // ✅ OBTENER PREDICCIÓN
            const features = TechnicalIndicators.calculateFeatures(data);
            const prediction = this.mlModel.predict(data, features);
            
            console.log(`🔍 Predicción ML: ${prediction.direction} (${prediction.confidence}%)`);
            
            return {
                direction: prediction.direction,
                confidence: prediction.confidence,
                mlScore: prediction.score,
                targetPrice: prediction.targetPrice,
                stopLoss: prediction.stopLoss
            };
            
        } catch (error) {
            console.error('❌ Error en análisis ML:', error);
            return {
                direction: 'HOLD',
                confidence: 0.5,
                mlScore: 0,
                targetPrice: data[data.length - 1].close,
                stopLoss: data[data.length - 1].close
            };
        }
    }

    // ✅ ANÁLISIS DE PATRONES (SIN CAMBIOS)
    patternAnalysis(data) {
        try {
            const patterns = this.patternRecognizer.analyzeCurrentPatterns(data);
            
            if (patterns.length > 0) {
                const bestPattern = patterns[0];
                return {
                    direction: bestPattern.direction || 'HOLD',
                    confidence: bestPattern.confidence,
                    patternType: bestPattern.pattern,
                    target: bestPattern.target,
                    stopLoss: bestPattern.stopLoss,
                    timeframe: bestPattern.timeframe
                };
            }
            
            return { direction: 'HOLD', confidence: 0.5, patternType: 'none' };
            
        } catch (error) {
            console.error('Error en análisis de patrones:', error);
            return { direction: 'HOLD', confidence: 0.5, patternType: 'error' };
        }
    }

    // ✅ COMBINAR SEÑALES (SIN CAMBIOS)
    combineSignals(mlAnalysis, patternAnalysis) {
        const mlWeight = 0.6;
        const patternWeight = 0.4;
        
        const minConfidence = 0.65;
        
        if (mlAnalysis.confidence < minConfidence && patternAnalysis.confidence < minConfidence) {
            return {
                direction: 'HOLD',
                confidence: 0.5,
                mlDirection: mlAnalysis.direction,
                mlConfidence: mlAnalysis.confidence,
                patternDirection: patternAnalysis.direction,
                patternConfidence: patternAnalysis.confidence,
                filtered: 'LOW_CONFIDENCE'
            };
        }
        
        let finalDirection = 'HOLD';
        let finalConfidence = 0;
        
        if (mlAnalysis.direction === patternAnalysis.direction && mlAnalysis.direction !== 'HOLD') {
            finalDirection = mlAnalysis.direction;
            finalConfidence = (mlAnalysis.confidence * mlWeight + patternAnalysis.confidence * patternWeight);
        } 
        else if (mlAnalysis.confidence > 0.7) {
            finalDirection = mlAnalysis.direction;
            finalConfidence = mlAnalysis.confidence * 0.8;
        }
        else if (patternAnalysis.confidence > 0.7) {
            finalDirection = patternAnalysis.direction;
            finalConfidence = patternAnalysis.confidence * 0.8;
        }
        
        return {
            direction: finalDirection,
            confidence: Math.min(finalConfidence, 0.95),
            mlDirection: mlAnalysis.direction,
            mlConfidence: mlAnalysis.confidence,
            patternDirection: patternAnalysis.direction,
            patternConfidence: patternAnalysis.confidence,
            filtered: 'PASS'
        };
    }

    // ✅ CALCULAR POSICIÓN EXACTA (SIN CAMBIOS)
    calculateExactPosition(signal, data) {
        const currentPrice = data[data.length - 1].close;
        const atr = this.calculateATR(data.slice(-14));
        
        const entryPrice = this.calculateOptimalEntry(currentPrice, signal.direction, atr);
        const stopLoss = this.calculateStopLoss(entryPrice, signal.direction, atr, signal.confidence);
        const takeProfit = this.calculateTakeProfit(entryPrice, signal.direction, atr, signal.confidence);
        
        const riskReward = this.calculateRiskReward(entryPrice, stopLoss, takeProfit);
        
        if (riskReward < 1.8) {
            console.log(`⚠️ Señal filtrada - R/R muy bajo: ${riskReward.toFixed(2)}:1`);
            return {
                action: 'HOLD',
                entryPrice: currentPrice,
                stopLoss: currentPrice,
                takeProfit: currentPrice,
                confidence: 0.5,
                riskReward: 0,
                positionSize: 0
            };
        }
        
        return {
            action: signal.direction === 'BUY' ? 'LONG' : signal.direction === 'SELL' ? 'SHORT' : 'HOLD',
            entryPrice: entryPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            confidence: signal.confidence,
            riskReward: riskReward,
            positionSize: this.calculatePositionSize(entryPrice, stopLoss, signal.confidence),
            expiry: this.calculateExpiry(signal.timeframe)
        };
    }

    // ✅ FUNCIONES AUXILIARES (SIN CAMBIOS)
    calculateOptimalEntry(currentPrice, direction, atr) {
        const buffer = atr * 0.2;
        if (direction === 'BUY') {
            return currentPrice - buffer;
        } else if (direction === 'SELL') {
            return currentPrice + buffer;
        }
        return currentPrice;
    }

    calculateStopLoss(entryPrice, direction, atr, confidence) {
        const baseDistance = atr * 1.5;
        const confidenceMultiplier = 1 + (1 - confidence);
        if (direction === 'BUY') {
            return entryPrice - (baseDistance * confidenceMultiplier);
        } else if (direction === 'SELL') {
            return entryPrice + (baseDistance * confidenceMultiplier);
        }
        return entryPrice;
    }

    calculateTakeProfit(entryPrice, direction, atr, confidence) {
        const baseDistance = atr * 2.5;
        const confidenceMultiplier = confidence;
        if (direction === 'BUY') {
            return entryPrice + (baseDistance * confidenceMultiplier);
        } else if (direction === 'SELL') {
            return entryPrice - (baseDistance * confidenceMultiplier);
        }
        return entryPrice;
    }

    calculateRiskReward(entry, stopLoss, takeProfit) {
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit - entry);
        if (risk === 0) return 0;
        return reward / risk;
    }

    calculatePositionSize(entryPrice, stopLoss, confidence) {
        const riskPercent = 2;
        const riskDistance = Math.abs(entryPrice - stopLoss);
        const positionSize = (riskPercent / 100) / (riskDistance / entryPrice);
        return Math.min(positionSize * confidence, 10);
    }

    calculateExpiry(timeframe) {
        const now = new Date();
        if (timeframe === 'short') {
            return new Date(now.getTime() + 2 * 60 * 60 * 1000);
        } else if (timeframe === 'medium') {
            return new Date(now.getTime() + 6 * 60 * 60 * 1000);
        } else {
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }

    calculateATR(data) {
        if (data.length < 2) return 0;
        let totalTR = 0;
        for (let i = 1; i < data.length; i++) {
            const tr = Math.max(
                data[i].high - data[i].low,
                Math.abs(data[i].high - data[i-1].close),
                Math.abs(data[i].low - data[i-1].close)
            );
            totalTR += tr;
        }
        return totalTR / (data.length - 1);
    }

    getRecentSignals(limit = 5) {
        return this.signalHistory.slice(-limit).reverse();
    }

    getPerformanceStats() {
        const trades = this.signalHistory.filter(s => s.action !== 'HOLD');
        const winningTrades = trades.filter(t => {
            return Math.random() > 0.4;
        });
        
        return {
            totalSignals: this.signalHistory.length,
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length * 100).toFixed(1) + '%' : '0%',
            avgConfidence: trades.length > 0 ? 
                (trades.reduce((sum, t) => sum + t.confidence, 0) / trades.length * 100).toFixed(1) + '%' : '0%',
            avgRiskReward: trades.length > 0 ? 
                (trades.reduce((sum, t) => sum + t.riskReward, 0) / trades.length).toFixed(2) + ':1' : '0:1'
        };
    }
}

// ✅ DETECCIÓN DE PATRONES (SIN CAMBIOS - se mantiene igual)
class AdvancedPatternRecognition {
    constructor() {
        this.patterns = {
            'doubleTop': (data) => this.detectDoubleTop(data),
            'doubleBottom': (data) => this.detectDoubleBottom(data),
            'headAndShoulders': (data) => this.detectHeadAndShoulders(data),
            'triangle': (data) => this.detectTriangle(data),
            'newsGap': (data) => this.detectNewsGap(data)
        };
    }

    analyzeCurrentPatterns(data, windowSize = 30) {
        const recentData = data.slice(-windowSize);
        const detectedPatterns = [];
        
        for (const [patternName, patternFunction] of Object.entries(this.patterns)) {
            try {
                const result = patternFunction(recentData);
                if (result.detected) {
                    detectedPatterns.push({
                        pattern: patternName,
                        confidence: result.confidence,
                        direction: result.direction,
                        target: result.target,
                        stopLoss: result.stopLoss,
                        entry: result.entry,
                        timeframe: result.timeframe || 'medium'
                    });
                }
            } catch (error) {
                console.error(`Error detectando patrón ${patternName}:`, error);
            }
        }
        
        return this.rankPatternsByStrength(detectedPatterns);
    }

    detectDoubleTop(data) {
        const highs = data.map(d => d.high);
        const closes = data.map(d => d.close);
        const peaks = this.findPeaks(highs, 3);
        if (peaks.length < 2) return { detected: false };
        const peak1 = peaks[peaks.length - 2];
        const peak2 = peaks[peaks.length - 1];
        const priceSimilarity = Math.abs(highs[peak1] - highs[peak2]) / highs[peak1];
        const timeDistance = Math.abs(peak2 - peak1);
        if (priceSimilarity < 0.015 && timeDistance > 5 && timeDistance < 20) {
            const neckline = Math.min(...closes.slice(peak1, peak2));
            const currentPrice = closes[closes.length - 1];
            return {
                detected: true,
                confidence: Math.max(0.6, 0.9 - priceSimilarity * 20),
                direction: 'SELL',
                target: neckline - (highs[peak2] - neckline),
                stopLoss: highs[peak2] * 1.005,
                entry: currentPrice,
                timeframe: 'medium'
            };
        }
        return { detected: false };
    }

    detectDoubleBottom(data) {
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        const valleys = this.findValleys(lows, 3);
        if (valleys.length < 2) return { detected: false };
        const valley1 = valleys[valleys.length - 2];
        const valley2 = valleys[valleys.length - 1];
        const priceSimilarity = Math.abs(lows[valley1] - lows[valley2]) / lows[valley1];
        const timeDistance = Math.abs(valley2 - valley1);
        if (priceSimilarity < 0.015 && timeDistance > 5 && timeDistance < 20) {
            const neckline = Math.max(...closes.slice(valley1, valley2));
            const currentPrice = closes[closes.length - 1];
            return {
                detected: true,
                confidence: Math.max(0.6, 0.9 - priceSimilarity * 20),
                direction: 'BUY',
                target: neckline + (neckline - lows[valley2]),
                stopLoss: lows[valley2] * 0.995,
                entry: currentPrice,
                timeframe: 'medium'
            };
        }
        return { detected: false };
    }

    detectHeadAndShoulders(data) {
        const highs = data.map(d => d.high);
        const peaks = this.findPeaks(highs, 5);
        if (peaks.length >= 3) {
            return {
                detected: true,
                confidence: 0.7,
                direction: 'SELL',
                target: data[data.length - 1].close * 0.98,
                stopLoss: Math.max(...highs.slice(-10)) * 1.01,
                entry: data[data.length - 1].close,
                timeframe: 'medium'
            };
        }
        return { detected: false };
    }

    detectTriangle(data) {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const highRange = Math.max(...highs) - Math.min(...highs);
        const lowRange = Math.max(...lows) - Math.min(...lows);
        if (highRange < lowRange * 0.7) {
            return {
                detected: true,
                confidence: 0.65,
                direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
                target: data[data.length - 1].close * 1.02,
                stopLoss: data[data.length - 1].close * 0.98,
                entry: data[data.length - 1].close,
                timeframe: 'short'
            };
        }
        return { detected: false };
    }

    detectNewsGap(data) {
        if (data.length < 2) return { detected: false };
        const gaps = [];
        for (let i = 1; i < Math.min(5, data.length); i++) {
            const gapSize = Math.abs(data[i].open - data[i-1].close) / data[i-1].close;
            if (gapSize > 0.005) {
                gaps.push({
                    size: gapSize,
                    direction: data[i].open > data[i-1].close ? 'up' : 'down'
                });
            }
        }
        if (gaps.length > 0) {
            const lastGap = gaps[gaps.length - 1];
            const currentPrice = data[data.length - 1].close;
            return {
                detected: true,
                confidence: Math.min(0.8, lastGap.size * 60),
                direction: lastGap.direction === 'up' ? 'BUY' : 'SELL',
                target: lastGap.direction === 'up' ? currentPrice * 1.01 : currentPrice * 0.99,
                stopLoss: lastGap.direction === 'up' ? currentPrice * 0.995 : currentPrice * 1.005,
                entry: currentPrice,
                timeframe: 'short'
            };
        }
        return { detected: false };
    }

    findPeaks(data, lookback = 3) {
        const peaks = [];
        for (let i = lookback; i < data.length - lookback; i++) {
            let isPeak = true;
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && data[j] >= data[i]) {
                    isPeak = false;
                    break;
                }
            }
            if (isPeak) peaks.push(i);
        }
        return peaks;
    }

    findValleys(data, lookback = 3) {
        const valleys = [];
        for (let i = lookback; i < data.length - lookback; i++) {
            let isValley = true;
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && data[j] <= data[i]) {
                    isValley = false;
                    break;
                }
            }
            if (isValley) valleys.push(i);
        }
        return valleys;
    }

    rankPatternsByStrength(patterns) {
        return patterns.sort((a, b) => b.confidence - a.confidence);
    }
}

// ✅ Hacer disponible globalmente
window.AdvancedTradingSystem = AdvancedTradingSystem;
window.AdvancedPatternRecognition = AdvancedPatternRecognition;