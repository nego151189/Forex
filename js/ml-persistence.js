// ml-persistence.js - SISTEMA DE PERSISTENCIA CORREGIDO
class MLPersistenceSystem {
    constructor() {
        this.storageKey = 'forex-ml-models';
        this.trainingHistoryKey = 'forex-training-history';
        this.modelVersion = '2.0'; // Versión actualizada
        this.autoSave = true;
        this.models = new Map();
    }

    // ✅ GUARDAR MODELO SOLO CUANDO ES NECESARIO
    async saveModel(modelId, mlModel, forceSave = false) {
        try {
            console.log(`💾 [PERSISTENCE] Evaluando guardado para: ${modelId}`);
            
            // ✅ CONDICIONES ESTRICTAS PARA GUARDAR
            const shouldSave = forceSave || 
                (mlModel.isTrained && 
                 mlModel.accuracy > 0.4 && 
                 mlModel.trainingHistory?.length > 0 &&
                 mlModel._lastSaveTime !== mlModel.trainingHistory?.length); // Solo guardar si hay nuevo entrenamiento

            if (!shouldSave) {
                console.log(`⏸️ [PERSISTENCE] Guardado omitido - Modelo no cumple condiciones:`, {
                    trained: mlModel.isTrained,
                    accuracy: mlModel.accuracy,
                    sessions: mlModel.trainingHistory?.length,
                    lastSave: mlModel._lastSaveTime
                });
                return false;
            }

            console.log(`💾 [PERSISTENCE] Guardando modelo: ${modelId} (Accuracy: ${mlModel.accuracy})`);

            const modelData = {
                version: this.modelVersion,
                timestamp: new Date().toISOString(),
                modelState: this.extractModelState(mlModel),
                performance: this.extractPerformanceMetrics(mlModel),
                metadata: {
                    instrument: modelId,
                    trainingSessions: mlModel.trainingHistory?.length || 0,
                    totalPredictions: mlModel.predictions?.length || 0,
                    accuracy: mlModel.accuracy || 0,
                    lastTraining: mlModel.trainingHistory?.length > 0 ? 
                        mlModel.trainingHistory[mlModel.trainingHistory.length - 1].timestamp : 'never'
                }
            };

            const existingData = this.loadAllModels();
            existingData[modelId] = modelData;
            
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            
            // Marcar tiempo del último guardado
            mlModel._lastSaveTime = mlModel.trainingHistory?.length;

            console.log(`✅ [PERSISTENCE] Modelo ${modelId} guardado EXITOSAMENTE`);
            return true;

        } catch (error) {
            console.error('❌ [PERSISTENCE] Error guardando modelo:', error);
            return false;
        }
    }

    // ✅ CARGAR MODELO
    async loadModel(modelId, mlModel) {
        try {
            console.log(`📂 Cargando modelo: ${modelId}`);
            
            const allModels = this.loadAllModels();
            const modelData = allModels[modelId];

            if (!modelData) {
                console.log(`⚠️ No se encontró modelo guardado: ${modelId}`);
                return false;
            }

            // Verificar versión de compatibilidad
            if (modelData.version !== this.modelVersion) {
                console.warn(`⚠️ Versión de modelo diferente: ${modelData.version}`);
            }

            // Restaurar estado del modelo
            this.restoreModelState(mlModel, modelData.modelState);
            
            // Restaurar último tiempo de guardado
            mlModel._lastSaveTime = mlModel.trainingHistory?.length;
            
            console.log(`✅ Modelo ${modelId} cargado exitosamente`);
            console.log(`📊 Estado: ${mlModel.isTrained ? 'ENTRENADO' : 'NO ENTRENADO'}, Accuracy: ${(mlModel.accuracy * 100).toFixed(1)}%`);
            
            return true;

        } catch (error) {
            console.error('❌ Error cargando modelo:', error);
            return false;
        }
    }

