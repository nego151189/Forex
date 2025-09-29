// pattern-recognition.js - Sistema de Reconocimiento de Patrones Históricos COMPLETO

class PatternRecognitionSystem {
    constructor() {
        this.historicalPatterns = new Map(); // Base de datos de patrones por instrumento
        this.patternDatabase = []; // Todos los patrones exitosos encontrados
        this.currentAnalysis = null;
        this.similarityThreshold = 0.85; // 85% de similitud mínima
        this.minPatternLength = 10; // Mínimo 10 días para un patrón
        this.maxPatternLength = 60; // Máximo 60 días
        this.minROI = 2.0; // ROI mínimo 2% para considerar exitoso
        this.analysisCache = new Map();
    }

    // ⭐ FUNCIÓN PRINCIPAL: Analizar datos históricos completos para encontrar patrones exitosos
    async analyzeHistoricalData(historicalData, instrument) {
        console.log(`🔍 Analizando ${historicalData.length} días históricos de ${instrument} para encontrar patrones...`);
        
        if (historicalData.length < 100) {
            throw new Error(`Datos insuficientes: ${historicalData.length} días. Mínimo 100 días requeridos.`);
        }
        
        const patterns = [];
        const minDaysForPattern = this.minPatternLength;
        const maxDaysForPattern = this.maxPatternLength;
        const futureDays = 30; // Días para verificar resultado
        
        console.log(`📊 Buscando patrones de ${minDaysForPattern}-${maxDaysForPattern} días con resultados en ${futureDays} días`);
        
        // Buscar patrones en diferentes ventanas de tiempo
        for (let patternLength = minDaysForPattern; patternLength <= maxDaysForPattern; patternLength += 5) {
            console.log(`🔍 Analizando patrones de ${patternLength} días...`);
            
            for (let i = 0; i <= historicalData.length - patternLength - futureDays; i++) {
                const patternData = historicalData.slice(i, i + patternLength);
                const futureData = historicalData.slice(i + patternLength, i + patternLength + futureDays);
                
                if (futureData.length < 20) continue; // Necesitamos suficientes datos futuros
                
                // Analizar si este patrón fue exitoso
                const patternAnalysis = this.analyzePatternSuccess(patternData, futureData);
                
                if (patternAnalysis.isSuccessful && patternAnalysis.roi >= this.minROI) {
                    const pattern = {
                        id: `${instrument}_${i}_${patternLength}_${Date.now()}`,
                        instrument: instrument,
                        startDate: patternData[0].date,
                        endDate: patternData[patternLength - 1].date,
                        data: patternData,
                        futureOutcome: futureData.slice(0, 20), // Solo primeros 20 días del resultado
                        analysis: patternAnalysis,
                        signature: this.generatePatternSignature(patternData),
                        length: patternLength,
                        discovered: new Date().toISOString(),
                        metadata: {
                            startPrice: patternData[0].close,
                            endPrice: patternData[patternLength - 1].close,
                            priceRange: Math.max(...patternData.map(d => d.high)) - Math.min(...patternData.map(d => d.low)),
                            avgVolume: patternData.reduce((sum, d) => sum + (d.volume || 0), 0) / patternData.length
                        }
                    };
                    
                    patterns.push(pattern);
                    
                    if (patterns.length % 10 === 0) {
                        console.log(`✅ ${patterns.length} patrones exitosos encontrados hasta ahora...`);
                    }
                }
            }
        }
        
        // Filtrar patrones duplicados muy similares
        const uniquePatterns = this.removeDuplicatePatterns(patterns);
        
        // Guardar patrones en la base de datos
        this.patternDatabase = this.patternDatabase.concat(uniquePatterns);
        this.historicalPatterns.set(instrument, uniquePatterns);
        
        console.log(`🎯 Análisis completado: ${uniquePatterns.length} patrones únicos y exitosos encontrados para ${instrument}`);
        console.log(`📊 ROI promedio: ${(uniquePatterns.reduce((sum, p) => sum + p.analysis.roi, 0) / uniquePatterns.length).toFixed(2)}%`);
        
        return uniquePatterns;
    }

