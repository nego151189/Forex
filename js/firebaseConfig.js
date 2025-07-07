// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2qwN5yVZkp3xmKZ10TF2SMEax0C4Y_y8",
    authDomain: "creditos-61ff5.firebaseapp.com",
    projectId: "creditos-61ff5",
    storageBucket: "creditos-61ff5.appspot.com",
    messagingSenderId: "526361239879",
    appId: "1:526361239879:web:c23a7a32fe6695fce12c62"
};

// Inicializar Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado correctamente");
} else {
    console.error("Firebase no está disponible");
}

// LISTA DE MULETILLAS
const FILLER_WORDS = {
    COMMON: ['eh', 'este', 'o sea', 'bueno', 'entonces', 'pues', 'verdad'],
    GT: ['simón', 'va', 'pues'], // Guatemala
    SV: ['chero', 'vaya'],       // El Salvador
    HN: ['mai', 'tú sabés'],     // Honduras
    ALL: function(country) {
        return [...this.COMMON, ...(this[country] || [])];
    }
};