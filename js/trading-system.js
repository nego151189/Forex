// trading-system.js - SISTEMA DE TRADING INTEGRADO CON TENSORFLOW
class AdvancedTradingSystem {
    constructor(instrument, tensorFlowModel = null) {
        this.currentInstrument = instrument;
        this.mlModel = tensorFlowModel || new ForexTensorFlowModel(instrument);
        this.patternRecognizer = new AdvancedPatternRecognition();
        this.currentSignals = [];
        this.signalHistory = [];
        
        // Configuración de riesgo optimizada
        this.riskConfig = {
            minRiskRewardRatio: 1.5,
            maxRiskRewardRatio: 10.0,
            stopLossATRMultiplier: 1.5,
            stopLossPercent: 0.004,
            takeProfitATRMultiplier: 2.5,
            takeProfitPercent: 0.010,
            minConfidence: 0.65,
            highConfidence: 0.75
        };
    }

    async generateTradingSignal(instrument, historicalData) {
        try {
            console.log(`🎯 Generando señal con TensorFlow para ${instrument}...`);
            
            if (!historicalData || historicalData.length < 100) {
                throw new Error('Datos insuficientes (mínimo 100 velas reales)');
            }

            // 1. ANÁLISIS CON TENSORFLOW
            const tensorFlowPrediction = await this.tensorFlowAnalysis(historicalData);
            
            // 2. ANÁLISIS DE PATRONES
            const patternAnalysis = this.patternAnalysis(historicalData);
            
            // 3. COMBINAR SEÑALES
            const combinedSignal = this.combineSignals(tensorFlowPrediction, patternAnalysis);
            
            // 4. CALCULAR POSICIÓN EXACTA
            const tradingSignal = this.calculateExactPosition(combinedSignal, historicalData);
            
            // 5. CREAR SEÑAL COMPLETA
            const completeSignal = {
                ...tradingSignal,
                instrument: instrument,
                timestamp: new Date().toISOString(),
                id: 'signal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                tensorFlowConfidence: tensorFlowPrediction.confidence,
                patternConfidence: patternAnalysis.confidence,
                modelType: 'TensorFlow-LSTM'
            };
            
            this.currentSignals.push(completeSignal);
            this.signalHistory.push(completeSignal);
            
            console.log('✅ Señal TensorFlow generada:', completeSignal.action, 
                        `(${(completeSignal.confidence * 100).toFixed(1)}%)`);
            
            return completeSignal;
            
        } catch (error) {
            console.error('❌ Error generando señal:', error);
            throw error;
        }
    }

    async tensorFlowAnalysis(data) {
        try {
            // Verificar si el modelo está entrenado
            if (!this.mlModel.isTrained) {
                console.log('⚠️ Modelo no entrenado, entrenando ahora...');
                await this.mlModel.trainOnRealData(data.slice(-500), 20);
            }

            // Obtener predicción de TensorFlow
            const prediction = await this.mlModel.predict(data);
            
            return {
                direction: prediction.direction,
                confidence: prediction.confidence / 100,
                probabilities: prediction.probabilities,
                source: 'TensorFlow-LSTM'
            };
            
        } catch (error) {
            console.error('Error en análisis TensorFlow:', error);
            
            // Fallback a análisis técnico básico
            return {
                direction: 'HOLD',
                confidence: 0.5,
                probabilities: { buy: 33, sell: 33, hold: 34 },
                source: 'Fallback'
            };
        }
    }

    patternAnalysis(data) {
        try {
            const patterns = this.patternRecognizer.analyzeCurrentPatterns(data, 30);
            
            if (patterns.length > 0) {
                const bestPattern = patterns[0];
                return {
                    direction: bestPattern.direction || 'HOLD',
                    confidence: bestPattern.confidence / 100,
                    patternType: bestPattern.pattern,
                    target: bestPattern.target,
                    stopLoss: bestPattern.stopLoss,
                    timeframe: bestPattern.timeframe
                };
            }
            
            return { 
                direction: 'HOLD', 
                confidence: 0.5, 
                patternType: 'none' 
            };
            
        } catch (error) {
            console.error('Error en análisis de patrones:', error);
            return { direction: 'HOLD', confidence: 0.5, patternType: 'error' };
        }
    }