    // ✅ EXTRACT MODEL STATE
    extractModelState(mlModel) {
        return {
            isTrained: mlModel.isTrained,
            accuracy: mlModel.accuracy,
            trainingHistory: mlModel.trainingHistory || [],
            backtestResults: mlModel.backtestResults,
            predictions: mlModel.predictions?.slice(-50) || [], // Solo últimas 50 predicciones
            modelWeights: mlModel.modelWeights,
            featureStats: this.calculateFeatureStats(mlModel),
            learningMetrics: {
                totalTrainingSessions: mlModel.trainingHistory?.length || 0,
                avgAccuracy: this.calculateAverageAccuracy(mlModel),
                performanceTrend: this.calculatePerformanceTrend(mlModel)
            }
        };
    }

    // ✅ RESTORE MODEL STATE
    restoreModelState(mlModel, modelState) {
        mlModel.isTrained = modelState.isTrained;
        mlModel.accuracy = modelState.accuracy;
        mlModel.trainingHistory = modelState.trainingHistory || [];
        mlModel.backtestResults = modelState.backtestResults;
        mlModel.predictions = modelState.predictions || [];
        mlModel.modelWeights = modelState.modelWeights || mlModel.modelWeights;
        
        console.log(`🔄 Modelo restaurado: ${modelState.trainingHistory.length} sesiones de entrenamiento`);
    }