    // Analizar si un patrón fue exitoso
    analyzePatternSuccess(patternData, futureData) {
        const patternStartPrice = parseFloat(patternData[0].close);
        const patternEndPrice = parseFloat(patternData[patternData.length - 1].close);
        const patternMove = (patternEndPrice - patternStartPrice) / patternStartPrice;
        const patternDirection = patternMove > 0.005 ? 'bullish' : patternMove < -0.005 ? 'bearish' : 'neutral';
        
        // Analizar el resultado en los próximos días
        const futureClosePrices = futureData.map(d => parseFloat(d.close));
        const futureHighPrices = futureData.map(d => parseFloat(d.high));
        const futureLowPrices = futureData.map(d => parseFloat(d.low));
        
        const maxPrice = Math.max(...futureHighPrices);
        const minPrice = Math.min(...futureLowPrices);
        const finalPrice = futureClosePrices[futureClosePrices.length - 1];
        
        // Calcular movimientos desde el final del patrón
        const upMove = ((maxPrice - patternEndPrice) / patternEndPrice) * 100;
        const downMove = ((patternEndPrice - minPrice) / patternEndPrice) * 100;
        const finalMove = ((finalPrice - patternEndPrice) / patternEndPrice) * 100;
        
        // Calcular volatilidad del período futuro
        const futureVolatility = this.calculateVolatility(futureClosePrices);
        
        // Determinar si fue exitoso basado en criterios múltiples
        let isSuccessful = false;
        let roi = 0;
        let successType = '';
        let confidenceScore = 0;
        
        // Criterios de éxito más sofisticados
        if (patternDirection === 'bullish') {
            if (upMove > 3 && finalMove > 1.5) {
                isSuccessful = true;
                roi = Math.min(upMove, 15); // Cap ROI a 15% para evitar outliers
                successType = 'bullish_continuation';
                confidenceScore = Math.min(upMove / 5 * 100, 100);
            } else if (upMove > 5 && finalMove > -1) {
                isSuccessful = true;
                roi = upMove * 0.7; // Descuento por no mantener ganancia
                successType = 'bullish_spike';
                confidenceScore = Math.min(upMove / 7 * 100, 100);
            }
        } else if (patternDirection === 'bearish') {
            if (downMove > 3 && finalMove < -1.5) {
                isSuccessful = true;
                roi = Math.min(downMove, 15);
                successType = 'bearish_continuation';
                confidenceScore = Math.min(downMove / 5 * 100, 100);
            } else if (downMove > 5 && finalMove < 1) {
                isSuccessful = true;
                roi = downMove * 0.7;
                successType = 'bearish_spike';
                confidenceScore = Math.min(downMove / 7 * 100, 100);
            }
        } else { // neutral patterns
            if (Math.abs(finalMove) > 4) {
                isSuccessful = true;
                roi = Math.abs(finalMove);
                successType = finalMove > 0 ? 'neutral_breakout_up' : 'neutral_breakout_down';
                confidenceScore = Math.min(Math.abs(finalMove) / 6 * 100, 100);
            }
        }
        
        // Bonus por consistencia
        if (isSuccessful) {
            const consistency = this.calculateMoveConsistency(futureClosePrices, finalMove > 0);
            confidenceScore *= (0.7 + consistency * 0.3); // Ajustar por consistencia
        }
        
        return {
            isSuccessful,
            roi: parseFloat(roi.toFixed(2)),
            successType,
            patternDirection,
            patternMove: parseFloat((patternMove * 100).toFixed(2)),
            upMove: parseFloat(upMove.toFixed(2)),
            downMove: parseFloat(downMove.toFixed(2)),
            finalMove: parseFloat(finalMove.toFixed(2)),
            maxPrice: parseFloat(maxPrice.toFixed(5)),
            minPrice: parseFloat(minPrice.toFixed(5)),
            finalPrice: parseFloat(finalPrice.toFixed(5)),
            daysToTarget: this.findDaysToTarget(futureData, patternEndPrice, patternDirection),
            volatility: parseFloat(futureVolatility.toFixed(4)),
            confidenceScore: parseFloat(confidenceScore.toFixed(1)),
            riskRewardRatio: roi > 0 ? parseFloat((roi / Math.max(downMove, upMove, 1)).toFixed(2)) : 0
        };
    }

    // Calcular consistencia del movimiento
    calculateMoveConsistency(prices, isUpMove) {
        let consistentMoves = 0;
        for (let i = 1; i < prices.length; i++) {
            const dayMove = prices[i] - prices[i-1];
            if ((isUpMove && dayMove >= 0) || (!isUpMove && dayMove <= 0)) {
                consistentMoves++;
            }
        }
        return consistentMoves / (prices.length - 1);
    }

