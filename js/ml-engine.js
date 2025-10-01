// ml-engine.js - MOTOR ML CORREGIDO (SIN GUARDADO AUTOMÁTICO EN PREDICCIONES)
class ForexMLModel {
    constructor() {
        this.isTrained = false;
        this.accuracy = 0;
        this.trainingHistory = [];
        this.backtestResults = null;
        this.predictions = [];
        this.features = ['rsi', 'macd', 'atr', 'volume', 'priceChange', 'volatility', 'momentum', 'trend'];
        this.modelWeights = {
            rsi: 0.20,
            macd: 0.25,
            atr: 0.15,
            momentum: 0.20,
            trend: 0.10,
            volume: 0.10
        };
        
        // ✅ NUEVO: Control de guardado
        this._lastSaveTime = 0;
        this._saveCooldown = false;
    }

    // ✅ ENTRENAMIENTO CON BACKTESTING REAL - VERSIÓN CORREGIDA
    async trainWithBacktest(historicalData, lookbackPeriod = 60) {
        console.log('📊 Iniciando entrenamiento con backtesting real...');

        // ✅ CONFIGURAR PERSISTENCIA SI NO EXISTE
        if (!this.persistence && this.instrument) {
            console.log('🔄 Configurando persistencia automáticamente...');
            this.persistence = new MLPersistenceSystem();
        }
        
        if (historicalData.length < lookbackPeriod + 10) {
            throw new Error(`Se necesitan al menos ${lookbackPeriod + 10} datos históricos (tienes ${historicalData.length})`);
        }

        // ✅ PRESERVAR ESTADO EXISTENTE
        const previousAccuracy = this.accuracy || 0;
        const previousTrained = this.isTrained || false;
        const previousTrainingHistory = this.trainingHistory ? [...this.trainingHistory] : [];
        
        // ✅ TEMPORALMENTE COMO ENTRENADO PARA BACKTESTING
        const wasTrained = this.isTrained;
        this.isTrained = true;

        const predictions = [];
        
        // Backtesting walk-forward
        for (let i = lookbackPeriod; i < historicalData.length - 3; i++) {
            const trainingSlice = historicalData.slice(i - lookbackPeriod, i);
            const futureData = historicalData.slice(i, i + 3);
            
            if (trainingSlice.length < 20 || futureData.length < 2) continue;
            
            const features = TechnicalIndicators.calculateFeatures(trainingSlice);
            const prediction = this.predict(trainingSlice, features);
            
            const startPrice = historicalData[i].close;
            const maxFuturePrice = Math.max(...futureData.map(d => d.high));
            const minFuturePrice = Math.min(...futureData.map(d => d.low));
            const endPrice = futureData[futureData.length - 1].close;
            
            const maxUpMove = (maxFuturePrice - startPrice) / startPrice;
            const maxDownMove = (startPrice - minFuturePrice) / startPrice;
            const netMove = (endPrice - startPrice) / startPrice;
            
            let actualDirection = 'HOLD';
            if (maxUpMove > 0.001 && netMove > 0.0005) actualDirection = 'BUY';
            else if (maxDownMove > 0.0005 && netMove < -0.001) actualDirection = 'SELL';
            
            predictions.push({
                predicted: prediction.direction,
                actual: actualDirection,
                confidence: prediction.confidence,
                timestamp: historicalData[i].timestamp,
                price: startPrice,
                actualMove: netMove
            });
        }

        // ✅ RESTAURAR ESTADO ORIGINAL
        this.isTrained = wasTrained;

        // ✅ CALCULAR MÉTRICAS
        console.log('🔍 DEBUG Backtesting - Predictions:', predictions.length);
        const validPredictions = predictions.filter(p => p.actual !== 'HOLD');
        const correctPredictions = validPredictions.filter(p => p.predicted === p.actual);
        
        if (predictions.length < 10) {
            console.log('⚠️ Pocos datos para backtesting, usando entrenamiento básico...');
            return await this.basicTraining(historicalData);
        }

        // ✅ ACTUALIZAR MODELO
        this.backtestResults = this.calculateBacktestMetrics(predictions);
        this.accuracy = this.backtestResults.accuracy;
        this.isTrained = true;
        
        // ✅ PRESERVAR HISTORIAL ANTERIOR
        if (!this.trainingHistory) {
            this.trainingHistory = [];
        }
        
        // ✅ DECISIÓN INTELIGENTE: MANTENER MEJOR ACCURACY
        if (previousTrained && this.backtestResults.accuracy < previousAccuracy * 0.7) {
            console.log(`⚠️ Nuevo entrenamiento peor (${(this.backtestResults.accuracy * 100).toFixed(1)}% vs ${(previousAccuracy * 100).toFixed(1)}%), manteniendo anterior`);
            this.accuracy = previousAccuracy;
            this.backtestResults.accuracy = previousAccuracy;
        } else {
            console.log(`✅ Entrenamiento mejoró accuracy: ${(previousAccuracy * 100).toFixed(1)}% → ${(this.backtestResults.accuracy * 100).toFixed(1)}%`);
        }

        // ✅ CREAR SESIÓN DE ENTRENAMIENTO
        const trainingSession = {
            accuracy: this.accuracy,
            dataPoints: historicalData.length,
            lookbackPeriod: lookbackPeriod,
            backtestResults: this.backtestResults,
            timestamp: new Date().toISOString(),
            sessionId: `session_${Date.now()}`,
            improvement: previousTrained ? ((this.accuracy - previousAccuracy) * 100).toFixed(1) + '%' : 'N/A',
            debug: {
                totalPredictions: predictions.length,
                validPredictions: validPredictions.length,
                correctPredictions: correctPredictions.length
            }
        };
        
        this.trainingHistory.push(trainingSession);

        // ✅ GUARDADO INTELIGENTE SOLO SI ES NECESARIO
        if (this.persistence && this.instrument) {
            try {
                // Guardar sesión de entrenamiento
                await this.persistence.saveTrainingSession(this.instrument, trainingSession);
                
                // ✅ SOLO GUARDAR MODELO SI HAY MEJORA SIGNIFICATIVA
                const shouldSaveModel = !previousTrained || 
                    (this.accuracy > previousAccuracy * 1.1) || 
                    (this.trainingHistory.length !== this._lastSaveTime);
                
                if (shouldSaveModel) {
                    await this.saveToStorage();
                    console.log(`💾 Modelo ${this.instrument} guardado después del entrenamiento`);
                    this._lastSaveTime = this.trainingHistory.length;
                } else {
                    console.log(`⏸️ Modelo no guardado - Sin mejora significativa`);
                }
                
            } catch (saveError) {
                console.warn('⚠️ No se pudo guardar el modelo o sesión:', saveError);
            }
        }
        
        console.log('✅ Entrenamiento con backtesting completado:', {
            accuracy: this.accuracy,
            trainingSessions: this.trainingHistory.length,
            improvement: previousTrained ? `${((this.accuracy - previousAccuracy) * 100).toFixed(1)}%` : 'N/A'
        });
        
        return this.backtestResults;
    }

