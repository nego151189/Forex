// auto-training-system.js - SISTEMA DE ENTRENAMIENTO AUTOMÁTICO (CORREGIDO)
class AutoTrainingScheduler {
    constructor() {
        this.schedule = {
            daily: '02:00',
            retrainThreshold: 0.05,
            minAccuracy: 0.60,
            minDataPoints: 500
        };
        this.isRunning = false;
        this.trainingQueue = [];
        this.activeInstruments = [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
            'EURJPY', 'GBPJPY', 'AUDJPY', 'EURGBP',
            'XAUUSD'            
        ];
        this.trainingLocks = new Map();
    }

    async initialize() {
        console.log('Inicializando sistema de entrenamiento automático...');
        
        await this.loadTrainingState();
        await this.checkAllInstruments();
        
        console.log('Sistema de entrenamiento automático inicializado');
    }

    async start() {
        if (this.isRunning) {
            console.log('El sistema ya está corriendo');
            return;
        }

        this.isRunning = true;
        console.log('Sistema de entrenamiento automático ACTIVADO');

        this.dailyTrainingJob = setInterval(() => {
            this.checkDailySchedule();
        }, 60000);

        this.monitoringJob = setInterval(() => {
            this.monitorModelPerformance();
        }, 3600000);

        this.queueProcessorJob = setInterval(() => {
            this.processTrainingQueue();
        }, 30000);

        await this.checkAllInstruments();
    }

    stop() {
        this.isRunning = false;
        
        if (this.dailyTrainingJob) clearInterval(this.dailyTrainingJob);
        if (this.monitoringJob) clearInterval(this.monitoringJob);
        if (this.queueProcessorJob) clearInterval(this.queueProcessorJob);

        console.log('Sistema de entrenamiento automático DETENIDO');
    }