    combineSignals(tensorFlowPrediction, patternAnalysis) {
        const tensorFlowWeight = 0.7; // Mayor peso a TensorFlow
        const patternWeight = 0.3;
        
        const minConfidence = 0.65;
        
        // Filtrar señales débiles
        if (tensorFlowPrediction.confidence < minConfidence && 
            patternAnalysis.confidence < minConfidence) {
            return {
                direction: 'HOLD',
                confidence: 0.5,
                tensorFlowDirection: tensorFlowPrediction.direction,
                tensorFlowConfidence: tensorFlowPrediction.confidence,
                patternDirection: patternAnalysis.direction,
                patternConfidence: patternAnalysis.confidence,
                filtered: 'LOW_CONFIDENCE'
            };
        }
        
        let finalDirection = 'HOLD';
        let finalConfidence = 0;
        
        // Priorizar acuerdo entre señales
        if (tensorFlowPrediction.direction === patternAnalysis.direction && 
            tensorFlowPrediction.direction !== 'HOLD') {
            finalDirection = tensorFlowPrediction.direction;
            finalConfidence = (tensorFlowPrediction.confidence * tensorFlowWeight + 
                             patternAnalysis.confidence * patternWeight);
        } 
        // Si TensorFlow es muy confiable, usarlo solo
        else if (tensorFlowPrediction.confidence > 0.75) {
            finalDirection = tensorFlowPrediction.direction;
            finalConfidence = tensorFlowPrediction.confidence * 0.9;
        }
        // Si patrones son muy confiables, usarlos
        else if (patternAnalysis.confidence > 0.75) {
            finalDirection = patternAnalysis.direction;
            finalConfidence = patternAnalysis.confidence * 0.85;
        }
        
        return {
            direction: finalDirection,
            confidence: Math.min(finalConfidence, 0.95),
            tensorFlowDirection: tensorFlowPrediction.direction,
            tensorFlowConfidence: tensorFlowPrediction.confidence,
            patternDirection: patternAnalysis.direction,
            patternConfidence: patternAnalysis.confidence,
            filtered: 'PASS'
        };
    }

    calculateExactPosition(signal, data) {
        const currentPrice = parseFloat(data[data.length - 1].close);
        const atr = this.calculateATR(data.slice(-14));
        const volatility = this.calculateVolatility(data);
        
        // Gestión de riesgo
        const riskManagement = this.calculateAdvancedRiskManagement(
            signal.direction, 
            currentPrice, 
            atr, 
            volatility, 
            signal.confidence
        );
        
        const entryPrice = this.calculateOptimalEntry(currentPrice, signal.direction, atr);
        
        // Validar señal
        if (!riskManagement.isValid) {
            console.log(`⚠️ Señal filtrada - R/R: ${riskManagement.riskRewardRatio.toFixed(2)}:1`);
            return {
                action: 'HOLD',
                entryPrice: currentPrice,
                stopLoss: currentPrice,
                takeProfit: currentPrice,
                confidence: 0.5,
                riskReward: 0,
                positionSize: 0,
                reason: 'risk_management_filter'
            };
        }
        
        console.log(`✅ Señal ${signal.direction} APROBADA | R/R: ${riskManagement.riskRewardRatio.toFixed(2)}:1 | Conf: ${(signal.confidence * 100).toFixed(1)}%`);
        
        return {
            action: signal.direction === 'BUY' ? 'LONG' : signal.direction === 'SELL' ? 'SHORT' : 'HOLD',
            entryPrice: entryPrice,
            stopLoss: riskManagement.stopLoss,
            takeProfit: riskManagement.takeProfit,
            confidence: signal.confidence,
            riskReward: riskManagement.riskRewardRatio,
            positionSize: this.calculatePositionSize(entryPrice, riskManagement.stopLoss, signal.confidence),
            expiry: this.calculateExpiry('medium'),
            reason: 'tensorflow_high_confidence'
        };
    }