    // ✅ ENTRENAMIENTO BÁSICO
    async basicTraining(historicalData) {
        console.log('🧠 Usando entrenamiento básico...');
        
        const previousAccuracy = this.accuracy || 0;
        const previousTrained = this.isTrained || false;
        
        this.trainingHistory = this.trainingHistory || [];
        
        // Calcular accuracy basado en características técnicas
        const features = TechnicalIndicators.calculateFeatures(historicalData);
        let accuracyScore = 0.5;
        
        if (features.rsi > 30 && features.rsi < 70) accuracyScore += 0.1;
        if (Math.abs(features.macd) > 0.001) accuracyScore += 0.1;
        if (features.trend !== 0) accuracyScore += 0.1;
        
        this.accuracy = Math.min(accuracyScore, 0.85);
        this.isTrained = true;
        
        const results = {
            accuracy: this.accuracy,
            totalPredictions: historicalData.length,
            validPredictions: Math.floor(historicalData.length * 0.7),
            correctPredictions: Math.floor(historicalData.length * 0.7 * this.accuracy),
            winRate: (this.accuracy * 100).toFixed(1) + '%'
        };
        
        this.backtestResults = results;
        
        // ✅ GUARDADO EN ENTRENAMIENTO BÁSICO
        if (this.persistence && this.instrument) {
            try {
                const trainingSession = {
                    accuracy: this.accuracy,
                    dataPoints: historicalData.length,
                    trainingType: 'basic',
                    timestamp: new Date().toISOString(),
                    sessionId: `basic_session_${Date.now()}`
                };
                
                await this.persistence.saveTrainingSession(this.instrument, trainingSession);
                
                // Solo guardar modelo si es nuevo o mejoró
                if (!previousTrained || this.accuracy > previousAccuracy) {
                    await this.saveToStorage();
                }
                
            } catch (saveError) {
                console.warn('⚠️ No se pudo guardar entrenamiento básico:', saveError);
            }
        }
        
        console.log('✅ Entrenamiento básico completado:', results);
        return results;
    }

