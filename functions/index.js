const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const config = require('./config');

admin.initializeApp();
const db = admin.firestore();

// Función que se ejecuta cada 5 minutos
exports.monitorSignals = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        console.log('Monitoreando señales activas...');
        
        try {
            const snapshot = await db.collection('signals')
                .where('status', '==', 'ACTIVE')
                .get();
            
            if (snapshot.empty) {
                console.log('No hay señales activas');
                return null;
            }
            
            console.log(`Monitoreando ${snapshot.size} señales`);
            
            const promises = snapshot.docs.map(doc => checkSignal(doc));
            await Promise.all(promises);
            
            return null;
        } catch (error) {
            console.error('Error monitoreando señales:', error);
            return null;
        }
    });

async function checkSignal(signalDoc) {
    const signal = signalDoc.data();
    const signalId = signalDoc.id;
    
    console.log(`Verificando ${signal.action} ${signal.instrument}...`);
    
    // Obtener precio actual
    const currentPrice = await getCurrentPrice(signal.instrument);
    
    if (!currentPrice) {
        console.log(`No se pudo obtener precio para ${signal.instrument}`);
        return;
    }
    
    // Verificar si tocó TP o SL
    const result = evaluateSignal(signal, currentPrice);
    
    if (result.closed) {
        await closeSignal(signalId, signal, result, currentPrice);
        await sendTelegramNotification(signal, result);
    } else {
        // Verificar expiración (24 horas)
        const createdAt = signal.generatedAt.toDate();
        const hoursPassed = (Date.now() - createdAt.getTime()) / 3600000;
        
        if (hoursPassed >= 24) {
            const expiredResult = {
                closed: true,
                exitReason: 'EXPIRED',
                exitPrice: currentPrice
            };
            await closeSignal(signalId, signal, expiredResult, currentPrice);
            await sendTelegramNotification(signal, expiredResult);
        }
    }
}

function evaluateSignal(signal, currentPrice) {
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

async function closeSignal(signalId, signal, result, currentPrice) {
    const pips = calculatePips(signal, result.exitPrice);
    const percentReturn = calculatePercentReturn(signal, result.exitPrice);
    
    await db.collection('signals').doc(signalId).update({
        status: result.exitReason,
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        exitPrice: result.exitPrice,
        exitReason: result.exitReason,
        pips: pips,
        percentReturn: percentReturn,
        actualRiskReward: Math.abs(pips / ((signal.entryPrice - signal.stopLoss) * 10000))
    });
    
    console.log(`Señal cerrada: ${signalId} - ${result.exitReason}`);
}

function calculatePips(signal, exitPrice) {
    const diff = signal.action === 'LONG' 
        ? exitPrice - signal.entryPrice
        : signal.entryPrice - exitPrice;
    
    // Para pares JPY
    if (signal.instrument.includes('JPY')) {
        return diff * 100;
    }
    return diff * 10000;
}

function calculatePercentReturn(signal, exitPrice) {
    return ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
}

async function getCurrentPrice(instrument) {
    const symbolMap = {
        'EURUSD': 'EUR/USD',
        'GBPUSD': 'GBP/USD',
        'USDJPY': 'USD/JPY',
        'USDCHF': 'USD/CHF',
        'EURJPY': 'EUR/JPY',
        'GBPJPY': 'GBP/JPY',
        'AUDJPY': 'AUD/JPY',
        'EURGBP': 'EUR/GBP',
        'XAUUSD': 'XAU/USD'
    };
    
    const symbol = symbolMap[instrument];
    if (!symbol) return null;
    
    try {
        const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${config.twelveData.apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.price) {
            return parseFloat(data.price);
        }
        return null;
    } catch (error) {
        console.error(`Error obteniendo precio de ${instrument}:`, error);
        return null;
    }
}

async function sendTelegramNotification(signal, result) {
    const emoji = result.exitReason === 'TARGET_HIT' ? '✅' : 
                  result.exitReason === 'STOP_HIT' ? '❌' : '⏰';
    
    const message = `${emoji} *Señal Cerrada*

${signal.action} ${signal.instrument}

Entry: ${signal.entryPrice.toFixed(5)}
Exit: ${result.exitPrice.toFixed(5)}
Resultado: *${result.exitReason}*

Pips: ${signal.pips ? signal.pips.toFixed(1) : 'N/A'}
Return: ${signal.percentReturn ? signal.percentReturn.toFixed(2) + '%' : 'N/A'}
Confianza: ${(signal.confidence * 100).toFixed(1)}%`;

    try {
        const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.telegram.chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        console.log('Notificación Telegram enviada');
    } catch (error) {
        console.error('Error enviando Telegram:', error);
    }
}