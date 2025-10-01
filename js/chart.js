// chart.js - Componente de Gráfico de Velas

class CandlestickChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = [];
        this.currentInstrument = 'USDZAR';
    }

    // Renderizar velas japonesas realistas
    render(data) {
        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }

        this.data = data;
        const recentData = data.slice(-50); // Últimas 50 velas
        
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

    // Crear una vela individual
    createCandle(candle, minPrice, priceRange, chartHeight, index) {
        const open = parseFloat(candle.open);
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        const close = parseFloat(candle.close);
        
        const isBullish = close > open;
        const bodyTop = Math.max(open, close);
        const bodyBottom = Math.min(open, close);
        const bodyHeight = Math.abs(close - open);
        
        // Calcular posiciones en píxeles (invertir Y para que arriba sea mayor precio)
        const highY = chartHeight - ((high - minPrice) / priceRange * chartHeight);
        const lowY = chartHeight - ((low - minPrice) / priceRange * chartHeight);
        const bodyTopY = chartHeight - ((bodyTop - minPrice) / priceRange * chartHeight);
        const bodyBottomY = chartHeight - ((bodyBottom - minPrice) / priceRange * chartHeight);
        
        const upperWickHeight = Math.max(bodyTopY - highY, 0);
        const lowerWickHeight = Math.max(lowY - bodyBottomY, 0);
        const bodyHeightPx = Math.max(bodyBottomY - bodyTopY, 1);
        
        const tooltipData = `O:${open.toFixed(4)} H:${high.toFixed(4)} L:${low.toFixed(4)} C:${close.toFixed(4)}`;
        
        return `
            <div class="candlestick" 
                 style="height: ${chartHeight}px;" 
                 data-tooltip="${tooltipData}"
                 data-index="${index}">
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

    // Agregar interactividad a las velas
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

    // Mostrar tooltip con información de la vela
    showTooltip(event) {
        const tooltipData = event.target.closest('.candlestick').dataset.tooltip;
        const index = event.target.closest('.candlestick').dataset.index;
        
        let tooltip = document.getElementById('chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 1000;
                pointer-events: none;
                border: 1px solid #00f5ff;
            `;
            document.body.appendChild(tooltip);
        }
        
        tooltip.innerHTML = `
            <strong>Vela #${index}</strong><br>
            ${tooltipData}
        `;
        
        tooltip.style.display = 'block';
        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = event.pageY - 50 + 'px';
    }

    // Ocultar tooltip
    hideTooltip() {
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Mostrar estado vacío
    showEmptyState() {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 15px;">📊</div>
                <p>No hay datos disponibles</p>
                <small>Carga un instrumento para ver el gráfico</small>
            </div>
        `;
    }

    // Mostrar estado de carga
// En chart.js, busca showLoadingState y actualízala:
showLoadingState() {
    this.container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #94a3b8;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(0, 245, 255, 0.3); border-radius: 50%; border-top-color: #00f5ff; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
            <p>Conectando a datos REALES...</p>
            <small>Obteniendo datos de Twelve Data</small>
        </div>
    `;
}

    // Actualizar con nueva vela en tiempo real
    updateRealTime(newCandle) {
        if (!this.data || this.data.length === 0) return;
        
        // Agregar nueva vela
        this.data.push(newCandle);
        
        // Mantener solo las últimas 200 velas
        if (this.data.length > 200) {
            this.data.shift();
        }
        
        // Re-renderizar
        this.render(this.data);
    }

    // Obtener datos actuales
    getCurrentData() {
        return this.data;
    }

    // Limpiar gráfico
    clear() {
        this.container.innerHTML = '';
        this.data = [];
    }
}

// Clase para generar datos de mercado
class MarketDataGenerator {
    constructor() {
        this.instruments = {
            'USDZAR': { basePrice: 18.5420, volatility: 0.025, spread: 0.0015 },
            'USDTRY': { basePrice: 29.4580, volatility: 0.035, spread: 0.0020 },
            'AUDJPY': { basePrice: 98.2150, volatility: 0.015, spread: 0.0008 },
            'GBPJPY': { basePrice: 185.7420, volatility: 0.018, spread: 0.0010 },
            'USDBRL': { basePrice: 5.2340, volatility: 0.022, spread: 0.0012 },
            'XAUUSD': { basePrice: 2650.50, volatility: 0.020, spread: 0.50 }
        };
    }

