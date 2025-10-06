// twelve-data-real.js - CLIENTE AMPLIADO PARA DATOS REALES
const TWELVE_DATA_API_KEY = '9b6c64f762b042df8b27635abc03012f';

// ✅ INSTRUMENTOS AMPLIADOS - 18 PARES + ORO + PLATA
const TWELVE_DATA_SYMBOLS = {
    // MAJORS
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD',
    'NZDUSD': 'NZD/USD',
    'USDCAD': 'USD/CAD',
    
    // CROSSES
    'EURJPY': 'EUR/JPY',
    'GBPJPY': 'GBP/JPY',
    'AUDJPY': 'AUD/JPY',
    'EURGBP': 'EUR/GBP',
    'EURAUD': 'EUR/AUD',
    'EURCHF': 'EUR/CHF',
    
    // EXOTICS
    'USDZAR': 'USD/ZAR',
    'USDTRY': 'USD/TRY',
    'USDBRL': 'USD/BRL',
    'USDMXN': 'USD/MXN',
    'USDRUB': 'USD/RUB',
    
    // COMMODITIES
    'XAUUSD': 'XAU/USD',  // ORO
    'XAGUSD': 'XAG/USD',  // PLATA
    'WTIUSD': 'WTI/USD',  // PETRÓLEO WTI
    'BCOUSD': 'BCO/USD'   // PETRÓLEO BRENT
};

const INSTRUMENT_METADATA = {
    'EURUSD': { type: 'major', volatility: 'low', spread: 0.00010 },
    'GBPUSD': { type: 'major', volatility: 'medium', spread: 0.00015 },
    'USDJPY': { type: 'major', volatility: 'low', spread: 0.008 },
    'USDCHF': { type: 'major', volatility: 'low', spread: 0.00015 },
    'AUDUSD': { type: 'major', volatility: 'medium', spread: 0.00020 },
    'NZDUSD': { type: 'major', volatility: 'medium', spread: 0.00025 },
    'USDCAD': { type: 'major', volatility: 'low', spread: 0.00020 },
    
    'EURJPY': { type: 'cross', volatility: 'medium', spread: 0.020 },
    'GBPJPY': { type: 'cross', volatility: 'high', spread: 0.025 },
    'AUDJPY': { type: 'cross', volatility: 'medium', spread: 0.020 },
    'EURGBP': { type: 'cross', volatility: 'low', spread: 0.00015 },
    'EURAUD': { type: 'cross', volatility: 'medium', spread: 0.00030 },
    'EURCHF': { type: 'cross', volatility: 'low', spread: 0.00020 },
    
    'USDZAR': { type: 'exotic', volatility: 'very_high', spread: 0.0100 },
    'USDTRY': { type: 'exotic', volatility: 'very_high', spread: 0.0150 },
    'USDBRL': { type: 'exotic', volatility: 'high', spread: 0.0080 },
    'USDMXN': { type: 'exotic', volatility: 'high', spread: 0.0050 },
    'USDRUB': { type: 'exotic', volatility: 'extreme', spread: 0.0200 },
    
    'XAUUSD': { type: 'commodity', volatility: 'medium', spread: 0.50 },
    'XAGUSD': { type: 'commodity', volatility: 'high', spread: 0.03 },
    'WTIUSD': { type: 'commodity', volatility: 'very_high', spread: 0.05 },
    'BCOUSD': { type: 'commodity', volatility: 'very_high', spread: 0.05 }
};

class TwelveDataRealClient {
    constructor() {
        this.apiKey = TWELVE_DATA_API_KEY;
        this.baseUrl = 'https://api.twelvedata.com';
        this.callCount = 0;
        this.maxDailyCalls = 800;
        this.defaultOutputSize = 5000;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minuto
    }

