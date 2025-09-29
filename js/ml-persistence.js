// ml-persistence.js - SISTEMA COMPLETO DE PERSISTENCIA ML
class MLPersistenceSystem {
    constructor() {
        this.storageKey = 'forex-ml-models';
        this.trainingHistoryKey = 'forex-training-history';
        this.modelVersion = '1.0';
        this.autoSave = true;
        this.models = new Map();
    }

    // ✅ GUARDAR MODELO COMPLETO
    async saveModel(modelId, mlModel) {
        try {
            console.log(`💾 Guardando modelo: ${modelId}`);
            
            const modelData = {
                version: this.modelVersion,
                timestamp: new Date().toISOString(),
                modelState: this.extractModelState(mlModel),
                performance: this.extractPerformanceMetrics(mlModel),
                metadata: {
                    instrument: modelId,
                    trainingSessions: mlModel.trainingHistory?.length || 0,
                    totalPredictions: mlModel.predictions?.length || 0,
                    accuracy: mlModel.accuracy || 0
                }
            };

            // Guardar en almacenamiento local
            const existingData = this.loadAllModels();
            existingData[modelId] = modelData;
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));

            // Actualizar cache en memoria
            this.models.set(modelId, modelData);

            console.log(`✅ Modelo ${modelId} guardado exitosamente`);
            return true;

        } catch (error) {
            console.error('❌ Error guardando modelo:', error);
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
            predictions: mlModel.predictions?.slice(-100) || [], // Últimas 100 predicciones
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
            const historyKey = `${this.trainingHistoryKey}-${modelId}`;
            const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            const session = {
                ...sessionData,
                timestamp: new Date().toISOString(),
                sessionId: `session_${Date.now()}`
            };

            existingHistory.push(session);
            
            // Mantener solo últimas 50 sesiones
            const trimmedHistory = existingHistory.slice(-50);
            localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

            console.log(`📝 Sesión de entrenamiento guardada: ${modelId}`);
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
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            console.log(`📊 Historial cargado: ${history.length} sesiones para ${modelId}`);
            return history;

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

    // ✅ EXPORTAR MODELOS (BACKUP)
    exportModels() {
        const allModels = this.loadAllModels();
        const exportData = {
            exportDate: new Date().toISOString(),
            version: this.modelVersion,
            models: allModels,
            stats: this.getSystemStats()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forex-ml-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📤 Backup de modelos exportado');
        return true;
    }

    // ✅ IMPORTAR MODELOS (RESTORE)
    importModels(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (importData.models && typeof importData.models === 'object') {
                        localStorage.setItem(this.storageKey, JSON.stringify(importData.models));
                        console.log('📥 Modelos importados exitosamente');
                        resolve(true);
                    } else {
                        reject(new Error('Formato de archivo inválido'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    }

    // ✅ LIMPIAR CACHE
    clearCache() {
        this.models.clear();
        console.log('🧹 Cache de modelos limpiado');
    }

    // ✅ VERIFICAR ALMACENAMIENTO DISPONIBLE
    checkStorageStatus() {
        const allModels = this.loadAllModels();
        const dataSize = JSON.stringify(allModels).length;
        const maxSize = 5 * 1024 * 1024; // 5MB máximo recomendado
        
        return {
            used: dataSize,
            max: maxSize,
            percentage: (dataSize / maxSize) * 100,
            status: dataSize > maxSize * 0.9 ? 'warning' : 'healthy'
        };
    }
}

// ✅ SISTEMA DE PERSISTENCIA MEJORADO PARA ForexMLModel
class PersistentForexMLModel extends ForexMLModel {
    constructor(instrument) {
        super();
        this.instrument = instrument;
        this.persistence = new MLPersistenceSystem();
        this.autoSaveEnabled = true;
    }

    // ✅ SOBREESCRIBIR ENTRENAMIENTO PARA GUARDADO AUTOMÁTICO
    async trainWithBacktest(historicalData, lookbackPeriod = 60) {
        console.log('🧠 Iniciando entrenamiento con persistencia...');
        
        const result = await super.trainWithBacktest(historicalData, lookbackPeriod);
        
        if (this.autoSaveEnabled) {
            // Guardar sesión de entrenamiento
            await this.persistence.saveTrainingSession(this.instrument, {
                accuracy: this.accuracy,
                dataPoints: historicalData.length,
                lookbackPeriod: lookbackPeriod,
                timestamp: new Date().toISOString()
            });

            // Guardar modelo completo
            await this.persistence.saveModel(this.instrument, this);
        }
        
        return result;
    }

    // ✅ SOBREESCRIBIR PREDICCIÓN PARA GUARDADO AUTOMÁTICO
    predict(currentData, features) {
        const prediction = super.predict(currentData, features);
        
        if (this.autoSaveEnabled && this.predictions.length % 10 === 0) {
            // Guardar cada 10 predicciones
            setTimeout(() => {
                this.persistence.saveModel(this.instrument, this);
            }, 1000);
        }
        
        return prediction;
    }

    // ✅ CARGAR MODELO AL INICIALIZAR
    async load() {
        return await this.persistence.loadModel(this.instrument, this);
    }

    // ✅ GUARDAR MODELO MANUALMENTE
    async save() {
        return await this.persistence.saveModel(this.instrument, this);
    }

    // ✅ OBTENER ESTADÍSTICAS DE EVOLUCIÓN
    getEvolutionStats() {
        const history = this.persistence.loadTrainingHistory(this.instrument);
        const modelData = this.persistence.loadAllModels()[this.instrument];
        
        return {
            currentAccuracy: this.accuracy,
            trainingSessions: history.length,
            totalPredictions: this.predictions.length,
            performanceTrend: modelData?.performance?.performanceTrend || 'unknown',
            avgConfidence: modelData?.performance?.avgConfidence || 0,
            history: history.slice(-10) // Últimas 10 sesiones
        };
    }
}

// ✅ Hacer disponible globalmente
window.MLPersistenceSystem = MLPersistenceSystem;
window.PersistentForexMLModel = PersistentForexMLModel;

console.log('✅ Sistema de persistencia ML cargado');