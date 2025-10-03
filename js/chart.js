// chart.js - COMPONENTE DE GRÁFICO (SOLO DATOS REALES)
class CandlestickChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = [];
        this.currentInstrument = 'EURUSD';
    }

    render(data) {
        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }

        // VALIDAR QUE SON DATOS REALES
        if (!data[0].isRealData) {
            this.showErrorState('Los datos no son reales');
            return;
        }

        this.data = data;
        const recentData = data.slice(-50);
        
        // Calcular rango de precios
        const prices = recentData.map(d => [
            parseFloat(d.high),
            parseFloat(d.low),
            parseFloat(d.open),
            parseFloat(d.close)
        ]).flat();
        
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceRange = maxPrice - minPrice;
        const chartHeight = 400;
        
        let html = '';
        
        recentData.forEach((candle, index) => {
            const candleHtml = this.createCandle(candle, minPrice, priceRange, chartHeight, index);
            html += candleHtml;
        });
        
        this.container.innerHTML = html;
        this.addInteractivity();
    }

    createCandle(candle, minPrice, priceRange, chartHeight, index) {
        const open = parseFloat(candle.open);
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        const close = parseFloat(candle.close);
        
        const isBullish = close > open;
        const bodyTop = Math.max(open, close);
        const bodyBottom = Math.min(open, close);
        
        // Calcular posiciones en píxeles (Y invertido)
        const highY = chartHeight - ((high - minPrice) / priceRange * chartHeight);
        const lowY = chartHeight - ((low - minPrice) / priceRange * chartHeight);
        const bodyTopY = chartHeight - ((bodyTop - minPrice) / priceRange * chartHeight);
        const bodyBottomY = chartHeight - ((bodyBottom - minPrice) / priceRange * chartHeight);
        
        const upperWickHeight = Math.max(bodyTopY - highY, 0);
        const lowerWickHeight = Math.max(lowY - bodyBottomY, 0);
        const bodyHeightPx = Math.max(bodyBottomY - bodyTopY, 1);
        
        const tooltipData = `${candle.date} ${candle.time} | O:${open.toFixed(5)} H:${high.toFixed(5)} L:${low.toFixed(5)} C:${close.toFixed(5)}`;
        
        return `
            <div class="candlestick" 
                 style="height: ${chartHeight}px;" 
                 data-tooltip="${tooltipData}"
                 data-index="${index}"
                 data-source="${candle.source}">
                <div style="position: absolute; top: ${highY}px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                    <!-- Mecha superior -->
                    <div class="wick wick-upper" 
                         style="height: ${upperWickHeight}px; width: 1px; background: ${isBullish ? '#00ff88' : '#ff4757'};"></div>
                    
                    <!-- Cuerpo de la vela -->
                    <div class="candle-body ${isBullish ? 'candle-bullish' : 'candle-bearish'}" 
                         style="height: ${bodyHeightPx}px; width: 8px;"></div>
                    
                    <!-- Mecha inferior -->
                    <div class="wick wick-lower" 
                         style="height: ${lowerWickHeight}px; width: 1px; background: ${isBullish ? '#00ff88' : '#ff4757'};"></div>
                </div>
            </div>
        `;
    }

    addInteractivity() {
        const candles = this.container.querySelectorAll('.candlestick');
        
        candles.forEach(candle => {
            candle.addEventListener('mouseenter', (e) => {
                this.showTooltip(e);
                candle.style.transform = 'scaleX(1.5)';
                candle.style.zIndex = '10';
            });
            
            candle.addEventListener('mouseleave', (e) => {
                this.hideTooltip();
                candle.style.transform = 'scaleX(1)';
                candle.style.zIndex = '1';
            });
        });
    }

    showTooltip(event) {
        const candleElement = event.target.closest('.candlestick');
        const tooltipData = candleElement.dataset.tooltip;
        const source = candleElement.dataset.source;
        
        let tooltip = document.getElementById('chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 1000;
                pointer-events: none;
                border: 1px solid #00f5ff;
                box-shadow: 0 4px 15px rgba(0, 245, 255, 0.3);
            `;
            document.body.appendChild(tooltip);
        }
        
        tooltip.innerHTML = `
            <div style="margin-bottom: 5px;">
                <strong style="color: #00f5ff;">📊 ${tooltipData.split('|')[0]}</strong>
            </div>
            <div style="font-family: 'Courier New', monospace;">
                ${tooltipData.split('|')[1]}
            </div>
            <div style="margin-top: 5px; font-size: 10px; color: #00ff88;">
                ✓ ${source}
            </div>
        `;
        
        tooltip.style.display = 'block';
        tooltip.style.left = event.pageX + 15 + 'px';
        tooltip.style.top = event.pageY - 70 + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    showEmptyState() {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 15px;">📊</div>
                <p style="font-size: 1.2em; margin-bottom: 10px;">No hay datos disponibles</p>
                <small>Carga datos reales desde Twelve Data</small>
            </div>
        `;
    }

    showLoadingState() {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #94a3b8;">
                <div class="loading-spinner" style="width: 50px; height: 50px; border: 5px solid rgba(0, 245, 255, 0.3); border-radius: 50%; border-top-color: #00f5ff; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                <p style="font-size: 1.2em; margin-bottom: 10px;">🌐 Conectando a Twelve Data...</p>
                <small>Obteniendo datos reales de mercado</small>
            </div>
        `;
    }

    showErrorState(message) {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #ff4757;">
                <div style="font-size: 3em; margin-bottom: 15px;">❌</div>
                <p style="font-size: 1.2em; margin-bottom: 10px;">Error de Datos</p>
                <small>${message}</small>
            </div>
        `;
    }

    updateRealTime(newCandle) {
        if (!this.data || this.data.length === 0) return;
        
        // Validar que es dato real
        if (!newCandle.isRealData) {
            console.warn('⚠️ Intentando agregar dato no real');
            return;
        }
        
        this.data.push(newCandle);
        
        // Mantener últimas 200 velas
        if (this.data.length > 200) {
            this.data.shift();
        }
        
        this.render(this.data);
    }

    getCurrentData() {
        return this.data;
    }

    clear() {
        this.container.innerHTML = '';
        this.data = [];
    }

    getStatistics() {
        if (this.data.length === 0) return null;

        const prices = this.data.map(d => d.close);
        const volumes = this.data.map(d => d.volume || 0);
        
        return {
            dataPoints: this.data.length,
            firstDate: this.data[0].date,
            lastDate: this.data[this.data.length - 1].date,
            currentPrice: prices[prices.length - 1],
            highPrice: Math.max(...this.data.map(d => d.high)),
            lowPrice: Math.min(...this.data.map(d => d.low)),
            avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
            priceChange: prices[prices.length - 1] - prices[0],
            priceChangePercent: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2)
        };
    }

    exportData(format = 'json') {
        if (this.data.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        let content, filename;

        if (format === 'json') {
            content = JSON.stringify(this.data, null, 2);
            filename = `forex_data_${this.currentInstrument}_${new Date().toISOString().split('T')[0]}.json`;
        } else if (format === 'csv') {
            const headers = ['timestamp', 'date', 'time', 'open', 'high', 'low', 'close', 'volume'];
            const rows = this.data.map(d => 
                [d.timestamp, d.date, d.time, d.open, d.high, d.low, d.close, d.volume].join(',')
            );
            content = [headers.join(','), ...rows].join('\n');
            filename = `forex_data_${this.currentInstrument}_${new Date().toISOString().split('T')[0]}.csv`;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Datos exportados: ${filename}`);
    }
}

// CSS adicional para animaciones
const chartStyles = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .candlestick {
        transition: transform 0.2s ease, z-index 0.2s ease;
        cursor: crosshair;
    }
    
    .candlestick:hover {
        filter: brightness(1.3);
    }
    
    .candle-body {
        transition: all 0.2s ease;
    }
    
    .candle-bullish {
        background: linear-gradient(180deg, #00ff88, #00cc6a);
        border: 1px solid #00ff88;
        box-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
    }
    
    .candle-bearish {
        background: linear-gradient(180deg, #ff4757, #ff3742);
        border: 1px solid #ff4757;
        box-shadow: 0 0 5px rgba(255, 71, 87, 0.5);
    }
    
    .wick {
        transition: all 0.2s ease;
    }
`;

// Agregar estilos al documento
if (!document.getElementById('chart-styles')) {
    const style = document.createElement('style');
    style.id = 'chart-styles';
    style.textContent = chartStyles;
    document.head.appendChild(style);
}

// Exportar
window.CandlestickChart = CandlestickChart;

console.log('✅ CandlestickChart cargado (SOLO DATOS REALES)');