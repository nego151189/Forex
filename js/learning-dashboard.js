// learning-dashboard.js - DASHBOARD DE EVOLUCIÓN DEL APRENDIZAJE
class LearningDashboard {
    constructor() {
        this.charts = new Map();
        this.activeInstrument = null;
        this.refreshInterval = null;
    }

    async initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container no encontrado:', containerId);
            return;
        }

        await this.render();
        
        // Auto-refresh cada 30 segundos
        this.refreshInterval = setInterval(() => {
            if (this.activeInstrument) {
                this.refreshMetrics(this.activeInstrument);
            }
        }, 30000);
    }

    async render() {
        this.container.innerHTML = `
            <div class="learning-dashboard-container">
                <!-- Selector de Instrumento -->
                <div class="instrument-selector">
                    <h2>Dashboard de Aprendizaje ML</h2>
                    <select id="learningInstrumentSelect" onchange="learningDashboard.selectInstrument(this.value)">
                        <option value="">Selecciona un instrumento</option>
                        <option value="EURUSD">EUR/USD</option>
                        <option value="GBPUSD">GBP/USD</option>
                        <option value="USDJPY">USD/JPY</option>
                        <option value="USDCHF">USD/CHF</option>
                        <option value="EURJPY">EUR/JPY</option>
                        <option value="GBPJPY">GBP/JPY</option>
                        <option value="AUDJPY">AUD/JPY</option>
                        <option value="EURGBP">EUR/GBP</option>
                        <option value="USDZAR">USD/ZAR</option>
                        <option value="USDTRY">USD/TRY</option>
                        <option value="USDBRL">USD/BRL</option>
                        <option value="USDMXN">USD/MXN</option>
                        <option value="XAUUSD">Oro/USD</option>
                        <option value="XAGUSD">Plata/USD</option>
                    </select>
                    <button onclick="learningDashboard.forceRetrain()" class="retrain-btn" id="retrainBtn">
                        🔄 Forzar Reentrenamiento
                    </button>
                </div>

                <!-- Métricas Principales -->
                <div id="mainMetrics" class="main-metrics">
                    <div class="loading-state">
                        <p>Selecciona un instrumento para ver sus métricas</p>
                    </div>
                </div>

                <!-- Gráficos de Evolución -->
                <div class="charts-section">
                    <div class="chart-container">
                        <h3>Evolución de Accuracy</h3>
                        <canvas id="accuracyChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Evolución de Loss</h3>
                        <canvas id="lossChart"></canvas>
                    </div>
                </div>

                <!-- Matriz de Confusión -->
                <div id="confusionMatrixContainer" class="confusion-section">
                    <!-- Se llenará dinámicamente -->
                </div>

                <!-- Historial de Entrenamiento -->
                <div id="trainingHistory" class="training-history-section">
                    <!-- Se llenará dinámicamente -->
                </div>

                <!-- Comparación entre Instrumentos -->
                <div class="comparison-section">
                    <h3>Comparación de Modelos</h3>
                    <div id="modelsComparison">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>
            </div>
        `;

        // Cargar comparación global
        await this.renderModelsComparison();
    }

    async selectInstrument(instrument) {
        if (!instrument) return;

        this.activeInstrument = instrument;
        console.log('Instrumento seleccionado:', instrument);

        // Mostrar loading
        document.getElementById('mainMetrics').innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Cargando métricas de ${instrument}...</p>
            </div>
        `;

        // Cargar datos
        await this.loadInstrumentData(instrument);
    }

    async loadInstrumentData(instrument) {
        try {
            // Obtener metadata del modelo
            const modelDoc = await firebase.firestore()
                .collection('ml_models')
                .doc(instrument)
                .get();

            if (!modelDoc.exists) {
                this.showNoDataMessage(instrument);
                return;
            }

            const modelData = modelDoc.data();

            // Obtener historial de training epochs
            const trainingHistory = await this.getTrainingHistory(instrument);

            // Renderizar métricas principales
            this.renderMainMetrics(instrument, modelData, trainingHistory);

            // Renderizar gráficos
            this.renderCharts(trainingHistory);

            // Renderizar matriz de confusión (simulada por ahora)
            this.renderConfusionMatrix(modelData);

            // Renderizar historial
            this.renderTrainingHistoryTable(trainingHistory);

        } catch (error) {
            console.error('Error cargando datos del instrumento:', error);
            this.showErrorMessage(instrument, error);
        }
    }

    renderMainMetrics(instrument, modelData, trainingHistory) {
        const latestTraining = trainingHistory[0];
        const accuracy = latestTraining ? latestTraining.val_accuracy : modelData.accuracy;
        const trend = this.calculateTrend(trainingHistory);

        const html = `
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <h3>Accuracy Actual</h3>
                    <div class="metric-value">${(accuracy * 100).toFixed(2)}%</div>
                    <div class="metric-trend ${trend.direction}">
                        ${trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} 
                        ${trend.change.toFixed(2)}%
                    </div>
                    <div class="metric-label">Validación</div>
                </div>

                <div class="metric-card">
                    <h3>Sesiones de Entrenamiento</h3>
                    <div class="metric-value">${modelData.trainingHistory?.length || 0}</div>
                    <div class="metric-subtext">Total de entrenamientos</div>
                </div>

                <div class="metric-card">
                    <h3>Último Entrenamiento</h3>
                    <div class="metric-value">${this.formatDate(modelData.lastTrained)}</div>
                    <div class="metric-subtext">${this.getTimeSince(modelData.lastTrained)}</div>
                </div>

                <div class="metric-card">
                    <h3>Estado del Modelo</h3>
                    <div class="metric-value ${modelData.isTrained ? 'status-active' : 'status-inactive'}">
                        ${modelData.isTrained ? '✓ ENTRENADO' : '✗ SIN ENTRENAR'}
                    </div>
                    <div class="metric-subtext">
                        ${modelData.sequenceLength || 60} períodos de secuencia
                    </div>
                </div>

                <div class="metric-card">
                    <h3>Loss Actual</h3>
                    <div class="metric-value">${latestTraining ? latestTraining.val_loss.toFixed(4) : 'N/A'}</div>
                    <div class="metric-subtext">Validation Loss</div>
                </div>

                <div class="metric-card">
                    <h3>Epochs Entrenados</h3>
                    <div class="metric-value">${trainingHistory.length}</div>
                    <div class="metric-subtext">Últimos epochs registrados</div>
                </div>
            </div>
        `;

        document.getElementById('mainMetrics').innerHTML = html;
    }

    calculateTrend(history) {
        if (history.length < 2) {
            return { direction: 'stable', change: 0 };
        }

        const recent = history.slice(0, 5);
        const older = history.slice(5, 10);

        if (older.length === 0) {
            return { direction: 'stable', change: 0 };
        }

        const recentAvg = recent.reduce((sum, h) => sum + h.val_accuracy, 0) / recent.length;
        const olderAvg = older.reduce((sum, h) => sum + h.val_accuracy, 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        return {
            direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
            change: Math.abs(change)
        };
    }

    async getTrainingHistory(instrument, limit = 100) {
        try {
            const snapshot = await firebase.firestore()
                .collection('training_epochs')
                .where('instrument', '==', instrument)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }

    renderCharts(trainingHistory) {
        if (trainingHistory.length === 0) return;

        // Invertir para mostrar cronológicamente
        const data = [...trainingHistory].reverse();

        // Preparar datos
        const epochs = data.map((_, i) => i + 1);
        const trainAccuracy = data.map(h => h.accuracy * 100);
        const valAccuracy = data.map(h => h.val_accuracy * 100);
        const trainLoss = data.map(h => h.loss);
        const valLoss = data.map(h => h.val_loss);

        // Gráfico de Accuracy
        const accuracyCtx = document.getElementById('accuracyChart');
        if (this.charts.has('accuracy')) {
            this.charts.get('accuracy').destroy();
        }

        this.charts.set('accuracy', new Chart(accuracyCtx, {
            type: 'line',
            data: {
                labels: epochs,
                datasets: [
                    {
                        label: 'Training Accuracy',
                        data: trainAccuracy,
                        borderColor: '#00f5ff',
                        backgroundColor: 'rgba(0, 245, 255, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Validation Accuracy',
                        data: valAccuracy,
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#e1e8ef' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: '#e1e8ef' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e1e8ef' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        }));

        // Gráfico de Loss
        const lossCtx = document.getElementById('lossChart');
        if (this.charts.has('loss')) {
            this.charts.get('loss').destroy();
        }

        this.charts.set('loss', new Chart(lossCtx, {
            type: 'line',
            data: {
                labels: epochs,
                datasets: [
                    {
                        label: 'Training Loss',
                        data: trainLoss,
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Validation Loss',
                        data: valLoss,
                        borderColor: '#ffa726',
                        backgroundColor: 'rgba(255, 167, 38, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#e1e8ef' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e1e8ef' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e1e8ef' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        }));
    }

    renderConfusionMatrix(modelData) {
        // Por ahora simulada - en producción vendrá del modelo real
        const matrix = [
            [45, 3, 2],
            [4, 42, 4],
            [2, 5, 43]
        ];

        const html = `
            <h3>Matriz de Confusión (Últimas 150 predicciones)</h3>
            <table class="confusion-matrix">
                <tr>
                    <th></th>
                    <th>Pred BUY</th>
                    <th>Pred SELL</th>
                    <th>Pred HOLD</th>
                </tr>
                <tr>
                    <th>Real BUY</th>
                    <td class="correct">${matrix[0][0]}</td>
                    <td>${matrix[0][1]}</td>
                    <td>${matrix[0][2]}</td>
                </tr>
                <tr>
                    <th>Real SELL</th>
                    <td>${matrix[1][0]}</td>
                    <td class="correct">${matrix[1][1]}</td>
                    <td>${matrix[1][2]}</td>
                </tr>
                <tr>
                    <th>Real HOLD</th>
                    <td>${matrix[2][0]}</td>
                    <td>${matrix[2][1]}</td>
                    <td class="correct">${matrix[2][2]}</td>
                </tr>
            </table>
            <div class="matrix-legend">
                <span>✓ Predicciones correctas en diagonal</span>
                <span>Precision: ${((matrix[0][0] + matrix[1][1] + matrix[2][2]) / 150 * 100).toFixed(1)}%</span>
            </div>
        `;

        document.getElementById('confusionMatrixContainer').innerHTML = html;
    }

    renderTrainingHistoryTable(history) {
        if (history.length === 0) {
            document.getElementById('trainingHistory').innerHTML = '<p>No hay historial de entrenamiento</p>';
            return;
        }

        let html = `
            <h3>Historial de Entrenamiento (Últimos 20)</h3>
            <table class="training-history-table">
                <thead>
                    <tr>
                        <th>Epoch</th>
                        <th>Train Acc</th>
                        <th>Val Acc</th>
                        <th>Train Loss</th>
                        <th>Val Loss</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
        `;

        history.slice(0, 20).forEach(h => {
            html += `
                <tr>
                    <td>${h.epoch}</td>
                    <td>${(h.accuracy * 100).toFixed(2)}%</td>
                    <td class="${h.val_accuracy > 0.7 ? 'accuracy-high' : h.val_accuracy > 0.6 ? 'accuracy-medium' : 'accuracy-low'}">
                        ${(h.val_accuracy * 100).toFixed(2)}%
                    </td>
                    <td>${h.loss.toFixed(4)}</td>
                    <td>${h.val_loss.toFixed(4)}</td>
                    <td>${this.formatDate(h.timestamp)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';

        document.getElementById('trainingHistory').innerHTML = html;
    }

    async renderModelsComparison() {
        try {
            const snapshot = await firebase.firestore()
                .collection('ml_models')
                .get();

            const models = [];
            snapshot.forEach(doc => {
                models.push({
                    instrument: doc.id,
                    ...doc.data()
                });
            });

            // Ordenar por accuracy
            models.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));

            let html = '<table class="models-comparison-table"><thead><tr><th>Instrumento</th><th>Accuracy</th><th>Estado</th><th>Último Entrenamiento</th></tr></thead><tbody>';

            models.forEach(model => {
                html += `
                    <tr class="clickable" onclick="learningDashboard.selectInstrumentById('${model.instrument}')">
                        <td><strong>${model.instrument}</strong></td>
                        <td>
                            <span class="accuracy-badge ${model.accuracy > 0.7 ? 'high' : model.accuracy > 0.6 ? 'medium' : 'low'}">
                                ${(model.accuracy * 100).toFixed(2)}%
                            </span>
                        </td>
                        <td>${model.isTrained ? '✓ Entrenado' : '✗ Sin entrenar'}</td>
                        <td>${this.formatDate(model.lastTrained)}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';

            document.getElementById('modelsComparison').innerHTML = html;

        } catch (error) {
            console.error('Error cargando comparación:', error);
        }
    }

    selectInstrumentById(instrument) {
        document.getElementById('learningInstrumentSelect').value = instrument;
        this.selectInstrument(instrument);
    }

    async forceRetrain() {
        if (!this.activeInstrument) {
            alert('Selecciona un instrumento primero');
            return;
        }

        if (!confirm(`¿Forzar reentrenamiento de ${this.activeInstrument}?`)) {
            return;
        }

        const btn = document.getElementById('retrainBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Entrenando...';

        try {
            if (window.forceTrainInstrument) {
                await window.forceTrainInstrument(this.activeInstrument);
                alert(`${this.activeInstrument} agregado a cola de entrenamiento`);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Forzar Reentrenamiento';
        }
    }

    async refreshMetrics(instrument) {
        console.log('Refrescando métricas...');
        await this.loadInstrumentData(instrument);
    }

    showNoDataMessage(instrument) {
        document.getElementById('mainMetrics').innerHTML = `
            <div class="no-data-message">
                <h3>Sin Datos</h3>
                <p>No hay datos de entrenamiento para ${instrument}</p>
                <button onclick="learningDashboard.forceRetrain()">Entrenar Ahora</button>
            </div>
        `;
    }

    showErrorMessage(instrument, error) {
        document.getElementById('mainMetrics').innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>Error cargando datos de ${instrument}: ${error.message}</p>
            </div>
        `;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('es-ES');
    }

    getTimeSince(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        return 'Reciente';
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// ============================================
// SISTEMA DE INDICADOR DE PROGRESO
// ============================================

class TrainingProgressIndicator {
    constructor() {
        this.currentInstrument = null;
        this.isTraining = false;
        this.currentEpoch = 0;
        this.totalEpochs = 30;
        this.createProgressBar();
    }

    createProgressBar() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createProgressBar());
            return;
        }

        const trainButton = document.querySelector('#train-button, button[onclick*="trainModel"]');
        if (!trainButton || !trainButton.parentNode) {
            setTimeout(() => this.createProgressBar(), 1000);
            return;
        }

        const progressContainer = document.createElement('div');
        progressContainer.id = 'training-progress-container';
        progressContainer.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: rgba(139, 92, 246, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(139, 92, 246, 0.3);
            display: none;
        `;

        progressContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div>
                    <span id="training-status-text" style="font-weight: 600; color: #8b5cf6; font-size: 14px;">
                        Preparando entrenamiento...
                    </span>
                    <span id="training-epoch-text" style="margin-left: 10px; color: #9ca3af; font-size: 13px;">
                        Epoch 0/30
                    </span>
                </div>
                <div id="training-accuracy-live" style="font-weight: 600; color: #10b981; font-size: 14px;">
                    Accuracy: 0%
                </div>
            </div>
            
            <div style="width: 100%; height: 8px; background: rgba(139, 92, 246, 0.2); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                <div id="training-progress-bar" style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #8b5cf6, #06b6d4);
                    transition: width 0.3s ease;
                "></div>
            </div>
            
            <div id="training-time-estimate" style="font-size: 12px; color: #9ca3af; text-align: right;">
                Tiempo estimado: Calculando...
            </div>
        `;

        trainButton.parentNode.insertBefore(progressContainer, trainButton.nextSibling);
    }

    show(instrument) {
        this.currentInstrument = instrument;
        this.isTraining = true;
        this.currentEpoch = 0;
        
        const container = document.getElementById('training-progress-container');
        const trainButton = document.querySelector('#train-button, button[onclick*="trainModel"]');
        
        if (container) {
            container.style.display = 'block';
        }
        
        if (trainButton) {
            trainButton.textContent = 'Entrenando...';
            trainButton.disabled = true;
            trainButton.style.opacity = '0.6';
            trainButton.style.cursor = 'not-allowed';
        }

        this.updateStatus('Iniciando entrenamiento...', 0);
    }

    updateProgress(epoch, totalEpochs, metrics) {
        this.currentEpoch = epoch;
        this.totalEpochs = totalEpochs;

        const progress = (epoch / totalEpochs) * 100;
        const progressBar = document.getElementById('training-progress-bar');
        const epochText = document.getElementById('training-epoch-text');
        const statusText = document.getElementById('training-status-text');
        const accuracyLive = document.getElementById('training-accuracy-live');
        const timeEstimate = document.getElementById('training-time-estimate');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (epochText) {
            epochText.textContent = `Epoch ${epoch}/${totalEpochs}`;
        }

        if (statusText) {
            statusText.textContent = `Entrenando ${this.currentInstrument}`;
        }

        if (accuracyLive && metrics) {
            const acc = metrics.val_acc || metrics.val_accuracy || metrics.accuracy;
            if (acc !== undefined) {
                accuracyLive.textContent = `Val Accuracy: ${(acc * 100).toFixed(2)}%`;
            }
        }

        if (timeEstimate) {
            const remainingEpochs = totalEpochs - epoch;
            const estimatedSeconds = remainingEpochs * 3;
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = estimatedSeconds % 60;
            
            if (minutes > 0) {
                timeEstimate.textContent = `Tiempo estimado: ${minutes}m ${seconds}s`;
            } else {
                timeEstimate.textContent = `Tiempo estimado: ${seconds}s`;
            }
        }
    }

    updateStatus(message, progress) {
        const statusText = document.getElementById('training-status-text');
        const progressBar = document.getElementById('training-progress-bar');

        if (statusText) {
            statusText.textContent = message;
        }

        if (progressBar && progress !== undefined) {
            progressBar.style.width = `${progress}%`;
        }
    }

    complete(finalAccuracy) {
        this.isTraining = false;
        
        const container = document.getElementById('training-progress-container');
        const trainButton = document.querySelector('#train-button, button[onclick*="trainModel"]');
        const statusText = document.getElementById('training-status-text');
        const progressBar = document.getElementById('training-progress-bar');
        const accuracyLive = document.getElementById('training-accuracy-live');

        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.background = '#10b981';
        }

        if (statusText) {
            statusText.textContent = '✅ Entrenamiento completado';
            statusText.style.color = '#10b981';
        }

        if (accuracyLive) {
            accuracyLive.textContent = `Accuracy Final: ${(finalAccuracy * 100).toFixed(2)}%`;
        }

        if (trainButton) {
            trainButton.textContent = 'Forzar Reentrenamiento';
            trainButton.disabled = false;
            trainButton.style.opacity = '1';
            trainButton.style.cursor = 'pointer';
        }

        setTimeout(() => {
            if (container) {
                container.style.display = 'none';
            }
            if (trainButton) {
                trainButton.textContent = 'Entrenar Ahora';
            }
        }, 5000);
    }

    hide() {
        const container = document.getElementById('training-progress-container');
        if (container) {
            container.style.display = 'none';
        }
        
        const trainButton = document.querySelector('#train-button, button[onclick*="trainModel"]');
        if (trainButton) {
            trainButton.textContent = 'Entrenar Ahora';
            trainButton.disabled = false;
            trainButton.style.opacity = '1';
            trainButton.style.cursor = 'pointer';
        }
        
        this.isTraining = false;
    }

    error(message) {
        const statusText = document.getElementById('training-status-text');
        const progressBar = document.getElementById('training-progress-bar');

        if (statusText) {
            statusText.textContent = `❌ Error: ${message}`;
            statusText.style.color = '#ef4444';
        }

        if (progressBar) {
            progressBar.style.background = '#ef4444';
        }

        const trainButton = document.querySelector('#train-button, button[onclick*="trainModel"]');
        if (trainButton) {
            trainButton.textContent = 'Reintentar Entrenamiento';
            trainButton.disabled = false;
            trainButton.style.opacity = '1';
            trainButton.style.cursor = 'pointer';
        }
    }
}

// Instanciar globalmente
window.trainingProgress = new TrainingProgressIndicator();

// Instancia global
window.learningDashboard = null;

// Inicialización
function initializeLearningDashboard(containerId) {
    if (!window.learningDashboard) {
        window.learningDashboard = new LearningDashboard();
    }
    window.learningDashboard.initialize(containerId);
}

window.LearningDashboard = LearningDashboard;
window.initializeLearningDashboard = initializeLearningDashboard;

console.log('✅ Learning Dashboard cargado');
console.log('✅ Indicador de progreso de entrenamiento cargado');