    // Calcular volatilidad
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance) * Math.sqrt(252); // Anualizada
    }

    // Encontrar cuántos días tomó alcanzar el objetivo
    findDaysToTarget(futureData, startPrice, direction) {
        const targetMove = direction === 'bullish' ? 0.03 : direction === 'bearish' ? -0.03 : 0.05;
        
        for (let i = 0; i < futureData.length; i++) {
            const currentMove = (parseFloat(futureData[i].close) - startPrice) / startPrice;
            if ((direction === 'bullish' && currentMove >= targetMove) ||
                (direction === 'bearish' && currentMove <= targetMove) ||
                (direction === 'neutral' && Math.abs(currentMove) >= Math.abs(targetMove))) {
                return i + 1;
            }
        }
        return futureData.length;
    }

    // Generar "firma" matemática del patrón para comparación
    generatePatternSignature(patternData) {
        const prices = patternData.map(d => parseFloat(d.close));
        const highs = patternData.map(d => parseFloat(d.high));
        const lows = patternData.map(d => parseFloat(d.low));
        const volumes = patternData.map(d => parseFloat(d.volume) || 0);
        
        return {
            // Precios normalizados para comparación de forma
            normalizedPrices: this.normalizePrices(prices),
            normalizedHighs: this.normalizePrices(highs),
            normalizedLows: this.normalizePrices(lows),
            
            // Características de tendencia
            trendStrength: this.calculateTrendStrength(prices),
            trendConsistency: this.calculateTrendConsistency(prices),
            
            // Perfil de volatilidad
            volatilityProfile: this.calculateVolatilityProfile(patternData),
            volatilityTrend: this.calculateVolatilityTrend(patternData),
            
            // Niveles técnicos
            supportResistanceLevels: this.findSupportResistance(patternData),
            keyLevels: this.findKeyPriceLevels(prices),
            
            // Análisis de volumen
            volumePattern: this.analyzeVolumePattern(patternData),
            volumeConfirmation: this.analyzeVolumeConfirmation(prices, volumes),
            
            // Indicadores técnicos
            technicalIndicators: this.calculatePatternIndicators(patternData),
            momentumProfile: this.calculateMomentumProfile(prices),
            
            // Características geométricas
            geometricFeatures: this.calculateGeometricFeatures(prices),
            
            // Metadata del patrón
            metadata: {
                length: patternData.length,
                priceRange: (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices),
                avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
                startPrice: prices[0],
                endPrice: prices[prices.length - 1],
                totalMove: (prices[prices.length - 1] - prices[0]) / prices[0]
            }
        };
    }

    // Normalizar precios para comparación (0-1 scale)
    normalizePrices(prices) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min;
        
        if (range === 0) return prices.map(() => 0.5);
        
        return prices.map(price => (price - min) / range);
    }

    // Calcular fuerza de tendencia
    calculateTrendStrength(prices) {
        if (prices.length < 2) return { totalMove: 0, strength: 0, direction: 'neutral' };
        
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const totalMove = (lastPrice - firstPrice) / firstPrice;
        
        // Calcular regresión lineal para medir fuerza de tendencia
        const regression = this.calculateLinearRegression(prices);
        const trendStrength = Math.abs(regression.slope) / (prices.reduce((sum, p) => sum + p, 0) / prices.length);
        
        return {
            totalMove: parseFloat(totalMove.toFixed(4)),
            strength: parseFloat(trendStrength.toFixed(4)),
            direction: totalMove > 0.005 ? 'up' : totalMove < -0.005 ? 'down' : 'sideways',
            slope: parseFloat(regression.slope.toFixed(6)),
            r_squared: parseFloat(regression.r_squared.toFixed(4))
        };
    }

    // Calcular regresión lineal
    calculateLinearRegression(prices) {
        const n = prices.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = prices;
        
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calcular R²
        const yMean = sumY / n;
        const ssRes = y.reduce((sum, val, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(val - predicted, 2);
        }, 0);
        const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
        const r_squared = 1 - (ssRes / ssTot);
        
        return { slope, intercept, r_squared };
    }

    // Calcular consistencia de tendencia
    calculateTrendConsistency(prices) {
        if (prices.length < 3) return 0;
        
        const moves = [];
        for (let i = 1; i < prices.length; i++) {
            moves.push(prices[i] - prices[i-1]);
        }
        
        const overallDirection = prices[prices.length - 1] - prices[0];
        let consistentMoves = 0;
        
        for (const move of moves) {
            if ((overallDirection > 0 && move >= 0) || (overallDirection < 0 && move <= 0)) {
                consistentMoves++;
            }
        }
        
        return consistentMoves / moves.length;
    }

    // Calcular perfil de volatilidad detallado
    calculateVolatilityProfile(patternData) {
        const volatilities = patternData.map(d => {
            const close = parseFloat(d.close);
            return (parseFloat(d.high) - parseFloat(d.low)) / close;
        });
        
        const avgVolatility = volatilities.reduce((a, b) => a + b) / volatilities.length;
        const maxVolatility = Math.max(...volatilities);
        const minVolatility = Math.min(...volatilities);
        
        // Calcular tendencia de volatilidad
        const firstHalf = volatilities.slice(0, Math.floor(volatilities.length / 2));
        const secondHalf = volatilities.slice(Math.floor(volatilities.length / 2));
        const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
        
        return {
            average: parseFloat(avgVolatility.toFixed(4)),
            max: parseFloat(maxVolatility.toFixed(4)),
            min: parseFloat(minVolatility.toFixed(4)),
            range: parseFloat((maxVolatility - minVolatility).toFixed(4)),
            trend: secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing',
            trendStrength: parseFloat(Math.abs(secondHalfAvg - firstHalfAvg).toFixed(4)),
            distribution: this.calculateVolatilityDistribution(volatilities)
        };
    }

    // Calcular distribución de volatilidad
    calculateVolatilityDistribution(volatilities) {
        const sorted = [...volatilities].sort((a, b) => a - b);
        const n = sorted.length;
        
        return {
            median: sorted[Math.floor(n / 2)],
            q1: sorted[Math.floor(n * 0.25)],
            q3: sorted[Math.floor(n * 0.75)],
            skewness: this.calculateSkewness(volatilities)
        };
    }

    // Calcular asimetría (skewness)
    calculateSkewness(data) {
        const n = data.length;
        const mean = data.reduce((sum, val) => sum + val, 0) / n;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return 0;
        
        const skewness = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
        return parseFloat(skewness.toFixed(4));
    }

    // Calcular tendencia de volatilidad
    calculateVolatilityTrend(patternData) {
        const volatilities = patternData.map(d => {
            const close = parseFloat(d.close);
            return (parseFloat(d.high) - parseFloat(d.low)) / close;
        });
        
        const regression = this.calculateLinearRegression(volatilities);
        
        return {
            direction: regression.slope > 0 ? 'increasing' : 'decreasing',
            strength: Math.abs(regression.slope),
            r_squared: regression.r_squared
        };
    }

    // Encontrar niveles de soporte y resistencia
    findSupportResistance(patternData) {
        const highs = patternData.map(d => parseFloat(d.high));
        const lows = patternData.map(d => parseFloat(d.low));
        
        const resistance = this.findLocalExtremes(highs, 'max', 3);
        const support = this.findLocalExtremes(lows, 'min', 3);
        
        return {
            resistanceLevels: resistance.map(r => ({ index: r.index, price: parseFloat(r.value.toFixed(5)) })),
            supportLevels: support.map(s => ({ index: s.index, price: parseFloat(s.value.toFixed(5)) })),
            keyResistance: resistance.length > 0 ? Math.max(...resistance.map(r => r.value)) : null,
            keySupport: support.length > 0 ? Math.min(...support.map(s => s.value)) : null
        };
    }

    // Encontrar extremos locales
    findLocalExtremes(data, type, lookback = 3) {
        const extremes = [];
        
        for (let i = lookback; i < data.length - lookback; i++) {
            let isExtreme = true;
            
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j === i) continue;
                
                if (type === 'max' && data[j] >= data[i]) {
                    isExtreme = false;
                    break;
                } else if (type === 'min' && data[j] <= data[i]) {
                    isExtreme = false;
                    break;
                }
            }
            
            if (isExtreme) {
                extremes.push({ index: i, value: data[i] });
            }
        }
        
        return extremes;
    }

    // Encontrar niveles de precio clave
    findKeyPriceLevels(prices) {
        const priceOccurrences = {};
        const tolerance = 0.001; // 0.1% de tolerancia
        
        // Agrupar precios similares
        prices.forEach(price => {
            const roundedPrice = Math.round(price / (price * tolerance)) * (price * tolerance);
            priceOccurrences[roundedPrice] = (priceOccurrences[roundedPrice] || 0) + 1;
        });
        
        // Encontrar niveles más frecuentes
        const sortedLevels = Object.entries(priceOccurrences)
            .map(([price, count]) => ({ price: parseFloat(price), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5 niveles
        
        return sortedLevels;
    }

    // Analizar patrón de volumen
    analyzeVolumePattern(patternData) {
        const volumes = patternData.map(d => parseFloat(d.volume) || 0).filter(v => v > 0);
        if (volumes.length === 0) return null;
        
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        const maxVolume = Math.max(...volumes);
        const minVolume = Math.min(...volumes);
        
        // Encontrar spikes de volumen
        const volumeSpikes = volumes.filter(v => v > avgVolume * 1.5).length;
        const volumeTrend = this.calculateTrendStrength(volumes);
        
        return {
            average: Math.round(avgVolume),
            max: Math.round(maxVolume),
            min: Math.round(minVolume),
            spikes: volumeSpikes,
            trend: volumeTrend.direction,
            trendStrength: volumeTrend.strength,
            distribution: {
                aboveAverage: volumes.filter(v => v > avgVolume).length / volumes.length,
                highVolumeDays: volumes.filter(v => v > avgVolume * 1.2).length
            }
        };
    }

    // Analizar confirmación de volumen
    analyzeVolumeConfirmation(prices, volumes) {
        if (volumes.length === 0 || volumes.every(v => v === 0)) return null;
        
        const priceChanges = [];
        const volumeChanges = [];
        
        for (let i = 1; i < prices.length; i++) {
            priceChanges.push(prices[i] - prices[i-1]);
            volumeChanges.push(volumes[i] - volumes[i-1]);
        }
        
        // Calcular correlación entre cambios de precio y volumen
        const correlation = this.calculateCorrelation(priceChanges, volumeChanges);
        
        return {
            priceVolumeCorrelation: parseFloat(correlation.toFixed(4)),
            confirmationStrength: Math.abs(correlation) > 0.3 ? 'strong' : Math.abs(correlation) > 0.1 ? 'moderate' : 'weak'
        };
    }

    // Calcular correlación
    calculateCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n === 0) return 0;
        
        const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        
        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;
        
        for (let i = 0; i < n; i++) {
            const xDiff = x[i] - meanX;
            const yDiff = y[i] - meanY;
            numerator += xDiff * yDiff;
            sumXSquared += xDiff * xDiff;
            sumYSquared += yDiff * yDiff;
        }
        
        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Calcular indicadores técnicos del patrón
    calculatePatternIndicators(patternData) {
        const prices = patternData.map(d => parseFloat(d.close));
        const highs = patternData.map(d => parseFloat(d.high));
        const lows = patternData.map(d => parseFloat(d.low));
        
        // RSI
        const rsi = this.calculateRSI(prices, 14);
        
        // MACD
        const macd = this.calculateMACD(prices);
        
        // Bollinger Bands
        const bb = this.calculateBollingerBands(prices, 20, 2);
        
        // ATR
        const atr = this.calculateATR(highs, lows, prices, 14);
        
        // Stochastic
        const stoch = this.calculateStochastic(highs, lows, prices, 14);
        
        return {
            rsi: {
                start: rsi.length > 0 ? parseFloat(rsi[0].toFixed(2)) : null,
                end: rsi.length > 0 ? parseFloat(rsi[rsi.length - 1].toFixed(2)) : null,
                trend: rsi.length > 1 ? parseFloat((rsi[rsi.length - 1] - rsi[0]).toFixed(2)) : 0,
                average: rsi.length > 0 ? parseFloat((rsi.reduce((sum, val) => sum + val, 0) / rsi.length).toFixed(2)) : null,
                extremes: {
                    overbought: rsi.filter(val => val > 70).length,
                    oversold: rsi.filter(val => val < 30).length
                }
            },
            macd: {
                start: macd.length > 0 ? parseFloat(macd[0].toFixed(6)) : null,
                end: macd.length > 0 ? parseFloat(macd[macd.length - 1].toFixed(6)) : null,
                trend: macd.length > 1 ? parseFloat((macd[macd.length - 1] - macd[0]).toFixed(6)) : 0,
                crossovers: this.countZeroCrossovers(macd)
            },
            bollingerBands: bb ? {
                percentB: bb.percentB,
                width: bb.width,
                squeezes: bb.squeezes
            } : null,
            atr: {
                average: atr.length > 0 ? parseFloat((atr.reduce((sum, val) => sum + val, 0) / atr.length).toFixed(6)) : null,
                trend: atr.length > 1 ? parseFloat((atr[atr.length - 1] - atr[0]).toFixed(6)) : 0
            },
            stochastic: stoch ? {
                start: parseFloat(stoch[0].toFixed(2)),
                end: parseFloat(stoch[stoch.length - 1].toFixed(2)),
                overbought: stoch.filter(val => val > 80).length,
                oversold: stoch.filter(val => val < 20).length
            } : null
        };
    }

   // RSI mejorado
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return [];
        
        const rsi = [];
        const gains = [];
        const losses = [];
        
        // Calcular cambios
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        // Primera media
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
        
        for (let i = period; i < prices.length; i++) {
            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
            
            // Media suavizada
            avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
        }
        
        return rsi;
    }

    // MACD mejorado
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return [];
        
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        
        const macd = [];
        const minLength = Math.min(emaFast.length, emaSlow.length);
        
        for (let i = 0; i < minLength; i++) {
            macd.push(emaFast[i] - emaSlow[i]);
        }
        
        return macd;
    }

    // EMA mejorado
    calculateEMA(prices, period) {
        if (prices.length === 0) return [];
        
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // Primera EMA es SMA
        const firstSMA = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
        ema.push(firstSMA);
        
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
            ema.push(currentEMA);
        }
        
        return ema;
    }

    // ATR mejorado
    calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < 2) return [];
        
        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        if (trueRanges.length < period) return [];
        
        const atr = [];
        
        // Primera ATR es promedio simple
        let currentATR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
        atr.push(currentATR);
        
        // ATR suavizada
        for (let i = period; i < trueRanges.length; i++) {
            currentATR = (currentATR * (period - 1) + trueRanges[i]) / period;
            atr.push(currentATR);
        }
        
        return atr;
    }

    // Bollinger Bands
    calculateBollingerBands(prices, period = 20, deviation = 2) {
        if (prices.length < period) return null;
        
        const sma = [];
        const upperBands = [];
        const lowerBands = [];
        const percentB = [];
        const bandWidths = [];
        
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const average = slice.reduce((sum, price) => sum + price, 0) / period;
            
            const variance = slice.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / period;
            const stdDev = Math.sqrt(variance);
            
            const upper = average + (stdDev * deviation);
            const lower = average - (stdDev * deviation);
            const width = (upper - lower) / average;
            const pctB = (prices[i] - lower) / (upper - lower);
            
            sma.push(average);
            upperBands.push(upper);
            lowerBands.push(lower);
            percentB.push(pctB);
            bandWidths.push(width);
        }
        
        // Detectar squeezes (bandas estrechas)
        const avgWidth = bandWidths.reduce((sum, w) => sum + w, 0) / bandWidths.length;
        const squeezes = bandWidths.filter(w => w < avgWidth * 0.8).length;
        
        return {
            sma,
            upperBands,
            lowerBands,
            percentB,
            width: bandWidths,
            squeezes,
            avgWidth: parseFloat(avgWidth.toFixed(6))
        };
    }

    // Stochastic Oscillator
    calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
        if (highs.length < kPeriod) return null;
        
        const kValues = [];
        
        for (let i = kPeriod - 1; i < highs.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
            const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
            kValues.push(k);
        }
        
        return kValues;
    }

    // Contar cruces por cero en MACD
    countZeroCrossovers(macd) {
        let crossovers = 0;
        for (let i = 1; i < macd.length; i++) {
            if ((macd[i - 1] < 0 && macd[i] > 0) || (macd[i - 1] > 0 && macd[i] < 0)) {
                crossovers++;
            }
        }
        return crossovers;
    }

    // Generar recomendación basada en el análisis
    generateRecommendation(outcome) {
        const roi = outcome.roi;
        const confidence = outcome.confidenceScore;
        
        if (roi > 5 && confidence > 80) {
            return "COMPRA FUERTE - Alta probabilidad de éxito";
        } else if (roi > 3 && confidence > 60) {
            return "COMPRA MODERADA - Buena oportunidad";
        } else if (roi > 1.5 && confidence > 40) {
            return "COMPRA DÉBIL - Considerar con precaución";
        } else {
            return "EVITAR - Riesgo alto o baja probabilidad";
        }
    }

    // Calcular precio objetivo
    calculateTargetPrice(instrument, outcome) {
        // Esta función necesitaría el precio actual del instrumento
        // Por ahora retorna un placeholder
        return {
            target1: "Precio actual + " + (outcome.roi * 0.5).toFixed(1) + "%",
            target2: "Precio actual + " + outcome.roi.toFixed(1) + "%",
            method: "Basado en ROI histórico promedio"
        };
    }

    // Calcular stop loss
    calculateStopLoss(instrument, outcome) {
        const riskPercent = Math.min(outcome.roi * 0.3, 3); // Máximo 3% de riesgo
        return {
            stopLoss: "Precio actual - " + riskPercent.toFixed(1) + "%",
            method: "30% del ROI esperado o máximo 3%"
        };
    }

    // Función para guardar patrones en almacenamiento local (si está disponible)
    savePatterns() {
        try {
            const data = {
                patterns: Array.from(this.historicalPatterns.entries()),
                database: this.patternDatabase,
                timestamp: new Date().toISOString()
            };
            // En un entorno real, esto se guardaría en una base de datos
            console.log("Patrones guardados:", data);
            return true;
        } catch (error) {
            console.error("Error guardando patrones:", error);
            return false;
        }
    }

    // Función para cargar patrones guardados
    loadPatterns(data) {
        try {
            if (data.patterns) {
                this.historicalPatterns = new Map(data.patterns);
            }
            if (data.database) {
                this.patternDatabase = data.database;
            }
            console.log("Patrones cargados exitosamente");
            return true;
        } catch (error) {
            console.error("Error cargando patrones:", error);
            return false;
        }
    }

    // Obtener estadísticas del sistema
    getSystemStats() {
        const totalPatterns = this.patternDatabase.length;
        const instruments = Array.from(this.historicalPatterns.keys());
        
        const roiStats = this.patternDatabase.map(p => p.analysis.roi);
        const avgROI = roiStats.length > 0 ? roiStats.reduce((sum, roi) => sum + roi, 0) / roiStats.length : 0;
        const maxROI = roiStats.length > 0 ? Math.max(...roiStats) : 0;
        const minROI = roiStats.length > 0 ? Math.min(...roiStats) : 0;
        
        const successfulPatterns = this.patternDatabase.filter(p => p.analysis.roi > 2).length;
        const successRate = totalPatterns > 0 ? (successfulPatterns / totalPatterns) * 100 : 0;
        
        return {
            totalPatterns,
            instruments: instruments.length,
            instrumentList: instruments,
            avgROI: parseFloat(avgROI.toFixed(2)),
            maxROI: parseFloat(maxROI.toFixed(2)),
            minROI: parseFloat(minROI.toFixed(2)),
            successRate: parseFloat(successRate.toFixed(1)),
            patternsPerInstrument: instruments.map(inst => ({
                instrument: inst,
                count: this.historicalPatterns.get(inst).length
            }))
        };
    }

    // Limpiar cache de análisis
    clearCache() {
        this.analysisCache.clear();
        console.log("Cache de análisis limpiado");
    }

    // Función de utilidad para logging con timestamp
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }
}

// Exportar la clase (si estás usando módulos)
// export default PatternRecognitionSystem;

// Para uso en navegador sin módulos:
if (typeof window !== 'undefined') {
    window.PatternRecognitionSystem = PatternRecognitionSystem;
}

// Ejemplo de uso básico
/*
const patternSystem = new PatternRecognitionSystem();

// 1. Analizar datos históricos para encontrar patrones
const historicalData = [
    // Array de objetos con formato: {date, open, high, low, close, volume}
];
const patterns = await patternSystem.analyzeHistoricalData(historicalData, 'EURUSD');

// 2. Comparar datos actuales con patrones históricos
const currentData = [
    // Últimos 20-30 días de datos
];
const similarities = await patternSystem.findSimilarPatterns(currentData, 'EURUSD', 0.85);

// 3. Generar alerta si se encuentra un patrón similar
if (similarities.length > 0) {
    const alert = patternSystem.generatePatternAlert(similarities, 'EURUSD');
    console.log(alert);
}
*/