    // ✅ GUARDAR HISTORIAL DE ENTRENAMIENTO
    async saveTrainingSession(modelId, sessionData) {
        try {
            console.log(`📝 [PERSISTENCE] Guardando sesión para: ${modelId}`);
            
            const historyKey = `${this.trainingHistoryKey}-${modelId}`;
            
            let existingHistory = [];
            try {
                const stored = localStorage.getItem(historyKey);
                existingHistory = stored ? JSON.parse(stored) : [];
                if (!Array.isArray(existingHistory)) {
                    console.warn('⚠️ Historial corrupto, reiniciando...');
                    existingHistory = [];
                }
            } catch (error) {
                console.warn('⚠️ Error cargando historial, reiniciando...');
                existingHistory = [];
            }
            
            const session = {
                ...sessionData,
                timestamp: new Date().toISOString(),
                sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            existingHistory.push(session);
            
            // Mantener solo últimas 30 sesiones
            const trimmedHistory = existingHistory.slice(-30);
            
            localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

            console.log(`✅ [PERSISTENCE] Sesión guardada: ${trimmedHistory.length} sesiones totales`);
            return true;

        } catch (error) {
            console.error('❌ Error guardando sesión:', error);
            return false;
        }
    }

    // ✅ CARGAR HISTORIAL DE ENTRENAMIENTO
    async loadTrainingHistory(modelId) {
        try {
            const historyKey = `${this.trainingHistoryKey}-${modelId}`;
            const historyData = localStorage.getItem(historyKey);
            
            if (!historyData) {
                return [];
            }
            
            const history = JSON.parse(historyData);
            const safeHistory = Array.isArray(history) ? history : [];
            
            console.log(`📊 Historial cargado: ${safeHistory.length} sesiones para ${modelId}`);
            return safeHistory;

        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            return [];
        }
    }

    // ✅ EXTRACT PERFORMANCE METRICS
    extractPerformanceMetrics(mlModel) {
        const recentPredictions = mlModel.predictions?.slice(-20) || [];
        const validPredictions = recentPredictions.filter(p => p.direction !== 'HOLD');
        
        return {
            accuracy: mlModel.accuracy,
            recentWinRate: this.calculateRecentWinRate(mlModel),
            avgConfidence: validPredictions.length > 0 ? 
                validPredictions.reduce((sum, p) => sum + p.confidence, 0) / validPredictions.length : 0,
            totalPredictions: mlModel.predictions?.length || 0,
            strongSignals: recentPredictions.filter(p => p.confidence > 80).length,
            performanceTrend: this.calculatePerformanceTrend(mlModel)
        };
    }

    // ✅ CALCULAR MÉTRICAS DE EVOLUCIÓN
    calculateFeatureStats(mlModel) {
        if (!mlModel.predictions || mlModel.predictions.length === 0) {
            return { avgConfidence: 0, signalStrength: 0, consistency: 0 };
        }

        const recent = mlModel.predictions.slice(-30);
        const valid = recent.filter(p => p.direction !== 'HOLD');
        
        return {
            avgConfidence: valid.length > 0 ? 
                valid.reduce((sum, p) => sum + p.confidence, 0) / valid.length : 0,
            signalStrength: this.calculateSignalStrength(valid),
            consistency: this.calculatePredictionConsistency(valid),
            totalSessions: mlModel.trainingHistory?.length || 0
        };
    }

    // ✅ CALCULAR TENDENCIA DE PERFORMANCE
    calculatePerformanceTrend(mlModel) {
        if (!mlModel.trainingHistory || mlModel.trainingHistory.length < 2) {
            return 'stable';
        }

        const recent = mlModel.trainingHistory.slice(-5);
        const older = mlModel.trainingHistory.slice(-10, -5);
        
        if (older.length === 0) return 'improving';
        
        const recentAvg = recent.reduce((sum, session) => sum + (session.accuracy || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, session) => sum + (session.accuracy || 0), 0) / older.length;
        
        if (recentAvg > olderAvg + 0.05) return 'improving';
        if (recentAvg < olderAvg - 0.05) return 'declining';
        return 'stable';
    }

    // ✅ CALCULAR WIN RATE RECIENTE
    calculateRecentWinRate(mlModel) {
        if (!mlModel.backtestResults) return 0;
        return mlModel.backtestResults.accuracy || 0;
    }

    // ✅ CALCULAR FUERZA DE SEÑAL
    calculateSignalStrength(predictions) {
        if (predictions.length === 0) return 0;
        return predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    }

    // ✅ CALCULAR CONSISTENCIA
    calculatePredictionConsistency(predictions) {
        if (predictions.length < 2) return 100;
        
        let consistentCount = 0;
        for (let i = 1; i < predictions.length; i++) {
            if (predictions[i].direction === predictions[i-1].direction) {
                consistentCount++;
            }
        }
        
        return (consistentCount / (predictions.length - 1)) * 100;
    }

    // ✅ CALCULAR ACCURACY PROMEDIO
    calculateAverageAccuracy(mlModel) {
        if (!mlModel.trainingHistory || mlModel.trainingHistory.length === 0) {
            return mlModel.accuracy || 0;
        }
        
        return mlModel.trainingHistory.reduce((sum, session) => 
            sum + (session.accuracy || 0), 0) / mlModel.trainingHistory.length;
    }

    // ✅ CARGAR TODOS LOS MODELOS
    loadAllModels() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            console.error('❌ Error cargando modelos:', error);
            return {};
        }
    }

    // ✅ ELIMINAR MODELO
    async deleteModel(modelId) {
        try {
            const allModels = this.loadAllModels();
            delete allModels[modelId];
            localStorage.setItem(this.storageKey, JSON.stringify(allModels));
            this.models.delete(modelId);
            
            console.log(`🗑️ Modelo eliminado: ${modelId}`);
            return true;

        } catch (error) {
            console.error('❌ Error eliminando modelo:', error);
            return false;
        }
    }

    // ✅ OBTENER ESTADÍSTICAS DEL SISTEMA
    getSystemStats() {
        const allModels = this.loadAllModels();
        const modelIds = Object.keys(allModels);
        
        const stats = {
            totalModels: modelIds.length,
            models: modelIds,
            totalTrainingSessions: 0,
            avgAccuracy: 0,
            totalPredictions: 0
        };

        modelIds.forEach(modelId => {
            const model = allModels[modelId];
            stats.totalTrainingSessions += model.metadata?.trainingSessions || 0;
            stats.totalPredictions += model.metadata?.totalPredictions || 0;
            stats.avgAccuracy += model.metadata?.accuracy || 0;
        });

        if (modelIds.length > 0) {
            stats.avgAccuracy = (stats.avgAccuracy / modelIds.length) * 100;
        }

        return stats;
    }
}

// ✅ Hacer disponible globalmente
window.MLPersistenceSystem = MLPersistenceSystem;
console.log('✅ Sistema de persistencia ML cargado (VERSIÓN CORREGIDA)');