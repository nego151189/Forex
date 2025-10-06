// signal-tracker.js - Sistema de tracking real de señales
class SignalTracker {
    constructor() {
        this.db = firebase.firestore();
    }

    async saveSignal(signal) {
        const signalDoc = {
            id: signal.id,
            instrument: signal.instrument,
            action: signal.action,
            
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            
            confidence: signal.confidence,
            riskReward: signal.riskReward,
            positionSize: signal.positionSize,
            
            tensorFlowConfidence: signal.tensorFlowConfidence || 0,
            patternConfidence: signal.patternConfidence || 0,
            modelType: signal.modelType || 'TensorFlow-LSTM',
            
            status: 'ACTIVE',
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            closedAt: null,
            
            exitPrice: null,
            exitReason: null,
            pips: null,
            percentReturn: null,
            actualRiskReward: null,
            
            priceHistory: [{
                timestamp: new Date().toISOString(),
                price: signal.entryPrice,
                event: 'SIGNAL_GENERATED'
            }],
            
            expiresAt: firebase.firestore.Timestamp.fromDate(
                new Date(Date.now() + 24 * 60 * 60 * 1000)
            )
        };

        try {
            await this.db.collection('signals').doc(signal.id).set(signalDoc);
            console.log('Señal guardada:', signal.id);
            return true;
        } catch (error) {
            console.error('Error guardando señal:', error);
            return false;
        }
    }

    async getActiveSignals() {
        try {
            const snapshot = await this.db.collection('signals')
                .where('status', '==', 'ACTIVE')
                .orderBy('generatedAt', 'desc')
                .limit(20)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo señales activas:', error);
            return [];
        }
    }

    async getSignalHistory(limit = 50) {
        try {
            const snapshot = await this.db.collection('signals')
                .where('status', 'in', ['TARGET_HIT', 'STOP_HIT', 'EXPIRED'])
                .orderBy('closedAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }

    async calculatePerformanceStats(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        try {
            const snapshot = await this.db.collection('signals')
                .where('closedAt', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
                .get();

            const closedSignals = snapshot.docs.map(doc => doc.data());
            
            if (closedSignals.length === 0) {
                return this.emptyStats();
            }

            const wins = closedSignals.filter(s => s.exitReason === 'TARGET_HIT');
            const losses = closedSignals.filter(s => s.exitReason === 'STOP_HIT');
            
            const totalPips = closedSignals.reduce((sum, s) => sum + (s.pips || 0), 0);
            const totalGains = wins.reduce((sum, s) => sum + Math.abs(s.pips || 0), 0);
            const totalLosses = losses.reduce((sum, s) => sum + Math.abs(s.pips || 0), 0);

            return {
                totalSignals: closedSignals.length,
                totalWins: wins.length,
                totalLosses: losses.length,
                winRate: (wins.length / closedSignals.length) * 100,
                profitFactor: totalLosses > 0 ? totalGains / totalLosses : totalGains,
                totalPips: totalPips,
                avgReturn: totalPips / closedSignals.length,
                bestTrade: Math.max(...closedSignals.map(s => s.pips || 0)),
                worstTrade: Math.min(...closedSignals.map(s => s.pips || 0)),
                maxConsecutiveWins: this.calculateMaxConsecutive(closedSignals, 'TARGET_HIT'),
                maxConsecutiveLosses: this.calculateMaxConsecutive(closedSignals, 'STOP_HIT')
            };
        } catch (error) {
            console.error('Error calculando stats:', error);
            return this.emptyStats();
        }
    }

    emptyStats() {
        return {
            totalSignals: 0,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            profitFactor: 0,
            totalPips: 0,
            avgReturn: 0,
            bestTrade: 0,
            worstTrade: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0
        };
    }

    calculateMaxConsecutive(signals, exitReason) {
        let max = 0;
        let current = 0;
        
        signals
            .sort((a, b) => a.closedAt - b.closedAt)
            .forEach(signal => {
                if (signal.exitReason === exitReason) {
                    current++;
                    max = Math.max(max, current);
                } else {
                    current = 0;
                }
            });
        
        return max;
    }

    async getPerformanceByInstrument(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        try {
            const snapshot = await this.db.collection('signals')
                .where('closedAt', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
                .get();

            const byInstrument = {};
            
            snapshot.docs.forEach(doc => {
                const signal = doc.data();
                const inst = signal.instrument;
                
                if (!byInstrument[inst]) {
                    byInstrument[inst] = {
                        total: 0,
                        wins: 0,
                        losses: 0,
                        pips: 0
                    };
                }
                
                byInstrument[inst].total++;
                byInstrument[inst].pips += signal.pips || 0;
                
                if (signal.exitReason === 'TARGET_HIT') {
                    byInstrument[inst].wins++;
                } else if (signal.exitReason === 'STOP_HIT') {
                    byInstrument[inst].losses++;
                }
            });

            return Object.entries(byInstrument).map(([instrument, stats]) => ({
                instrument,
                trades: stats.total,
                winRate: (stats.wins / stats.total * 100).toFixed(1),
                totalPips: stats.pips.toFixed(1)
            }));
        } catch (error) {
            console.error('Error en performance por instrumento:', error);
            return [];
        }
    }
}

window.SignalTracker = SignalTracker;
console.log('Signal Tracker cargado');