    // Generar datos históricos realistas
    generateHistoricalData(instrument, bars = 100) {
        const instrumentData = this.instruments[instrument];
        if (!instrumentData) {
            throw new Error(`Instrumento ${instrument} no soportado`);
        }

        const data = [];
        let price = instrumentData.basePrice;
        const volatility = instrumentData.volatility;
        
        for (let i = 0; i < bars; i++) {
            const timestamp = new Date(Date.now() - (bars - i) * 15 * 60 * 1000); // 15 min intervals
            
            // Generar movimiento de precio realista
            const trend = Math.sin(i / 20) * 0.002; // Tendencia suave
            const noise = (Math.random() - 0.5) * volatility; // Ruido aleatorio
            const gapNoise = Math.random() > 0.98 ? (Math.random() - 0.5) * volatility * 3 : 0; // Gaps ocasionales
            
            const priceChange = trend + noise + gapNoise;
            price = price * (1 + priceChange);
            
            // Generar OHLC realista
            const open = price;
            const volatilityRange = price * volatility * (0.3 + Math.random() * 0.7);
            
            let high = open + (volatilityRange * Math.random());
            let low = open - (volatilityRange * Math.random());
            let close = low + (high - low) * Math.random();
            
            // Asegurar coherencia OHLC
            high = Math.max(open, close, high);
            low = Math.min(open, close, low);
            
            // Ajustar para que el close sea el precio final
            price = close;
            
            const decimals = instrument === 'XAUUSD' ? 2 : 5;
            
            data.push({
                timestamp: timestamp.toISOString(),
                date: timestamp.toISOString().split('T')[0],
                time: timestamp.toTimeString().split(' ')[0],
                open: parseFloat(open.toFixed(decimals)),
                high: parseFloat(high.toFixed(decimals)),
                low: parseFloat(low.toFixed(decimals)),
                close: parseFloat(close.toFixed(decimals)),
                volume: Math.floor(Math.random() * 50000) + 10000
            });
        }
        
        return data;
    }

    // Generar nueva vela en tiempo real
    generateNewCandle(lastCandle, instrument) {
        const instrumentData = this.instruments[instrument];
        const lastPrice = parseFloat(lastCandle.close);
        const volatility = instrumentData.volatility;
        
        // Movimiento más suave para tiempo real
        const change = (Math.random() - 0.5) * volatility * 0.5;
        const newPrice = lastPrice * (1 + change);
        
        const now = new Date();
        const open = lastPrice;
        const volatilityRange = newPrice * volatility * 0.3;
        
        let high = Math.max(open, newPrice) + (volatilityRange * Math.random());
        let low = Math.min(open, newPrice) - (volatilityRange * Math.random());
        let close = newPrice;
        
        // Asegurar coherencia
        high = Math.max(open, close, high);
        low = Math.min(open, close, low);
        
        const decimals = instrument === 'XAUUSD' ? 2 : 5;
        
        return {
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            open: parseFloat(open.toFixed(decimals)),
            high: parseFloat(high.toFixed(decimals)),
            low: parseFloat(low.toFixed(decimals)),
            close: parseFloat(close.toFixed(decimals)),
            volume: Math.floor(Math.random() * 50000) + 10000
        };
    }

    // Obtener información del instrumento
    getInstrumentInfo(instrument) {
        return this.instruments[instrument];
    }
}

// CSS adicional para animaciones
const chartStyles = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .candlestick {
        transition: transform 0.2s ease, z-index 0.2s ease;
    }
    
    .candlestick:hover {
        filter: brightness(1.2);
    }
    
    .candle-body {
        transition: all 0.2s ease;
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

// Exportar para uso global
window.CandlestickChart = CandlestickChart;
window.MarketDataGenerator = MarketDataGenerator;