    async getTimeSeries(symbol, interval = '15min', outputsize = null) {
        // Validar límite
        if (this.callCount >= this.maxDailyCalls) {
            throw new Error('Límite diario alcanzado (800 llamadas)');
        }

        // Verificar si el símbolo es soportado
        if (!TWELVE_DATA_SYMBOLS[symbol]) {
            throw new Error(`Instrumento ${symbol} no soportado`);
        }

        const twelveDataSymbol = TWELVE_DATA_SYMBOLS[symbol];
        const finalOutputSize = outputsize || this.defaultOutputSize;

        // Verificar caché
        const cacheKey = `${symbol}_${interval}_${finalOutputSize}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`📦 Datos de caché: ${symbol}`);
            return cached;
        }

        const url = new URL(`${this.baseUrl}/time_series`);
        url.searchParams.set('symbol', twelveDataSymbol);
        url.searchParams.set('interval', interval);
        url.searchParams.set('outputsize', finalOutputSize.toString());
        url.searchParams.set('apikey', this.apiKey);
        url.searchParams.set('format', 'JSON');

        console.log(`🌐 Solicitando datos REALES: ${symbol} (${interval}, ${finalOutputSize} velas)`);

        try {
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(`Twelve Data Error: ${data.message}`);
            }

            if (!data.values || data.values.length === 0) {
                throw new Error('No se recibieron datos del servidor');
            }

            this.callCount++;
            console.log(`✅ Datos REALES recibidos: ${data.values.length} velas`);
            console.log(`📊 Llamadas usadas: ${this.callCount}/${this.maxDailyCalls}`);

            const transformedData = this.transformData(data, symbol);
            
            // Guardar en caché
            this.saveToCache(cacheKey, transformedData);

            return transformedData;

        } catch (error) {
            console.error('❌ Error Twelve Data:', error);
            throw error;
        }
    }

    transformData(data, symbol) {
        const metadata = INSTRUMENT_METADATA[symbol];

        return data.values.map(item => ({
            timestamp: new Date(item.datetime).toISOString(),
            date: item.datetime.split(' ')[0],
            time: item.datetime.split(' ')[1] || '00:00:00',
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume) || 0,
            isRealData: true,
            source: 'TwelveData',
            symbol: symbol,
            twelveDataSymbol: data.meta.symbol,
            metadata: metadata
        })).reverse(); // Ordenar cronológicamente
    }

    async getCurrentPrice(symbol) {
        if (!TWELVE_DATA_SYMBOLS[symbol]) {
            throw new Error(`Instrumento ${symbol} no soportado`);
        }

        const twelveDataSymbol = TWELVE_DATA_SYMBOLS[symbol];
        const url = new URL(`${this.baseUrl}/price`);
        url.searchParams.set('symbol', twelveDataSymbol);
        url.searchParams.set('apikey', this.apiKey);
        url.searchParams.set('format', 'JSON');

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(`Twelve Data Error: ${data.message}`);
        }

        return {
            symbol: symbol,
            price: parseFloat(data.price),
            timestamp: new Date().toISOString()
        };
    }

    async testConnection() {
        try {
            const testSymbol = 'EURUSD';
            const price = await this.getCurrentPrice(testSymbol);
            
            return {
                success: true,
                message: `✅ Conexión exitosa. ${testSymbol}: ${price.price.toFixed(5)}`,
                price: price.price,
                callsUsed: this.callCount,
                callsRemaining: this.maxDailyCalls - this.callCount
            };
        } catch (error) {
            return {
                success: false,
                message: `❌ Error de conexión: ${error.message}`,
                callsUsed: this.callCount
            };
        }
    }

    async getMultipleInstruments(symbols, interval = '15min', outputsize = 100) {
        const results = {};
        const errors = {};

        for (const symbol of symbols) {
            try {
                results[symbol] = await this.getTimeSeries(symbol, interval, outputsize);
                
                // Pequeña pausa para no saturar API
                await this.sleep(200);
                
            } catch (error) {
                errors[symbol] = error.message;
                console.error(`Error obteniendo ${symbol}:`, error);
            }
        }

        return { results, errors };
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Caché limpiado');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getInstrumentInfo(symbol) {
        return {
            symbol: symbol,
            twelveDataSymbol: TWELVE_DATA_SYMBOLS[symbol],
            metadata: INSTRUMENT_METADATA[symbol]
        };
    }

    getAllSupportedInstruments() {
        return Object.keys(TWELVE_DATA_SYMBOLS).map(symbol => ({
            symbol,
            twelveDataSymbol: TWELVE_DATA_SYMBOLS[symbol],
            ...INSTRUMENT_METADATA[symbol]
        }));
    }

    getCallsRemaining() {
        return {
            used: this.callCount,
            total: this.maxDailyCalls,
            remaining: this.maxDailyCalls - this.callCount,
            percentage: (this.callCount / this.maxDailyCalls * 100).toFixed(1)
        };
    }

    resetCallCount() {
        this.callCount = 0;
        console.log('🔄 Contador de llamadas reseteado');
    }
}

// Función principal para obtener datos
async function getTwelveDataReal(instrument, interval = '15min', bars = 5000) {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }

    if (!TWELVE_DATA_SYMBOLS[instrument]) {
        throw new Error(`Instrumento ${instrument} no soportado. Instrumentos disponibles: ${Object.keys(TWELVE_DATA_SYMBOLS).join(', ')}`);
    }

    return await window.twelveDataReal.getTimeSeries(instrument, interval, bars);
}

// Función de prueba
async function testTwelveDataConnection() {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }
    
    const result = await window.twelveDataReal.testConnection();
    
    alert(`
${result.message}

Llamadas usadas hoy: ${result.callsUsed}
Llamadas restantes: ${result.callsRemaining || 'N/A'}
    `.trim());
    
    return result;
}

// Obtener precio actual de un instrumento
async function getCurrentPrice(instrument) {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }
    
    return await window.twelveDataReal.getCurrentPrice(instrument);
}

// Obtener todos los instrumentos soportados
function getAllSupportedInstruments() {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }
    
    return window.twelveDataReal.getAllSupportedInstruments();
}

// Obtener información del instrumento
function getInstrumentInfo(instrument) {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }
    
    return window.twelveDataReal.getInstrumentInfo(instrument);
}

// Exportar para uso global
window.TwelveDataRealClient = TwelveDataRealClient;
window.getTwelveDataReal = getTwelveDataReal;
window.testTwelveDataConnection = testTwelveDataConnection;
window.getCurrentPrice = getCurrentPrice;
window.getAllSupportedInstruments = getAllSupportedInstruments;
window.getInstrumentInfo = getInstrumentInfo;
window.TWELVE_DATA_SYMBOLS = TWELVE_DATA_SYMBOLS;
window.INSTRUMENT_METADATA = INSTRUMENT_METADATA;

console.log('✅ Twelve Data Client cargado con 20+ instrumentos');
console.log(`📊 Instrumentos disponibles: ${Object.keys(TWELVE_DATA_SYMBOLS).length}`);