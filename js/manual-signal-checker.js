// manual-signal-checker.js - Revisión manual de señales
class ManualSignalChecker {
    constructor(signalTracker) {
        this.signalTracker = signalTracker;
        this.isChecking = false;
    }

    async checkAllActiveSignals() {
        if (this.isChecking) {
            alert('Ya hay una revisión en progreso...');
            return;
        }

        this.isChecking = true;
        const button = document.querySelector('button[onclick*="checkSignalsManually"]');
        if (button) {
            button.disabled = true;
            button.textContent = 'Revisando...';
        }

        try {
            const activeSignals = await this.signalTracker.getActiveSignals();
            
            if (activeSignals.length === 0) {
                alert('No hay señales activas para revisar');
                return;
            }

            console.log(`Revisando ${activeSignals.length} señales activas...`);
            
            let closed = 0;
            let stillActive = 0;
            const results = [];

            for (const signal of activeSignals) {
                const result = await this.checkSignal(signal);
                results.push(result);
                
                if (result.closed) {
                    closed++;
                } else {
                    stillActive++;
                }
                
                await this.sleep(500);
            }

            this.showResults(results, closed, stillActive);

        } catch (error) {
            console.error('Error revisando señales:', error);
            alert('Error revisando señales: ' + error.message);
        } finally {
            this.isChecking = false;
            if (button) {
                button.disabled = false;
                button.textContent = 'Actualizar Señales';
            }
        }
    }

    async checkSignal(signal) {
        try {
            console.log(`Verificando ${signal.instrument}...`);
            
            const priceData = await getCurrentPrice(signal.instrument);
            
            if (!priceData || !priceData.price) {
                return {
                    signal: signal,
                    closed: false,
                    error: 'No se pudo obtener precio'
                };
            }

            const currentPrice = priceData.price;
            const evaluation = this.evaluateSignal(signal, currentPrice);

            if (evaluation.closed) {
                await this.closeSignal(signal, evaluation, currentPrice);
                return {
                    signal: signal,
                    closed: true,
                    exitReason: evaluation.exitReason,
                    exitPrice: evaluation.exitPrice,
                    pips: this.calculatePips(signal, evaluation.exitPrice)
                };
            }

            const expired = this.checkExpiration(signal);
            if (expired) {
                await this.closeSignal(signal, {
                    exitReason: 'EXPIRED',
                    exitPrice: currentPrice
                }, currentPrice);
                return {
                    signal: signal,
                    closed: true,
                    exitReason: 'EXPIRED',
                    exitPrice: currentPrice,
                    pips: this.calculatePips(signal, currentPrice)
                };
            }

            return {
                signal: signal,
                closed: false,
                currentPrice: currentPrice
            };

        } catch (error) {
            console.error(`Error verificando ${signal.instrument}:`, error);
            return {
                signal: signal,
                closed: false,
                error: error.message
            };
        }
    }

    evaluateSignal(signal, currentPrice) {
        if (signal.action === 'LONG') {
            if (currentPrice >= signal.takeProfit) {
                return {
                    closed: true,
                    exitReason: 'TARGET_HIT',
                    exitPrice: signal.takeProfit
                };
            }
            if (currentPrice <= signal.stopLoss) {
                return {
                    closed: true,
                    exitReason: 'STOP_HIT',
                    exitPrice: signal.stopLoss
                };
            }
        } else if (signal.action === 'SHORT') {
            if (currentPrice <= signal.takeProfit) {
                return {
                    closed: true,
                    exitReason: 'TARGET_HIT',
                    exitPrice: signal.takeProfit
                };
            }
            if (currentPrice >= signal.stopLoss) {
                return {
                    closed: true,
                    exitReason: 'STOP_HIT',
                    exitPrice: signal.stopLoss
                };
            }
        }

        return { closed: false };
    }

    checkExpiration(signal) {
        const createdAt = signal.generatedAt.toDate();
        const hoursPassed = (Date.now() - createdAt.getTime()) / 3600000;
        return hoursPassed >= 24;
    }

    async closeSignal(signal, evaluation, currentPrice) {
        const pips = this.calculatePips(signal, evaluation.exitPrice);
        const percentReturn = this.calculatePercentReturn(signal, evaluation.exitPrice);

        await firebase.firestore().collection('signals').doc(signal.id).update({
            status: evaluation.exitReason,
            closedAt: firebase.firestore.FieldValue.serverTimestamp(),
            exitPrice: evaluation.exitPrice,
            exitReason: evaluation.exitReason,
            pips: pips,
            percentReturn: percentReturn
        });

        console.log(`Señal cerrada: ${signal.instrument} - ${evaluation.exitReason} - ${pips.toFixed(1)} pips`);
    }

    calculatePips(signal, exitPrice) {
        const diff = signal.action === 'LONG' 
            ? exitPrice - signal.entryPrice
            : signal.entryPrice - exitPrice;
        
        if (signal.instrument.includes('JPY')) {
            return diff * 100;
        }
        return diff * 10000;
    }

    calculatePercentReturn(signal, exitPrice) {
        return ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
    }

    showResults(results, closed, stillActive) {
        let message = `REVISION COMPLETADA\n\n`;
        message += `Total señales: ${results.length}\n`;
        message += `Cerradas: ${closed}\n`;
        message += `Activas: ${stillActive}\n\n`;

        if (closed > 0) {
            message += `SEÑALES CERRADAS:\n`;
            results.filter(r => r.closed).forEach(r => {
                const emoji = r.exitReason === 'TARGET_HIT' ? '✅' : 
                             r.exitReason === 'STOP_HIT' ? '❌' : '⏰';
                message += `${emoji} ${r.signal.instrument} - ${r.exitReason} - ${r.pips.toFixed(1)} pips\n`;
            });
        }

        alert(message);
        
        if (window.app && window.app.showPerformanceStats) {
            window.app.showPerformanceStats();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.ManualSignalChecker = ManualSignalChecker;
console.log('Manual Signal Checker cargado');