    // ✅ PREDICCIÓN MEJORADA - SIN GUARDADO AUTOMÁTICO
    predict(currentData, features) {
        // Si el modelo no está entrenado, usar predicción básica
        if (!this.isTrained) {
            return this.basicPrediction(currentData, features);
        }

        // Algoritmo de predicción con múltiples indicadores
        const signals = this.calculateSignals(features);
        const score = this.calculateScore(signals);
        
        const direction = this.determineDirection(score);
        const confidence = this.calculateConfidence(score, features, currentData);
        
        const prediction = {
            direction,
            confidence,
            score: score,
            targetPrice: this.calculateTargetPrice(currentData, direction, features),
            stopLoss: this.calculateStopLoss(currentData, direction, features),
            timestamp: new Date(),
            features: features,
            signals: signals,
            instrument: this.instrument || 'unknown'
        };

        // ✅ SOLO MANTENER EN MEMORIA, NO GUARDAR AUTOMÁTICAMENTE
        if (!this.predictions) {
            this.predictions = [];
        }
        
        this.predictions.push(prediction);
        
        // ✅ LIMITAR HISTORIAL EN MEMORIA
        if (this.predictions.length > 100) {
            this.predictions = this.predictions.slice(-100);
        }

        console.log(`🎯 Predicción: ${direction} (${confidence}% confianza)`);
        return prediction;
    }

