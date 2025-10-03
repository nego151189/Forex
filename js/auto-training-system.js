// auto-training-system.js - SISTEMA DE ENTRENAMIENTO AUTOMÁTICO
class AutoTrainingScheduler {
    constructor() {
        this.schedule = {
            daily: '02:00',
            retrainThreshold: 0.05, // Reentrenar si accuracy baja 5%
            minAccuracy: 0.60, // Accuracy mínimo aceptable
            minDataPoints: 500 // Mínimo datos para entrenar
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
        
        // Cargar estado de últimos entrenamientos
        await this.loadTrainingState();
        
        // Verificar cuáles instrumentos necesitan entrenamiento inicial
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

        // Job 1: Entrenamiento diario programado
        this.dailyTrainingJob = setInterval(() => {
            this.checkDailySchedule();
        }, 60000); // Revisar cada minuto

        // Job 2: Monitoreo de performance cada hora
        this.monitoringJob = setInterval(() => {
            this.monitorModelPerformance();
        }, 3600000); // Cada hora

        // Job 3: Procesar cola de entrenamiento
        this.queueProcessorJob = setInterval(() => {
            this.processTrainingQueue();
        }, 30000); // Cada 30 segundos

        // Ejecutar verificación inicial
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
            // Agregar a cola si no está bloqueado
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

        // Procesar 1 instrumento a la vez para no saturar
        const task = this.trainingQueue.shift();
        
        if (this.trainingLocks.get(task.instrument)) {
            console.log(`${task.instrument} ya está entrenando, saltando...`);
            return;
        }

        await this.trainInstrument(task.instrument, task.priority);
    }

    async trainInstrument(instrument, priority = 'normal') {
        try {
            // Bloquear para evitar entrenamientos duplicados
            this.trainingLocks.set(instrument, true);

            console.log(`\n========================================`);
            console.log(`ENTRENANDO: ${instrument} (${priority})`);
            console.log(`========================================`);

            // Obtener datos históricos REALES
            const historicalData = await getTwelveDataReal(instrument, '15min', 2000);

            if (historicalData.length < this.schedule.minDataPoints) {
                console.log(`⚠️ Datos insuficientes para ${instrument}: ${historicalData.length}`);
                return;
            }

            console.log(`✓ Datos obtenidos: ${historicalData.length} velas reales`);

            // Crear y entrenar modelo TensorFlow
            const model = new ForexTensorFlowModel(instrument);
            await model.buildModel();

            const result = await model.trainOnRealData(historicalData, 30); // 30 epochs

            console.log(`✓ ${instrument} entrenado - Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);

            // Guardar estado del entrenamiento
            await this.saveTrainingState(instrument, result);

            // Notificar si accuracy es bajo
            if (result.accuracy < this.schedule.minAccuracy) {
                console.log(`⚠️ WARNING: ${instrument} tiene accuracy bajo (${(result.accuracy * 100).toFixed(2)}%)`);
                await this.notifyLowAccuracy(instrument, result.accuracy);
            }

        } catch (error) {
            console.error(`❌ Error entrenando ${instrument}:`, error);
            await this.logError(instrument, error);
        } finally {
            // Liberar bloqueo
            this.trainingLocks.set(instrument, false);
        }
    }

    async monitorModelPerformance() {
        console.log('Monitoreando performance de modelos...');

        for (const instrument of this.activeInstruments) {
            try {
                const currentStats = await this.getCurrentModelStats(instrument);
                
                if (!currentStats || !currentStats.accuracy) continue;

                const historicalAccuracy = await this.getHistoricalAccuracy(instrument);

                // Verificar si bajó la accuracy
                if (historicalAccuracy && currentStats.accuracy < historicalAccuracy - this.schedule.retrainThreshold) {
                    console.log(`📉 ${instrument} - Accuracy bajó de ${(historicalAccuracy * 100).toFixed(2)}% a ${(currentStats.accuracy * 100).toFixed(2)}%`);
                    
                    // Agregar a cola con prioridad
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
                console.log(`📝 ${instrument} necesita entrenamiento inicial`);
                this.trainingQueue.push({
                    instrument,
                    priority: 'initial',
                    timestamp: Date.now()
                });
            } else {
                console.log(`✓ ${instrument} - Accuracy: ${(stats.accuracy * 100).toFixed(2)}%`);
            }
        }
    }

    async saveTrainingState(instrument, result) {
        try {
            await firebase.firestore()
                .collection('training_log')
                .add({
                    instrument,
                    accuracy: result.accuracy,
                    dataPoints: result.history ? result.history.length : 0,
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
        console.log(`⚠️ ALERTA: ${instrument} tiene accuracy bajo: ${(accuracy * 100).toFixed(2)}%`);
        
        // Aquí podrías enviar notificación push, email, etc.
        // Por ahora solo log
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

    // Método manual para forzar entrenamiento
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

    // Agregar nuevo instrumento
    addInstrument(instrument) {
        if (!this.activeInstruments.includes(instrument)) {
            this.activeInstruments.push(instrument);
            console.log(`${instrument} agregado a instrumentos activos`);
            
            // Entrenar inmediatamente
            this.trainingQueue.push({
                instrument,
                priority: 'initial',
                timestamp: Date.now()
            });
        }
    }

    // Remover instrumento
    removeInstrument(instrument) {
        const index = this.activeInstruments.indexOf(instrument);
        if (index > -1) {
            this.activeInstruments.splice(index, 1);
            console.log(`${instrument} removido de instrumentos activos`);
        }
    }
}

// Instancia global
window.autoTrainingScheduler = null;

// Función de inicio
async function initializeAutoTraining() {
    if (!window.autoTrainingScheduler) {
        window.autoTrainingScheduler = new AutoTrainingScheduler();
        await window.autoTrainingScheduler.initialize();
        await window.autoTrainingScheduler.start();
        console.log('✅ Sistema de entrenamiento automático iniciado');
    }
}

// Función de control manual
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

window.AutoTrainingScheduler = AutoTrainingScheduler;
window.initializeAutoTraining = initializeAutoTraining;
window.forceTrainInstrument = forceTrainInstrument;
window.getTrainingStatus = getTrainingStatus;

console.log('✅ Sistema de entrenamiento automático cargado');