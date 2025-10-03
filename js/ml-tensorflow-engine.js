// ml-tensorflow-engine.js - MOTOR ML REAL CON TENSORFLOW.JS (CORREGIDO)
class ForexTensorFlowModel {
    constructor(instrument) {
        this.instrument = instrument;
        this.model = null;
        this.isTraining = false;
        this.trainingHistory = [];
        this.sequenceLength = 60;
        this.features = ['open', 'high', 'low', 'close', 'volume', 'rsi', 'macd', 'atr', 'momentum'];
        this.scaler = { mean: null, std: null };
        this.accuracy = 0;
        this.isTrained = false;
        this.firebaseSync = new FirebaseMLSync();
    }

    async buildModel() {
        const model = tf.sequential({
            layers: [
                // Primera capa LSTM con dropout
                tf.layers.lstm({
                    units: 128,
                    returnSequences: true,
                    inputShape: [this.sequenceLength, this.features.length],
                    dropout: 0.2,
                    recurrentDropout: 0.2
                }),
                
                // Batch Normalization para estabilidad
                tf.layers.batchNormalization(),
                
                // Segunda capa LSTM
                tf.layers.lstm({
                    units: 64,
                    returnSequences: false,
                    dropout: 0.2,
                    recurrentDropout: 0.2
                }),
                
                // Batch Normalization
                tf.layers.batchNormalization(),
                
                // Capas densas con regularización
                tf.layers.dense({
                    units: 32,
                    activation: 'relu',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                
                tf.layers.dropout({ rate: 0.3 }),
                
                tf.layers.dense({
                    units: 16,
                    activation: 'relu',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                
                // Salida: 3 clases (BUY, SELL, HOLD)
                tf.layers.dense({
                    units: 3,
                    activation: 'softmax'
                })
            ]
        });

        // Optimizer con learning rate adaptativo
        const optimizer = tf.train.adam(0.001);
        
        model.compile({
            optimizer: optimizer,
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        this.model = model;
        console.log('✅ Modelo LSTM construido');
        
        return model;
    }

    async trainOnRealData(historicalData, epochs = 30, validationSplit = 0.2) {
        if (this.isTraining) {
            throw new Error('El modelo ya está entrenando');
        }

        if (historicalData.length < 1000) {
            throw new Error(`⚠️ Se necesitan al menos 1000 datos. Tienes: ${historicalData.length}`);
        }

        this.isTraining = true;
        
        try {
            console.log(`🚀 Iniciando entrenamiento para ${this.instrument} con ${historicalData.length} datos`);
            
            // Construir modelo si no existe
            if (!this.model) {
                await this.buildModel();
            }

            // Preparar datos con indicadores técnicos
            const enrichedData = this.enrichDataWithIndicators(historicalData);
            console.log(`📊 Datos enriquecidos: ${enrichedData.length} velas`);
            
            const { xTrain, yTrain, xVal, yVal, classDistribution } = this.prepareTrainingData(enrichedData);
            
            console.log(`📦 Datos preparados:`);
            console.log(`   Training: ${xTrain.shape[0]} muestras`);
            console.log(`   Validation: ${xVal.shape[0]} muestras`);
            console.log(`   Distribución clases:`, classDistribution);

            // Verificar balance de clases
            const minClassPct = Math.min(...Object.values(classDistribution)) / xTrain.shape[0];
            if (minClassPct < 0.15) {
                console.warn(`⚠️ Clases desbalanceadas. Clase minoritaria: ${(minClassPct * 100).toFixed(1)}%`);
            }

            // Callbacks para monitoreo
            const callbacks = {
                onEpochEnd: async (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}/${epochs}`);
                    console.log(`  Loss: ${logs.loss.toFixed(4)} | Accuracy: ${(logs.acc * 100).toFixed(2)}%`);
                    console.log(`  Val Loss: ${logs.val_loss.toFixed(4)} | Val Accuracy: ${(logs.val_acc * 100).toFixed(2)}%`);
                    
                    // ✅ ACTUALIZAR INDICADOR VISUAL
                    if (window.trainingProgress) {
                        window.trainingProgress.updateProgress(epoch + 1, epochs, logs);
                    }
                    
                    // Guardar progreso en Firebase cada 5 epochs
                    if ((epoch + 1) % 5 === 0) {
                        await this.firebaseSync.saveTrainingEpoch(this.instrument, epoch + 1, logs);
                    }
                    
                    // Early stopping si overfitting
                    if (epoch > 10 && logs.acc > 0.95 && logs.val_acc < 0.70) {
                        console.warn('⚠️ Detectado overfitting. Considera detener entrenamiento.');
                    }
                },
                
                onTrainEnd: async () => {
                    console.log('✅ Entrenamiento completado');
                }
            };

            // Entrenar el modelo
            const history = await this.model.fit(xTrain, yTrain, {
                epochs: epochs,
                batchSize: 32,
                validationData: [xVal, yVal],
                shuffle: true,
                callbacks: callbacks,
                verbose: 0
            });

            // Actualizar métricas
            const finalAccuracy = history.history.val_acc[history.history.val_acc.length - 1];
            this.accuracy = finalAccuracy;
            this.isTrained = true;

            // Guardar histórico de entrenamiento
            this.trainingHistory.push({
                timestamp: new Date().toISOString(),
                epochs: epochs,
                finalAccuracy: finalAccuracy,
                finalLoss: history.history.val_loss[history.history.val_loss.length - 1],
                dataPoints: historicalData.length,
                classDistribution: classDistribution
            });

            // Guardar modelo completo en Firebase
            await this.saveModelToFirebase();

            console.log(`✅ Modelo entrenado exitosamente - Accuracy: ${(finalAccuracy * 100).toFixed(2)}%`);

            // Limpiar tensores
            xTrain.dispose();
            yTrain.dispose();
            xVal.dispose();
            yVal.dispose();

            return {
                accuracy: finalAccuracy,
                history: history.history,
                instrument: this.instrument,
                classDistribution: classDistribution
            };
            
        } catch (error) {
            console.error('❌ Error durante entrenamiento:', error);
            throw error;
        } finally {
            this.isTraining = false;
        }
    }

    enrichDataWithIndicators(data) {
        const enriched = data.map((candle, index, array) => {
            const slice = array.slice(Math.max(0, index - 20), index + 1);
            
            return {
                ...candle,
                rsi: this.calculateRSI(slice),
                macd: this.calculateMACD(slice),
                atr: this.calculateATR(slice),
                momentum: this.calculateMomentum(slice)
            };
        });

        return enriched.slice(20); // Eliminar primeros 20 sin indicadores completos
    }

    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return 50;
        
        const prices = data.map(d => d.close);
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(data) {
        if (data.length < 26) return 0;
        
        const prices = data.map(d => d.close);
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        return ema12 - ema26;
    }

    calculateEMA(prices, period) {
        if (prices.length === 0) return 0;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateATR(data, period = 14) {
        if (data.length < 2) return 0;
        
        let atr = 0;
        for (let i = 1; i < Math.min(data.length, period + 1); i++) {
            const tr = Math.max(
                data[i].high - data[i].low,
                Math.abs(data[i].high - data[i-1].close),
                Math.abs(data[i].low - data[i-1].close)
            );
            atr += tr;
        }
        
        return atr / Math.min(data.length - 1, period);
    }

    calculateMomentum(data, period = 10) {
        if (data.length < period + 1) return 0;
        
        const prices = data.map(d => d.close);
        const currentPrice = prices[prices.length - 1];
        const pastPrice = prices[prices.length - period - 1];
        
        return ((currentPrice - pastPrice) / pastPrice) * 100;
    }

    prepareTrainingData(enrichedData) {
        // Extraer features
        const allFeatures = enrichedData.map(candle => [
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume || 0,
            candle.rsi,
            candle.macd,
            candle.atr,
            candle.momentum
        ]);

        // Crear secuencias Y labels ANTES de normalizar
        const sequences = [];
        const labels = [];

        for (let i = this.sequenceLength; i < allFeatures.length - 10; i++) {
            const sequence = allFeatures.slice(i - this.sequenceLength, i);
            
            // Calcular movimiento futuro para etiqueta
            const futureSlice = enrichedData.slice(i, i + 10);
            const futureMove = this.calculateFutureMove(futureSlice);
            const label = this.moveToOneHot(futureMove);
            
            sequences.push(sequence);
            labels.push(label);
        }

        console.log(`📋 Total secuencias creadas: ${sequences.length}`);

        // ✅ PASO 1: Split train/validation PRIMERO
        const totalSamples = sequences.length;
        const trainSize = Math.floor(totalSamples * 0.8);

        const trainSequences = sequences.slice(0, trainSize);
        const valSequences = sequences.slice(trainSize);
        const trainLabels = labels.slice(0, trainSize);
        const valLabels = labels.slice(trainSize);

        // Calcular distribución de clases
        const classDistribution = this.calculateClassDistribution(trainLabels);

        // ✅ PASO 2: Normalizar SOLO con datos de training
        const flattenedTrain = trainSequences.flat();
        const { normalized: normalizedTrainFlat, mean, std } = this.normalizeDataArray(flattenedTrain);
        this.scaler = { mean, std };

        // Reshape a secuencias
        const normalizedTrain = [];
        for (let i = 0; i < trainSequences.length; i++) {
            const sequence = [];
            for (let j = 0; j < this.sequenceLength; j++) {
                sequence.push(normalizedTrainFlat[i * this.sequenceLength + j]);
            }
            normalizedTrain.push(sequence);
        }

        // ✅ PASO 3: Normalizar validación con scaler de training
        const normalizedVal = valSequences.map(seq => 
            seq.map(row => 
                row.map((val, j) => 
                    (val - this.scaler.mean[j]) / (this.scaler.std[j] + 1e-7)
                )
            )
        );

        // Convertir a tensores
        const xTrain = tf.tensor3d(normalizedTrain);
        const yTrain = tf.tensor2d(trainLabels);
        const xVal = tf.tensor3d(normalizedVal);
        const yVal = tf.tensor2d(valLabels);

        return { xTrain, yTrain, xVal, yVal, classDistribution };
    }

    normalizeDataArray(features) {
        // Convertir a formato [samples, features]
        const numSamples = features.length;
        const numFeatures = features[0].length;
        
        const tensor = tf.tensor2d(features);
        const mean = tensor.mean(0);
        const std = tensor.sub(mean).square().mean(0).sqrt();
        
        const normalized = tensor.sub(mean).div(std.add(1e-7));
        
        const result = {
            normalized: normalized.arraySync(),
            mean: mean.arraySync(),
            std: std.arraySync()
        };
        
        tensor.dispose();
        mean.dispose();
        std.dispose();
        normalized.dispose();
        
        return result;
    }

    calculateClassDistribution(labels) {
        const counts = { BUY: 0, SELL: 0, HOLD: 0 };
        
        labels.forEach(label => {
            if (label[0] === 1) counts.BUY++;
            else if (label[1] === 1) counts.SELL++;
            else counts.HOLD++;
        });
        
        return counts;
    }

    calculateFutureMove(futureData) {
        const startPrice = futureData[0].close;
        const maxPrice = Math.max(...futureData.map(d => d.high));
        const minPrice = Math.min(...futureData.map(d => d.low));
        const endPrice = futureData[futureData.length - 1].close;

        const upMove = (maxPrice - startPrice) / startPrice;
        const downMove = (startPrice - minPrice) / startPrice;
        const netMove = (endPrice - startPrice) / startPrice;

        // ✅ Umbrales adaptativos por instrumento
        let buyThreshold, sellThreshold;
        
        if (this.instrument === 'XAUUSD') {
            // Oro: movimientos más amplios
            buyThreshold = 0.004;   // 0.4%
            sellThreshold = 0.004;
        } else if (this.instrument.includes('JPY')) {
            // Pares con JPY: movimientos medianos
            buyThreshold = 0.0012;  // 0.12%
            sellThreshold = 0.0012;
        } else if (['USDZAR', 'USDTRY', 'USDBRL', 'USDMXN'].includes(this.instrument)) {
            // Exóticos: movimientos más amplios
            buyThreshold = 0.002;   // 0.2%
            sellThreshold = 0.002;
        } else {
            // Majors estándar: movimientos pequeños
            buyThreshold = 0.0005;  // 0.05%
            sellThreshold = 0.0005;
        }

        // Clasificación con umbrales adaptativos
        if (upMove > buyThreshold && netMove > buyThreshold * 0.5) {
            return 'BUY';
        } else if (downMove > sellThreshold && netMove < -sellThreshold * 0.5) {
            return 'SELL';
        } else {
            return 'HOLD';
        }
    }

    moveToOneHot(move) {
        // BUY = [1, 0, 0], SELL = [0, 1, 0], HOLD = [0, 0, 1]
        if (move === 'BUY') return [1, 0, 0];
        if (move === 'SELL') return [0, 1, 0];
        return [0, 0, 1];
    }

    async predict(currentData) {
        if (!this.model || !this.isTrained) {
            throw new Error('El modelo no está entrenado');
        }

        if (currentData.length < this.sequenceLength + 20) {
            throw new Error('Datos insuficientes para predicción');
        }

        try {
            // Enriquecer con indicadores
            const enrichedData = this.enrichDataWithIndicators(currentData);
            
            // Tomar última secuencia
            const recentData = enrichedData.slice(-this.sequenceLength);
            
            const features = recentData.map(candle => [
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume || 0,
                candle.rsi,
                candle.macd,
                candle.atr,
                candle.momentum
            ]);

            // Normalizar usando el scaler guardado
            const normalizedFeatures = features.map(row => 
                row.map((val, j) => 
                    (val - this.scaler.mean[j]) / (this.scaler.std[j] + 1e-7)
                )
            );

            // Preparar tensor
            const inputTensor = tf.tensor3d([normalizedFeatures]);

            // Predicción
            const prediction = this.model.predict(inputTensor);
            const probabilities = await prediction.data();

            // Limpiar tensores
            inputTensor.dispose();
            prediction.dispose();

            // Interpretar resultado
            const [buyProb, sellProb, holdProb] = probabilities;
            const maxProb = Math.max(buyProb, sellProb, holdProb);
            
            let direction;
            if (buyProb === maxProb) direction = 'BUY';
            else if (sellProb === maxProb) direction = 'SELL';
            else direction = 'HOLD';

            const confidence = maxProb * 100;

            const result = {
                direction,
                confidence,
                probabilities: {
                    buy: (buyProb * 100).toFixed(2),
                    sell: (sellProb * 100).toFixed(2),
                    hold: (holdProb * 100).toFixed(2)
                },
                timestamp: new Date(),
                instrument: this.instrument
            };

            console.log(`🎯 Predicción: ${direction} (${confidence.toFixed(1)}%)`);

            return result;

        } catch (error) {
            console.error('❌ Error en predicción:', error);
            throw error;
        }
    }

    async saveModelToFirebase() {
        try {
            // Guardar pesos en IndexedDB (navegador)
            const savePath = `indexeddb://forex-model-${this.instrument}`;
            await this.model.save(savePath);
            console.log(`💾 Modelo guardado localmente: ${savePath}`);

            // Guardar metadata en Firestore
            const metadata = {
                instrument: this.instrument,
                architecture: 'LSTM',
                sequenceLength: this.sequenceLength,
                features: this.features,
                accuracy: this.accuracy,
                isTrained: this.isTrained,
                lastTrained: firebase.firestore.FieldValue.serverTimestamp(),
                trainingHistory: this.trainingHistory,
                scaler: this.scaler
            };

            await firebase.firestore()
                .collection('ml_models')
                .doc(this.instrument)
                .set(metadata, { merge: true });

            console.log('✅ Metadata guardada en Firebase');

        } catch (error) {
            console.error('❌ Error guardando modelo:', error);
            throw error;
        }
    }

    async loadModelFromFirebase() {
        try {
            // Cargar metadata
            const doc = await firebase.firestore()
                .collection('ml_models')
                .doc(this.instrument)
                .get();

            if (!doc.exists) {
                console.log('No hay modelo guardado para este instrumento');
                return false;
            }

            const metadata = doc.data();
            
            // Restaurar propiedades
            this.accuracy = metadata.accuracy || 0;
            this.isTrained = metadata.isTrained || false;
            this.trainingHistory = metadata.trainingHistory || [];
            this.scaler = metadata.scaler || { mean: null, std: null };

            // Cargar modelo de IndexedDB
            const loadPath = `indexeddb://forex-model-${this.instrument}`;
            
            try {
                this.model = await tf.loadLayersModel(loadPath);
                console.log(`✅ Modelo ${this.instrument} cargado desde IndexedDB`);
                return true;
            } catch (loadError) {
                console.log('No se pudo cargar modelo de IndexedDB, se debe entrenar nuevo');
                return false;
            }

        } catch (error) {
            console.error('❌ Error cargando modelo:', error);
            return false;
        }
    }

    async deleteModel() {
        try {
            // Eliminar de IndexedDB
            await tf.io.removeModel(`indexeddb://forex-model-${this.instrument}`);
            
            // Eliminar de Firestore
            await firebase.firestore()
                .collection('ml_models')
                .doc(this.instrument)
                .delete();

            this.model = null;
            this.isTrained = false;
            this.accuracy = 0;

            console.log(`🗑️ Modelo ${this.instrument} eliminado`);

        } catch (error) {
            console.error('❌ Error eliminando modelo:', error);
        }
    }

    getModelInfo() {
        return {
            instrument: this.instrument,
            isTrained: this.isTrained,
            accuracy: this.accuracy,
            trainingHistory: this.trainingHistory,
            sequenceLength: this.sequenceLength,
            features: this.features
        };
    }
}

// Sincronización con Firebase
class FirebaseMLSync {
    constructor() {
        this.db = firebase.firestore();
    }

    async saveTrainingEpoch(instrument, epoch, metrics) {
        try {
            await this.db.collection('training_epochs')
                .add({
                    instrument,
                    epoch,
                    loss: metrics.loss,
                    accuracy: metrics.acc,
                    val_loss: metrics.val_loss,
                    val_accuracy: metrics.val_acc,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Error guardando epoch:', error);
        }
    }

    async getTrainingHistory(instrument, limit = 100) {
        try {
            const snapshot = await this.db.collection('training_epochs')
                .where('instrument', '==', instrument)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }
}

window.ForexTensorFlowModel = ForexTensorFlowModel;
window.FirebaseMLSync = FirebaseMLSync;

console.log('✅ TensorFlow.js ML Engine cargado (versión corregida)');