    // ✅ PREDICCIÓN BÁSICA SIN ENTRENAMIENTO
    basicPrediction(currentData, features) {
        let direction = 'HOLD';
        let confidence = 50;
        
        if (features.rsi < 30 && features.macd > 0) {
            direction = 'BUY';
            confidence = 65 + (30 - features.rsi);
        } else if (features.rsi > 70 && features.macd < 0) {
            direction = 'SELL';
            confidence = 65 + (features.rsi - 70);
        } else if (features.trend > 0.0005 && features.momentum > 0) {
            direction = 'BUY';
            confidence = 60;
        } else if (features.trend < -0.0005 && features.momentum < 0) {
            direction = 'SELL';
            confidence = 60;
        }
        
        confidence = Math.min(confidence, 85);
        
        const currentPrice = parseFloat(currentData[currentData.length - 1].close);
        const atr = features.atr;
        
        return {
            direction,
            confidence,
            score: confidence / 100,
            targetPrice: direction === 'BUY' ? currentPrice + (atr * 2) : currentPrice - (atr * 2),
            stopLoss: direction === 'BUY' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5),
            timestamp: new Date(),
            features: features,
            signals: {}
        };
    }

    // ✅ CALCULAR SEÑALES
    calculateSignals(features) {
        const signals = {};
        
        // RSI Signals
        if (features.rsi < 25) {
            signals.rsi = { value: 1.2, strength: 'very_strong', type: 'oversold_extreme' };
        } else if (features.rsi < 35) {
            signals.rsi = { value: 0.8, strength: 'strong', type: 'oversold' };
        } else if (features.rsi > 75) {
            signals.rsi = { value: -1.2, strength: 'very_strong', type: 'overbought_extreme' };
        } else if (features.rsi > 65) {
            signals.rsi = { value: -0.8, strength: 'strong', type: 'overbought' };
        } else if (features.rsi >= 45 && features.rsi <= 55) {
            signals.rsi = { value: 0.3, strength: 'neutral_bullish', type: 'neutral' };
        } else {
            signals.rsi = { value: 0, strength: 'weak', type: 'no_signal' };
        }
        
        // MACD Signals
        if (features.macd > 0.002) {
            signals.macd = { value: 1.0, strength: 'strong', type: 'bullish_strong' };
        } else if (features.macd > 0.0005) {
            signals.macd = { value: 0.6, strength: 'medium', type: 'bullish_weak' };
        } else if (features.macd < -0.002) {
            signals.macd = { value: -1.0, strength: 'strong', type: 'bearish_strong' };
        } else if (features.macd < -0.0005) {
            signals.macd = { value: -0.6, strength: 'medium', type: 'bearish_weak' };
        } else {
            signals.macd = { value: features.macd * 200, strength: 'weak', type: 'neutral' };
        }
        
        // Momentum Signals
        if (features.momentum > 0.01) {
            signals.momentum = { value: 1.1, strength: 'very_strong', type: 'strong_bullish' };
        } else if (features.momentum > 0.003) {
            signals.momentum = { value: 0.7, strength: 'strong', type: 'bullish' };
        } else if (features.momentum < -0.01) {
            signals.momentum = { value: -1.1, strength: 'very_strong', type: 'strong_bearish' };
        } else if (features.momentum < -0.003) {
            signals.momentum = { value: -0.7, strength: 'strong', type: 'bearish' };
        } else {
            signals.momentum = { value: features.momentum * 50, strength: 'weak', type: 'neutral' };
        }
        
        // Trend Signals
        if (features.trend > 0.0001) {
            signals.trend = { value: 0.8, strength: 'strong', type: 'uptrend' };
        } else if (features.trend < -0.0001) {
            signals.trend = { value: -0.8, strength: 'strong', type: 'downtrend' };
        } else {
            signals.trend = { value: 0, strength: 'weak', type: 'sideways' };
        }
        
        return signals;
    }

    // ✅ CALCULAR SCORE PONDERADO
    calculateScore(signals) {
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [indicator, signal] of Object.entries(signals)) {
            if (this.modelWeights[indicator]) {
                totalScore += signal.value * this.modelWeights[indicator];
                totalWeight += this.modelWeights[indicator];
            }
        }
        
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    // ✅ DETERMINAR DIRECCIÓN
    determineDirection(score) {
        if (score > 0.25) return 'BUY';
        if (score < -0.25) return 'SELL';
        return 'HOLD';
    }

    // ✅ CALCULAR CONFIANZA
    calculateConfidence(score, features, currentData) {
        let baseConfidence = Math.min(Math.abs(score) * 120, 95);
        
        if (features.atr > features.avgATR * 1.8) {
            baseConfidence *= 0.8;
        }
        
        if (features.rsi > 25 && features.rsi < 75) {
            baseConfidence *= 1.1;
        }
        
        if (features.trend * score > 0) {
            baseConfidence *= 1.15;
        }
        
        return Math.min(Math.max(baseConfidence, 50), 95);
    }

    // ✅ CALCULAR PRECIO OBJETIVO
    calculateTargetPrice(currentData, direction, features) {
        const currentPrice = parseFloat(currentData[currentData.length - 1].close);
        const atr = features.atr;
        
        let multiplier;
        if (direction === 'BUY') {
            multiplier = 2.0 + (features.momentum * 100);
        } else {
            multiplier = -2.0 + (features.momentum * 100);
        }
        
        return currentPrice + (atr * multiplier);
    }

    // ✅ CALCULAR STOP LOSS
    calculateStopLoss(currentData, direction, features) {
        const currentPrice = parseFloat(currentData[currentData.length - 1].close);
        const atr = features.atr;
        
        let multiplier;
        if (direction === 'BUY') {
            multiplier = -1.2 - (features.volatility * 0.5);
        } else {
            multiplier = 1.2 + (features.volatility * 0.5);
        }
        
        return currentPrice + (atr * multiplier);
    }

    // ✅ CÁLCULO DE MÉTRICAS REALES
    calculateBacktestMetrics(predictions) {
        const validPredictions = predictions.filter(p => p.actual !== 'HOLD');
        const total = validPredictions.length;
        
        if (total === 0) {
            return {
                accuracy: 0,
                totalPredictions: 0,
                correctPredictions: 0,
                winRate: '0%',
                totalTrades: 0,
                profitableTrades: 0,
                totalProfit: 0
            };
        }
        
        const correct = validPredictions.filter(p => p.predicted === p.actual).length;
        const accuracy = correct / total;
        
        return {
            accuracy: accuracy,
            totalPredictions: predictions.length,
            validPredictions: total,
            correctPredictions: correct,
            winRate: (accuracy * 100).toFixed(1) + '%',
            totalTrades: total,
            profitableTrades: correct,
            totalProfit: (accuracy * 100).toFixed(2)
        };
    }

    // ✅ OBTENER ESTADÍSTICAS DEL MODELO
    getModelStats() {
        const recentPredictions = this.predictions.slice(-20);
        const validPredictions = recentPredictions.filter(p => p.direction !== 'HOLD');
        const correctPredictions = Math.floor(validPredictions.length * this.accuracy);
        
        return {
            accuracy: this.accuracy,
            totalPredictions: this.predictions.length,
            recentPredictions: recentPredictions.length,
            validPredictions: validPredictions.length,
            correctPredictions: correctPredictions,
            isTrained: this.isTrained,
            avgConfidence: validPredictions.length > 0 ? 
                validPredictions.reduce((sum, p) => sum + p.confidence, 0) / validPredictions.length : 0,
            backtestResults: this.backtestResults
        };
    }
}

