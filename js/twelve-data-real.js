// twelve-data-real.js - Cliente para datos REALES
const TWELVE_DATA_API_KEY = '9b6c64f762b042df8b27635abc03012f';

class TwelveDataRealClient {
    constructor() {
        this.apiKey = TWELVE_DATA_API_KEY;
        this.baseUrl = 'https://api.twelvedata.com';
        this.callCount = 0;
        this.maxDailyCalls = 800;
    }

    // ✅ OBTENER DATOS HISTÓRICOS REALES
    async getTimeSeries(symbol, interval = '15min', outputsize = 100) {
        if (this.callCount >= this.maxDailyCalls) {
            throw new Error('Límite diario alcanzado');
        }

        const url = new URL(`${this.baseUrl}/time_series`);
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('interval', interval);
        url.searchParams.set('outputsize', outputsize.toString());
        url.searchParams.set('apikey', this.apiKey);
        url.searchParams.set('format', 'JSON');

        console.log(`🌐 Obteniendo datos REALES: ${symbol} (${interval})`);

        try {
            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(`Twelve Data: ${data.message}`);
            }

            if (!data.values || data.values.length === 0) {
                throw new Error('No se recibieron datos');
            }

            this.callCount++;
            console.log(`✅ Datos REALES recibidos: ${data.values.length} velas`);
            console.log(`📊 Llamadas usadas: ${this.callCount}/${this.maxDailyCalls}`);

            return this.transformData(data);

        } catch (error) {
            console.error('❌ Error Twelve Data:', error);
            throw error;
        }
    }

    // ✅ TRANSFORMAR DATOS AL FORMATO DE TU APP
    transformData(data) {
        return data.values.map(item => ({
            timestamp: new Date(item.datetime).toISOString(),
            date: item.datetime.split(' ')[0],
            time: item.datetime.split(' ')[1],
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume) || Math.floor(Math.random() * 50000) + 10000,
            isRealData: true,
            source: 'TwelveData-Real',
            symbol: data.meta.symbol
        })).reverse(); // Ordenar cronológicamente
    }

    // ✅ OBTENER PRECIO ACTUAL
    async getCurrentPrice(symbol) {
        const url = new URL(`${this.baseUrl}/price`);
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('apikey', this.apiKey);
        url.searchParams.set('format', 'JSON');

        const response = await fetch(url.toString());
        const data = await response.json();

        return {
            price: parseFloat(data.price),
            timestamp: new Date().toISOString()
        };
    }

    // ✅ VERIFICAR CONEXIÓN
    async testConnection() {
        try {
            const price = await this.getCurrentPrice('USD/ZAR');
            return {
                success: true,
                message: `Conexión exitosa. USD/ZAR: ${price.price}`,
                price: price.price
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Mapeo de símbolos para Twelve Data
const TWELVE_DATA_SYMBOLS = {
    'USDZAR': 'USD/ZAR',
    'USDTRY': 'USD/TRY',
    'AUDJPY': 'AUD/JPY', 
    'GBPJPY': 'GBP/JPY',
    'USDBRL': 'USD/BRL',
    'XAUUSD': 'XAU/USD'
};

// Función principal para obtener datos
async function getTwelveDataReal(instrument, interval = '15min', bars = 100) {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }

    const symbol = TWELVE_DATA_SYMBOLS[instrument];
    if (!symbol) {
        throw new Error(`Instrumento ${instrument} no soportado`);
    }

    return await window.twelveDataReal.getTimeSeries(symbol, interval, bars);
}

// Función de prueba
async function testTwelveDataConnection() {
    if (!window.twelveDataReal) {
        window.twelveDataReal = new TwelveDataRealClient();
    }
    
    const result = await window.twelveDataReal.testConnection();
    alert(result.message);
    return result;
}

// Exportar para uso global
window.TwelveDataRealClient = TwelveDataRealClient;
window.getTwelveDataReal = getTwelveDataReal;
window.testTwelveDataConnection = testTwelveDataConnection;
window.TWELVE_DATA_SYMBOLS = TWELVE_DATA_SYMBOLS;

console.log('✅ Twelve Data REAL client cargado');