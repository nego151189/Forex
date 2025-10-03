// alerts.js - Sistema de Alertas Inteligentes

class AlertSystem {
    constructor() {
        this.alerts = [];
        this.notificationsEnabled = false;
        this.alertSettings = {
            buyAlerts: true,
            sellAlerts: true,
            confidenceThreshold: 75,
            maxAlertsPerDay: 50,
            soundEnabled: true
        };
        this.alertHistory = [];
        this.maxAlerts = 10;
    }

    async init() {
        await this.requestNotificationPermission();
        this.loadSettings();
        this.loadHistory();
        this.setupEventListeners();
        console.log('Sistema de alertas inicializado');
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.notificationsEnabled = true;
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.notificationsEnabled = true;
                this.showInAppNotification('Notificaciones habilitadas', 'success');
                return true;
            }
        }

        this.showInAppNotification('Permisos de notificación denegados', 'error');
        return false;
    }

    generateAlert(prediction, instrument) {
        if (!this.shouldGenerateAlert(prediction)) {
            return false;
        }

        const alert = {
            id: Date.now() + Math.random(),
            type: prediction.direction.toLowerCase(),
            title: this.getAlertTitle(prediction.direction),
            message: this.getAlertMessage(prediction, instrument),
            confidence: prediction.confidence,
            timestamp: Date.now(), // Guardar como timestamp numérico
            instrument: instrument,
            prediction: prediction,
            read: false
        };

        this.addAlert(alert);
        this.sendNotification(alert);
        this.saveToHistory(alert);

        return true;
    }

    shouldGenerateAlert(prediction) {
        if (prediction.direction === 'BUY' && !this.alertSettings.buyAlerts) return false;
        if (prediction.direction === 'SELL' && !this.alertSettings.sellAlerts) return false;
        if (prediction.confidence < this.alertSettings.confidenceThreshold) return false;

        const today = new Date().toDateString();
        const todayAlerts = this.alertHistory.filter(a => 
            new Date(a.timestamp).toDateString() === today
        );
        
        if (todayAlerts.length >= this.alertSettings.maxAlertsPerDay) {
            console.warn('Límite diario de alertas alcanzado');
            return false;
        }

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentSimilarAlerts = this.alerts.filter(a => 
            a.timestamp > fiveMinutesAgo && 
            a.type === prediction.direction.toLowerCase()
        );

        if (recentSimilarAlerts.length > 0) {
            console.log('Alerta similar reciente ignorada');
            return false;
        }

        return true;
    }

    getAlertTitle(direction) {
        const titles = {
            'BUY': 'SEÑAL DE COMPRA',
            'SELL': 'SEÑAL DE VENTA',
            'HOLD': 'MANTENER POSICIÓN'
        };
        return titles[direction] || 'SEÑAL DE TRADING';
    }

    getAlertMessage(prediction, instrument) {
        const direction = prediction.direction.toLowerCase();
        const confidence = prediction.confidence.toFixed(1);
        
        const messages = {
            'buy': `IA detectó oportunidad de compra en ${instrument} con ${confidence}% confianza`,
            'sell': `IA detectó oportunidad de venta en ${instrument} con ${confidence}% confianza`,
            'hold': `IA sugiere mantener posición en ${instrument} con ${confidence}% confianza`
        };

        return messages[direction] || `Señal detectada para ${instrument}`;
    }

    addAlert(alert) {
        this.alerts.unshift(alert);
        
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.maxAlerts);
        }

        this.updateAlertsDisplay();
        this.playAlertSound();
    }

    sendNotification(alert) {
        if (!this.notificationsEnabled) {
            console.log('Notificaciones deshabilitadas');
            return;
        }

        // Verificar si el navegador sigue con permisos
        if (Notification.permission !== 'granted') {
            console.log('Permisos de notificación revocados');
            this.notificationsEnabled = false;
            return;
        }

        try {
            // Notificación simple sin actions (actions solo funcionan con Service Workers)
            const notification = new Notification(alert.title, {
                body: alert.message,
                tag: `forex-alert-${alert.type}`,
                requireInteraction: false,
                silent: false
            });

            notification.onclick = () => {
                window.focus();
                this.showAlertDetails(alert);
                notification.close();
            };

            // Auto-cerrar después de 10 segundos
            setTimeout(() => {
                notification.close();
            }, 10000);

        } catch (error) {
            console.error('Error enviando notificación:', error);
        }
    }

    updateAlertsDisplay() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        if (this.alerts.length === 0) {
            alertsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #94a3b8;">
                    <p>No hay alertas activas</p>
                    <small>Las nuevas alertas aparecerán aquí</small>
                </div>
            `;
            return;
        }

        let html = '';
        this.alerts.forEach(alert => {
            const timeAgo = this.getTimeAgo(alert.timestamp);
            const alertClass = this.getAlertClass(alert.type);
            
            html += `
                <div class="alert-item ${alertClass}" data-alert-id="${alert.id}">
                    <div class="alert-type">${alert.title}</div>
                    <div class="alert-description">${alert.message}</div>
                    <div class="alert-meta">
                        <span>Confianza: ${alert.confidence.toFixed(1)}%</span>
                        <span>${timeAgo}</span>
                        <button onclick="alertSystem.dismissAlert('${alert.id}')" 
                                style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; margin-left: 10px;">
                            ✕
                        </button>
                    </div>
                </div>
            `;
        });

        alertsList.innerHTML = html;
    }

    getAlertClass(type) {
        const classes = {
            'buy': 'alert-buy',
            'sell': 'alert-sell',
            'hold': 'alert-warning'
        };
        return classes[type] || 'alert-warning';
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Hace ${minutes} min`;
        return 'Ahora';
    }

    dismissAlert(alertId) {
        this.alerts = this.alerts.filter(a => a.id != alertId);
        this.updateAlertsDisplay();
    }

    showAlertDetails(alert) {
        const details = `
Detalles de la Alerta

Instrumento: ${alert.instrument}
Dirección: ${alert.prediction.direction}
Confianza: ${alert.confidence.toFixed(1)}%
Target: ${alert.prediction.targetPrice ? alert.prediction.targetPrice.toFixed(4) : 'N/A'}
Stop Loss: ${alert.prediction.stopLoss ? alert.prediction.stopLoss.toFixed(4) : 'N/A'}

Generada: ${new Date(alert.timestamp).toLocaleString()}
        `;
        
        alert(details);
    }

    playAlertSound() {
        if (!this.alertSettings.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('No se pudo reproducir sonido de alerta:', error);
        }
    }

    showInAppNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const content = document.getElementById('notificationContent');
        
        if (!notification || !content) return;

        content.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    testAlert() {
        const testPrediction = {
            direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
            confidence: 85 + Math.random() * 10,
            targetPrice: 18.5420 * (1 + 0.01),
            stopLoss: 18.5420 * (1 - 0.005)
        };
        
        this.generateAlert(testPrediction, 'USD/ZAR');
        this.showInAppNotification('Alerta de prueba generada', 'success');
    }

    saveToHistory(alert) {
        this.alertHistory.push(alert);
        
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        this.alertHistory = this.alertHistory.filter(a => a.timestamp > thirtyDaysAgo);
        
        try {
            // Guardar como JSON simple (timestamps ya son números)
            localStorage.setItem('forex-alert-history', JSON.stringify(this.alertHistory));
        } catch (error) {
            console.warn('No se pudo guardar historial de alertas:', error);
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('forex-alert-history');
            if (saved) {
                this.alertHistory = JSON.parse(saved);
                console.log(`Historial cargado: ${this.alertHistory.length} alertas`);
            }
        } catch (error) {
            console.warn('Error cargando historial:', error);
            this.alertHistory = [];
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('forex-alert-settings');
            if (saved) {
                this.alertSettings = { ...this.alertSettings, ...JSON.parse(saved) };
            }

            const buyCheckbox = document.getElementById('buyAlerts');
            const sellCheckbox = document.getElementById('sellAlerts');
            const thresholdSlider = document.getElementById('confidenceThreshold');

            if (buyCheckbox) buyCheckbox.checked = this.alertSettings.buyAlerts;
            if (sellCheckbox) sellCheckbox.checked = this.alertSettings.sellAlerts;
            if (thresholdSlider) thresholdSlider.value = this.alertSettings.confidenceThreshold;

        } catch (error) {
            console.warn('Error cargando configuraciones:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('forex-alert-settings', JSON.stringify(this.alertSettings));
        } catch (error) {
            console.warn('Error guardando configuraciones:', error);
        }
    }

    setupEventListeners() {
        const buyCheckbox = document.getElementById('buyAlerts');
        if (buyCheckbox) {
            buyCheckbox.addEventListener('change', (e) => {
                this.alertSettings.buyAlerts = e.target.checked;
                this.saveSettings();
            });
        }

        const sellCheckbox = document.getElementById('sellAlerts');
        if (sellCheckbox) {
            sellCheckbox.addEventListener('change', (e) => {
                this.alertSettings.sellAlerts = e.target.checked;
                this.saveSettings();
            });
        }

        const thresholdSlider = document.getElementById('confidenceThreshold');
        if (thresholdSlider) {
            thresholdSlider.addEventListener('input', (e) => {
                this.alertSettings.confidenceThreshold = parseInt(e.target.value);
                this.saveSettings();
                
                const valueDisplay = document.getElementById('confidenceValue');
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value + '%';
                }
            });
        }
    }

    getAlertStats() {
        const today = new Date().toDateString();
        const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        const todayAlerts = this.alertHistory.filter(a => 
            new Date(a.timestamp).toDateString() === today
        );
        const weekAlerts = this.alertHistory.filter(a => a.timestamp > thisWeek);
        
        const buyAlerts = weekAlerts.filter(a => a.type === 'buy').length;
        const sellAlerts = weekAlerts.filter(a => a.type === 'sell').length;
        
        const avgConfidence = weekAlerts.length > 0 ? 
            weekAlerts.reduce((sum, a) => sum + a.confidence, 0) / weekAlerts.length : 0;

        return {
            todayCount: todayAlerts.length,
            weekCount: weekAlerts.length,
            buyCount: buyAlerts,
            sellCount: sellAlerts,
            avgConfidence: avgConfidence.toFixed(1),
            totalAlerts: this.alertHistory.length
        };
    }

    cleanup() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.alerts = this.alerts.filter(a => a.timestamp > oneHourAgo);
        this.updateAlertsDisplay();
    }

    exportHistory() {
        const data = {
            exportDate: new Date().toISOString(),
            settings: this.alertSettings,
            history: this.alertHistory,
            stats: this.getAlertStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `forex-alerts-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showInAppNotification('Historial exportado exitosamente', 'success');
    }
}

// Clase para alertas específicas de trading (necesaria para main.js)
class TradingAlerts extends AlertSystem {
    constructor() {
        super();
        this.priceAlerts = [];
        this.technicalAlerts = [];
    }

    createPriceAlert(instrument, targetPrice, direction, currentPrice) {
        const alert = {
            id: Date.now() + Math.random(),
            type: 'price',
            instrument: instrument,
            targetPrice: targetPrice,
            direction: direction,
            currentPrice: currentPrice,
            created: Date.now(),
            active: true
        };

        this.priceAlerts.push(alert);
        this.showInAppNotification(`Alerta de precio creada: ${instrument} ${direction} ${targetPrice}`, 'info');
        
        return alert.id;
    }

    checkPriceAlerts(instrument, currentPrice) {
        const activeAlerts = this.priceAlerts.filter(a => 
            a.active && a.instrument === instrument
        );

        activeAlerts.forEach(alert => {
            let triggered = false;
            
            if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
                triggered = true;
            } else if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
                triggered = true;
            }

            if (triggered) {
                this.triggerPriceAlert(alert, currentPrice);
                alert.active = false;
            }
        });
    }

    triggerPriceAlert(alert, currentPrice) {
        const notification = {
            id: Date.now(),
            type: 'price_alert',
            title: 'ALERTA DE PRECIO ALCANZADA',
            message: `${alert.instrument} alcanzó ${currentPrice} (objetivo: ${alert.targetPrice})`,
            confidence: 100,
            timestamp: Date.now(),
            instrument: alert.instrument,
            read: false
        };

        this.addAlert(notification);
        this.sendNotification(notification);
    }
}

window.AlertSystem = AlertSystem;
window.TradingAlerts = TradingAlerts;
window.alertSystem = new AlertSystem();

console.log('Sistema de alertas cargado');