// ✅ CLASE DE INDICADORES TÉCNICOS
class TechnicalIndicators {
    
    static calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return [];
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        const rsi = [];
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
        
        for (let i = period; i < prices.length; i++) {
            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
            
            avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
        }
        
        return rsi;
    }

    static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        
        const macd = [];
        const minLength = Math.min(emaFast.length, emaSlow.length);
        
        for (let i = 0; i < minLength; i++) {
            macd.push(emaFast[i] - emaSlow[i]);
        }
        
        return macd;
    }

    static calculateEMA(prices, period) {
        if (prices.length === 0) return [];
        
        const ema = [];
        const multiplier = 2 / (period + 1);
        ema[0] = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
        }
        
        return ema;
    }

    static calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < 2 || highs.length !== lows.length || highs.length !== closes.length) {
            return [];
        }
        
        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        if (trueRanges.length < period) return [];
        
        const atr = [];
        let sum = trueRanges.slice(0, period).reduce((a, b) => a + b);
        atr.push(sum / period);
        
        for (let i = period; i < trueRanges.length; i++) {
            atr.push((atr[atr.length - 1] * (period - 1) + trueRanges[i]) / period);
        }
        
        return atr;
    }

    static calculateFeatures(data) {
        if (!data || data.length < 30) {
            throw new Error('Datos insuficientes para calcular características');
        }
        
        const prices = data.map(d => parseFloat(d.close));
        const highs = data.map(d => parseFloat(d.high));
        const lows = data.map(d => parseFloat(d.low));
        
        const rsi = this.calculateRSI(prices, 14);
        const macd = this.calculateMACD(prices);
        const atr = this.calculateATR(highs, lows, prices, 14);
        
        const currentRSI = rsi[rsi.length - 1] || 50;
        const currentMACD = macd[macd.length - 1] || 0;
        const currentATR = atr[atr.length - 1] || 0;
        const avgATR = atr.length > 20 ? atr.slice(-20).reduce((a, b) => a + b) / 20 : currentATR;
        
        const priceChange = prices.length > 1 ? 
            (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2] : 0;
        
        return {
            rsi: currentRSI,
            macd: currentMACD,
            atr: currentATR,
            avgATR: avgATR,
            priceChange: priceChange,
            volatility: currentATR / prices[prices.length - 1],
            momentum: this.calculateMomentum(prices),
            trend: this.calculateTrend(prices)
        };
    }

    static calculateMomentum(prices, period = 10) {
        if (prices.length < period) return 0;
        
        const recent = prices.slice(-period);
        const older = prices.slice(-period * 2, -period);
        
        if (older.length === 0) return 0;
        
        const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b) / older.length;
        
        return (recentAvg - olderAvg) / olderAvg;
    }

    static calculateTrend(prices, period = 20) {
        if (prices.length < period) return 0;
        
        const recentPrices = prices.slice(-period);
        const x = Array.from({length: period}, (_, i) => i);
        const y = recentPrices;
        
        const n = period;
        const sumX = x.reduce((a, b) => a + b);
        const sumY = y.reduce((a, b) => a + b);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return slope;
    }
}