    async checkDailySchedule() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (currentTime === this.schedule.daily) {
            console.log('Iniciando ciclo de entrenamiento diario...');
            await this.runDailyTrainingCycle();
        }
    }

    async runDailyTrainingCycle() {
        console.log(`Entrenamiento diario: ${this.activeInstruments.length} instrumentos`);

        for (const instrument of this.activeInstruments) {
            if (!this.trainingLocks.get(instrument)) {
                this.trainingQueue.push({
                    instrument,
                    priority: 'daily',
                    timestamp: Date.now()
                });
            }
        }

        console.log(`${this.trainingQueue.length} instrumentos en cola de entrenamiento`);
    }

    async processTrainingQueue() {
        if (this.trainingQueue.length === 0) return;

        const task = this.trainingQueue.shift();
        
        if (this.trainingLocks.get(task.instrument)) {
            console.log(`${task.instrument} ya está entrenando, saltando...`);
            return;
        }

        await this.trainInstrument(task.instrument, task.priority);
    }

    async trainInstrument(instrument, priority = 'normal') {
        try {
            this.trainingLocks.set(instrument, true);

            console.log(`\n========================================`);
            console.log(`ENTRENANDO: ${instrument} (${priority})`);
            console.log(`========================================`);

            // LÍNEA 1: Notificar inicio de entrenamiento
            if (window.multiProgress) {
                window.multiProgress.startTraining(instrument, 30);
            }

            const historicalData = await getTwelveDataReal(instrument, '15min', 5000);

            if (historicalData.length < this.schedule.minDataPoints) {
                console.log(`Datos insuficientes para ${instrument}: ${historicalData.length}`);
                // LÍNEA 2: Notificar error de datos insuficientes
                if (window.multiProgress) {
                    window.multiProgress.errorTraining(instrument, 'Datos insuficientes');
                }
                return;
            }

            console.log(`Datos obtenidos: ${historicalData.length} velas reales`);

            const model = new ForexTensorFlowModel(instrument);
            await model.buildModel();

            const result = await model.trainOnRealData(historicalData, 30);

            console.log(`${instrument} entrenado - Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);

            // LÍNEA 3: Notificar entrenamiento completado
            if (window.multiProgress) {
                window.multiProgress.completeTraining(instrument, result.accuracy);
            }

            // Guardar estado del entrenamiento en Firebase
            await this.saveTrainingState(instrument, result);

            // Verificar accuracy
            if (result.accuracy < this.schedule.minAccuracy) {
                console.log(`WARNING: ${instrument} tiene accuracy bajo (${(result.accuracy * 100).toFixed(2)}%)`);
                await this.notifyLowAccuracy(instrument, result.accuracy);
            }

            // Guardar en historial global
            await this.saveToGlobalHistory(instrument, result);

        } catch (error) {
            console.error(`Error entrenando ${instrument}:`, error);
            // LÍNEA 4: Notificar error de entrenamiento
            if (window.multiProgress) {
                window.multiProgress.errorTraining(instrument, error.message);
            }
            await this.logError(instrument, error);
        } finally {
            this.trainingLocks.set(instrument, false);
        }
    }

    async saveToGlobalHistory(instrument, result) {
        try {
            await firebase.firestore()
                .collection('training_global_history')
                .add({
                    instrument,
                    accuracy: result.accuracy,
                    loss: result.loss || 0,
                    dataPoints: result.classDistribution ? 
                        Object.values(result.classDistribution).reduce((a, b) => a + b, 0) : 0,
                    classDistribution: result.classDistribution || {},
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    completedAt: new Date().toISOString()
                });
            console.log(`Historial global guardado para ${instrument}`);
        } catch (error) {
            console.error('Error guardando historial global:', error);
        }
    }

    async monitorModelPerformance() {
        console.log('Monitoreando performance de modelos...');

        for (const instrument of this.activeInstruments) {
            try {
                const currentStats = await this.getCurrentModelStats(instrument);
                
                if (!currentStats || !currentStats.accuracy) continue;

                const historicalAccuracy = await this.getHistoricalAccuracy(instrument);

                if (historicalAccuracy && currentStats.accuracy < historicalAccuracy - this.schedule.retrainThreshold) {
                    console.log(`${instrument} - Accuracy bajó de ${(historicalAccuracy * 100).toFixed(2)}% a ${(currentStats.accuracy * 100).toFixed(2)}%`);
                    
                    this.trainingQueue.unshift({
                        instrument,
                        priority: 'urgent',
                        timestamp: Date.now()
                    });
                }

            } catch (error) {
                console.error(`Error monitoreando ${instrument}:`, error);
            }
        }
    }

    async getCurrentModelStats(instrument) {
        try {
            const doc = await firebase.firestore()
                .collection('ml_models')
                .doc(instrument)
                .get();

            if (!doc.exists) return null;

            return doc.data();

        } catch (error) {
            console.error(`Error obteniendo stats de ${instrument}:`, error);
            return null;
        }
    }

    async getHistoricalAccuracy(instrument) {
        try {
            const snapshot = await firebase.firestore()
                .collection('training_epochs')
                .where('instrument', '==', instrument)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            if (snapshot.empty) return null;

            const accuracies = snapshot.docs.map(doc => doc.data().val_accuracy);
            return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;

        } catch (error) {
            console.error('Error obteniendo historical accuracy:', error);
            return null;
        }
    }

    async checkAllInstruments() {
        console.log('Verificando estado de todos los instrumentos...');

        for (const instrument of this.activeInstruments) {
            const stats = await this.getCurrentModelStats(instrument);

            if (!stats || !stats.isTrained) {
                console.log(`${instrument} necesita entrenamiento inicial`);
                this.trainingQueue.push({
                    instrument,
                    priority: 'initial',
                    timestamp: Date.now()
                });
            } else {
                console.log(`${instrument} - Accuracy: ${(stats.accuracy * 100).toFixed(2)}%`);
            }
        }
    }

async saveTrainingState(instrument, result) {
    try {
        const dataPoints = result.classDistribution ? 
            Object.values(result.classDistribution).reduce((a, b) => a + b, 0) : 0;
        
        await firebase.firestore()
            .collection('training_log')
            .add({
                instrument,
                accuracy: result.accuracy || 0,
                loss: result.loss || 0,
                dataPoints: dataPoints,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (error) {
        console.error('Error guardando estado:', error);
    }
}

    async loadTrainingState() {
        try {
            const snapshot = await firebase.firestore()
                .collection('training_log')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            console.log(`Estado de entrenamiento cargado: ${snapshot.size} registros`);

        } catch (error) {
            console.error('Error cargando estado:', error);
        }
    }

    async notifyLowAccuracy(instrument, accuracy) {
        console.log(`ALERTA: ${instrument} tiene accuracy bajo: ${(accuracy * 100).toFixed(2)}%`);
    }

    async logError(instrument, error) {
        try {
            await firebase.firestore()
                .collection('training_errors')
                .add({
                    instrument,
                    error: error.message,
                    stack: error.stack,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (logError) {
            console.error('Error logging error:', logError);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            queueLength: this.trainingQueue.length,
            activeInstruments: this.activeInstruments,
            lockedInstruments: Array.from(this.trainingLocks.entries())
                .filter(([_, locked]) => locked)
                .map(([instrument, _]) => instrument)
        };
    }

    async forceTrainInstrument(instrument) {
        if (!this.activeInstruments.includes(instrument)) {
            throw new Error(`Instrumento ${instrument} no está en la lista activa`);
        }

        this.trainingQueue.unshift({
            instrument,
            priority: 'manual',
            timestamp: Date.now()
        });

        console.log(`${instrument} agregado a cola con prioridad MANUAL`);
    }

    addInstrument(instrument) {
        if (!this.activeInstruments.includes(instrument)) {
            this.activeInstruments.push(instrument);
            console.log(`${instrument} agregado a instrumentos activos`);
            
            this.trainingQueue.push({
                instrument,
                priority: 'initial',
                timestamp: Date.now()
            });
        }
    }

    removeInstrument(instrument) {
        const index = this.activeInstruments.indexOf(instrument);
        if (index > -1) {
            this.activeInstruments.splice(index, 1);
            console.log(`${instrument} removido de instrumentos activos`);
        }
    }
}

window.autoTrainingScheduler = null;

async function initializeAutoTraining() {
    if (!window.autoTrainingScheduler) {
        window.autoTrainingScheduler = new AutoTrainingScheduler();
        await window.autoTrainingScheduler.initialize();
        await window.autoTrainingScheduler.start();
        console.log('Sistema de entrenamiento automático iniciado');
    }
}

function forceTrainInstrument(instrument) {
    if (window.autoTrainingScheduler) {
        window.autoTrainingScheduler.forceTrainInstrument(instrument);
    }
}

function getTrainingStatus() {
    if (window.autoTrainingScheduler) {
        return window.autoTrainingScheduler.getStatus();
    }
    return null;
}

function stopAllTraining() {
    if (window.autoTrainingScheduler) {
        window.autoTrainingScheduler.stop();
        console.log('Sistema de entrenamiento detenido');
    }
}

window.AutoTrainingScheduler = AutoTrainingScheduler;
window.initializeAutoTraining = initializeAutoTraining;
window.forceTrainInstrument = forceTrainInstrument;
window.getTrainingStatus = getTrainingStatus;
window.stopAllTraining = stopAllTraining;

console.log('Sistema de entrenamiento automático cargado');