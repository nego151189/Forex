// multi-instrument-progress.js - Panel de progreso VISUAL (no persistente)
class MultiInstrumentProgress {
    constructor() {
        this.instruments = [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
            'EURJPY', 'GBPJPY', 'AUDJPY', 'EURGBP',
            'XAUUSD'
        ];
        // Estado SOLO EN MEMORIA - no se guarda
        this.progressData = new Map();
        this.container = null;
        
        // Inicializar datos por defecto
        this.instruments.forEach(inst => {
            this.progressData.set(inst, {
                status: 'pending', // pending, training, completed, error
                epoch: 0,
                totalEpochs: 30,
                accuracy: 0,
                loss: 0,
                message: 'En cola...'
            });
        });
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container no encontrado:', containerId);
            return;
        }
        this.render();
        this.loadCompletedModels();
    }

    render() {
        const html = `
            <div class="multi-progress-panel">
                <div class="panel-header">
                    <h3>Progreso de Entrenamiento (Sesión Actual)</h3>
                    <button onclick="multiProgress.loadCompletedModels()" class="refresh-btn">
                        Actualizar Estado
                    </button>
                </div>
                <div class="instruments-grid" id="instrumentsProgressGrid">
                    ${this.renderInstruments()}
                </div>
                <div class="panel-footer">
                    <div id="globalStats">
                        <span>Total: ${this.instruments.length}</span>
                        <span id="completedCount">Completados: 0</span>
                        <span id="trainingCount">Entrenando: 0</span>
                        <span id="pendingCount">Pendientes: ${this.instruments.length}</span>
                    </div>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    }

    renderInstruments() {
        return this.instruments.map(inst => {
            const data = this.progressData.get(inst);
            const progress = data.totalEpochs > 0 
                ? (data.epoch / data.totalEpochs * 100).toFixed(0) 
                : 0;
            
            return `
                <div class="instrument-progress-card status-${data.status}" id="progress-${inst}">
                    <div class="card-header">
                        <span class="instrument-name">${inst}</span>
                        <span class="status-icon">${this.getStatusIcon(data.status)}</span>
                    </div>
                    
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progress}%">
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </div>
                    
                    <div class="card-details">
                        <div class="detail-row">
                            <span class="detail-label">Epoch:</span>
                            <span class="detail-value">${data.epoch}/${data.totalEpochs}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Accuracy:</span>
                            <span class="detail-value accuracy-value">
                                ${data.accuracy > 0 ? (data.accuracy * 100).toFixed(2) + '%' : '-'}
                            </span>
                        </div>
                        <div class="detail-row status-message">
                            ${data.message}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusIcon(status) {
        const icons = {
            'pending': '⏸️',
            'training': '⟳',
            'completed': '✓',
            'error': '✗'
        };
        return icons[status] || '•';
    }

    updateInstrument(instrument, updates) {
        if (!this.progressData.has(instrument)) return;
        
        const current = this.progressData.get(instrument);
        const updated = { ...current, ...updates };
        this.progressData.set(instrument, updated);
        
        this.updateCard(instrument, updated);
        this.updateGlobalStats();
    }

    updateCard(instrument, data) {
        const card = document.getElementById(`progress-${instrument}`);
        if (!card) return;

        const progress = data.totalEpochs > 0 
            ? (data.epoch / data.totalEpochs * 100).toFixed(0) 
            : 0;

        // Actualizar clase de estado
        card.className = `instrument-progress-card status-${data.status}`;

        // Actualizar ícono
        const statusIcon = card.querySelector('.status-icon');
        if (statusIcon) statusIcon.textContent = this.getStatusIcon(data.status);

        // Actualizar barra de progreso
        const progressBar = card.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            const progressText = progressBar.querySelector('.progress-text');
            if (progressText) progressText.textContent = `${progress}%`;
        }

        // Actualizar detalles
        const details = card.querySelectorAll('.detail-value');
        if (details[0]) details[0].textContent = `${data.epoch}/${data.totalEpochs}`;
        if (details[1]) {
            details[1].textContent = data.accuracy > 0 
                ? (data.accuracy * 100).toFixed(2) + '%' 
                : '-';
        }

        const statusMessage = card.querySelector('.status-message');
        if (statusMessage) statusMessage.textContent = data.message;
    }

    updateGlobalStats() {
        let completed = 0;
        let training = 0;
        let pending = 0;

        this.progressData.forEach(data => {
            if (data.status === 'completed') completed++;
            else if (data.status === 'training') training++;
            else if (data.status === 'pending') pending++;
        });

        const completedEl = document.getElementById('completedCount');
        const trainingEl = document.getElementById('trainingCount');
        const pendingEl = document.getElementById('pendingCount');

        if (completedEl) completedEl.textContent = `Completados: ${completed}`;
        if (trainingEl) trainingEl.textContent = `Entrenando: ${training}`;
        if (pendingEl) pendingEl.textContent = `Pendientes: ${pending}`;
    }

    // Métodos para actualizar desde el sistema de entrenamiento
    startTraining(instrument, totalEpochs = 30) {
        this.updateInstrument(instrument, {
            status: 'training',
            epoch: 0,
            totalEpochs: totalEpochs,
            message: 'Iniciando entrenamiento...'
        });
    }

    updateEpoch(instrument, epoch, metrics) {
        const data = this.progressData.get(instrument);
        this.updateInstrument(instrument, {
            status: 'training',
            epoch: epoch,
            accuracy: metrics.val_accuracy || metrics.accuracy || 0,
            loss: metrics.val_loss || metrics.loss || 0,
            message: `Entrenando epoch ${epoch}/${data.totalEpochs}...`
        });
    }

    completeTraining(instrument, finalAccuracy) {
        this.updateInstrument(instrument, {
            status: 'completed',
            epoch: this.progressData.get(instrument).totalEpochs,
            accuracy: finalAccuracy,
            message: 'Entrenamiento completado'
        });
    }

    errorTraining(instrument, errorMessage) {
        this.updateInstrument(instrument, {
            status: 'error',
            message: `Error: ${errorMessage}`
        });
    }

    async loadCompletedModels() {
        // Verificar si Firebase está inicializado
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.log('Firebase no inicializado aún, saltando carga de modelos');
            return;
        }

        console.log('Cargando estado de modelos...');
        
        for (const instrument of this.instruments) {
            try {
                const modelDoc = await firebase.firestore()
                    .collection('ml_models')
                    .doc(instrument)
                    .get();

                if (modelDoc.exists) {
                    const modelData = modelDoc.data();
                    
                    if (modelData.isTrained) {
                        this.updateInstrument(instrument, {
                            status: 'completed',
                            accuracy: modelData.accuracy || 0,
                            epoch: 30,
                            totalEpochs: 30,
                            message: `Última actualización: ${this.formatDate(modelData.lastTrained)}`
                        });
                    }
                }
            } catch (error) {
                console.error(`Error cargando ${instrument}:`, error);
            }
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('es-ES', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    reset() {
        this.instruments.forEach(inst => {
            this.progressData.set(inst, {
                status: 'pending',
                epoch: 0,
                totalEpochs: 30,
                accuracy: 0,
                loss: 0,
                message: 'En cola...'
            });
        });
        this.render();
    }
}

// Instancia global
window.multiProgress = new MultiInstrumentProgress();

console.log('Multi-Instrument Progress Panel cargado');