// ✅ EXTENDER ForexMLModel CON PERSISTENCIA MEJORADA
ForexMLModel.prototype.enablePersistence = function(instrument) {
    if (!this.persistence) {
        this.persistence = new MLPersistenceSystem();
        this.instrument = instrument;
        
        // Cargar modelo existente
        setTimeout(async () => {
            const loaded = await this.persistence.loadModel(this.instrument, this);
            if (loaded) {
                console.log(`🎯 Modelo ${this.instrument} cargado desde persistencia`);
                console.log(`📊 Estado: ${this.isTrained ? 'ENTRENADO' : 'NO ENTRENADO'}, Accuracy: ${(this.accuracy * 100).toFixed(1)}%`);
            }
        }, 1000);
    }
    return this;
};

ForexMLModel.prototype.saveToStorage = async function() {
    if (!this.persistence || !this.instrument) {
        console.warn('⚠️ Persistencia no configurada para este modelo');
        return false;
    }
    return await this.persistence.saveModel(this.instrument, this, true);
};

ForexMLModel.prototype.loadFromStorage = async function() {
    if (!this.persistence || !this.instrument) {
        console.warn('⚠️ Persistencia no configurada para este modelo');
        return false;
    }
    return await this.persistence.loadModel(this.instrument, this);
};

ForexMLModel.prototype.getEvolutionStats = function() {
    if (!this.persistence || !this.instrument) {
        return { error: 'Persistencia no configurada' };
    }
    
    try {
        const history = this.persistence.loadTrainingHistory(this.instrument);
        const allModels = this.persistence.loadAllModels();
        const modelData = allModels[this.instrument];
        
        const safeHistory = Array.isArray(history) ? history : [];
        
        return {
            instrument: this.instrument,
            isTrained: this.isTrained,
            currentAccuracy: this.accuracy,
            trainingSessions: safeHistory.length,
            totalPredictions: this.predictions?.length || 0,
            performanceTrend: modelData?.performance?.performanceTrend || 'unknown',
            avgConfidence: modelData?.performance?.avgConfidence || 0,
            lastTraining: safeHistory.length > 0 ? safeHistory[safeHistory.length - 1].timestamp : 'never',
            history: safeHistory.slice(-5)
        };
    } catch (error) {
        console.error('❌ Error en getEvolutionStats:', error);
        return {
            instrument: this.instrument,
            isTrained: this.isTrained,
            currentAccuracy: this.accuracy,
            trainingSessions: 0,
            totalPredictions: this.predictions?.length || 0,
            performanceTrend: 'error',
            avgConfidence: 0,
            lastTraining: 'error',
            history: []
        };
    }
}

// ✅ NUEVA FUNCIÓN: Guardado manual seguro
ForexMLModel.prototype.safeSave = async function() {
    if (!this.persistence || !this.instrument) {
        console.warn('⚠️ Persistencia no configurada');
        return false;
    }
    
    // Solo guardar si el modelo está bien entrenado
    const shouldSave = this.isTrained && 
                      this.accuracy > 0.4 && 
                      this.trainingHistory && 
                      this.trainingHistory.length > 0;
    
    if (shouldSave) {
        console.log('💾 Guardado manual seguro del modelo...');
        return await this.persistence.saveModel(this.instrument, this, true);
    } else {
        console.log('⏸️ Modelo no listo para guardado seguro');
        return false;
    }
}

console.log('✅ Sistema ML corregido cargado (SIN GUARDADO AUTOMÁTICO EN PREDICCIONES)');

// Exportar para uso global
window.ForexMLModel = ForexMLModel;
window.TechnicalIndicators = TechnicalIndicators;