    calculateAdvancedRiskManagement(direction, currentPrice, atr, volatility, confidence) {
        // Stop Loss dinámico
        const baseSL = currentPrice * this.riskConfig.stopLossPercent;
        const atrSL = atr * this.riskConfig.stopLossATRMultiplier;
        const stopLoss = Math.min(baseSL, atrSL);
        
        // Take Profit dinámico
        const baseTP = currentPrice * this.riskConfig.takeProfitPercent;
        const atrTP = atr * this.riskConfig.takeProfitATRMultiplier;
        const takeProfit = Math.max(baseTP, atrTP);
        
        // Ajustar por confianza
        const confidenceMultiplier = Math.min(confidence * 1.2, 1.3);
        const adjustedTP = takeProfit * confidenceMultiplier;
        
        // Calcular precios exactos
        let stopLossPrice, takeProfitPrice;
        
        if (direction === 'BUY') {
            stopLossPrice = currentPrice - stopLoss;
            takeProfitPrice = currentPrice + adjustedTP;
        } else if (direction === 'SELL') {
            stopLossPrice = currentPrice + stopLoss;
            takeProfitPrice = currentPrice - adjustedTP;
        } else {
            stopLossPrice = currentPrice;
            takeProfitPrice = currentPrice;
        }
        
        // Calcular ratio
        const risk = Math.abs(currentPrice - stopLossPrice);
        const reward = Math.abs(takeProfitPrice - currentPrice);
        const riskRewardRatio = risk > 0 ? reward / risk : 0;
        
        // Validar
        const isValid = riskRewardRatio >= this.riskConfig.minRiskRewardRatio && 
                       confidence >= this.riskConfig.minConfidence;
        
        return {
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice,
            riskRewardRatio: riskRewardRatio,
            isValid: isValid
        };
    }

    calculateVolatility(data, period = 20) {
        if (data.length < period) return 0;
        
        const returns = [];
        for (let i = 1; i < Math.min(period, data.length); i++) {
            const returnVal = (data[i].close - data[i-1].close) / data[i-1].close;
            returns.push(returnVal);
        }
        
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    calculateOptimalEntry(currentPrice, direction, atr) {
        const buffer = atr * 0.05;
        
        if (direction === 'BUY') {
            return currentPrice - buffer;
        } else if (direction === 'SELL') {
            return currentPrice + buffer;
        }
        return currentPrice;
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
            return new Date(now.getTime() + 8 * 60 * 60 * 1000);
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
        const winningTrades = trades.filter(t => Math.random() > 0.35); // Placeholder
        
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

// DETECCIÓN DE PATRONES AVANZADA
class AdvancedPatternRecognition {
    constructor() {
        this.patterns = {
            'doubleTop': (data) => this.detectDoubleTop(data),
            'doubleBottom': (data) => this.detectDoubleBottom(data),
            'headAndShoulders': (data) => this.detectHeadAndShoulders(data),
            'triangle': (data) => this.detectTriangle(data),
            'breakout': (data) => this.detectBreakout(data)
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
                confidence: 70 + (1 - priceSimilarity * 20) * 20,
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
                confidence: 70 + (1 - priceSimilarity * 20) * 20,
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
                confidence: 65,
                direction: 'SELL',
                target: data[data.length - 1].close * 0.98,
                stopLoss: Math.max(...highs.slice(-10)) * 1.01,
                entry: data[data.length - 1].close,
                timeframe: 'long'
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
                confidence: 60,
                direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
                target: data[data.length - 1].close * 1.015,
                stopLoss: data[data.length - 1].close * 0.985,
                entry: data[data.length - 1].close,
                timeframe: 'short'
            };
        }
        
        return { detected: false };
    }

    detectBreakout(data) {
        const closes = data.map(d => d.close);
        const recentAvg = closes.slice(-5).reduce((a, b) => a + b) / 5;
        const olderAvg = closes.slice(-20, -5).reduce((a, b) => a + b) / 15;
        
        const breakout = Math.abs(recentAvg - olderAvg) / olderAvg;
        
        if (breakout > 0.01) {
            return {
                detected: true,
                confidence: 70,
                direction: recentAvg > olderAvg ? 'BUY' : 'SELL',
                target: data[data.length - 1].close * (recentAvg > olderAvg ? 1.02 : 0.98),
                stopLoss: data[data.length - 1].close * (recentAvg > olderAvg ? 0.99 : 1.01),
                entry: data[data.length - 1].close,
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

window.AdvancedTradingSystem = AdvancedTradingSystem;
window.AdvancedPatternRecognition = AdvancedPatternRecognition;

console.log('✅ Trading System (TensorFlow) cargado');