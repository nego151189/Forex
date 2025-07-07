
document.addEventListener("DOMContentLoaded", () => {
  const userRol = localStorage.getItem("userRol");
  const userCorreo = localStorage.getItem("userCorreo");
  const userName = localStorage.getItem("userName");

  if (document.getElementById("userName")) {
    document.getElementById("userName").textContent = userName || userCorreo || "Usuario";
  }
  if (document.getElementById("userRole")) {
    document.getElementById("userRole").textContent = userRol || "rol desconocido";
  }

  function mostrarDenegado(id) {
    const alerta = document.querySelector(`#section-${id} .permiso-denegado`);
    const contenido = document.querySelector(`#section-${id} .contenido-autorizado`);
    if (alerta) alerta.style.display = "block";
    if (contenido) contenido.style.display = "none";
  }

  function ocultarMenu(id) {
    const elem = document.getElementById(`menu-${id}`);
    if (elem) elem.style.display = "none";
  }

  function ocultarSeccion(id) {
    const elem = document.getElementById(`section-${id}`);
    if (elem) elem.style.display = "none";
  }

  if (userRol === "analista") {
    ocultarMenu("usuarios");
    ocultarMenu("parametrizaciones");
    ocultarMenu("reportes");

    mostrarDenegado("usuarios");
    mostrarDenegado("parametrizaciones");
    mostrarDenegado("reportes");
  }

  if (userRol === "coordinador") {
    ocultarMenu("usuarios");
    mostrarDenegado("usuarios");
  }

  showSection("dashboard");
});


document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");

  const userRol = localStorage.getItem("userRol");
  const userCorreo = localStorage.getItem("userCorreo");

  if (userName) userName.textContent = userCorreo || "Usuario";
  if (userRole) userRole.textContent = userRol || "Rol desconocido";

  function ocultarMenu(id) {
    const elem = document.getElementById(`menu-${id}`);
    if (elem) elem.style.display = "none";
  }

  function ocultarSeccion(id) {
    const elem = document.getElementById(`section-${id}`);
    if (elem) elem.style.display = "none";
  }

  const rol = userRol || "analista";

  if (rol === "analista") {
    ocultarMenu("dashboard");
    ocultarMenu("parametrizaciones");
    ocultarMenu("usuarios");
    ocultarMenu("reportes");

    ocultarSeccion("dashboard");
    ocultarSeccion("parametrizaciones");
    ocultarSeccion("usuarios");
    ocultarSeccion("reportes");
    ocultarSeccion("productos");
  }

  if (rol === "coordinador") {
    ocultarMenu("usuarios");
    ocultarSeccion("usuarios");
  }

  showSection("dashboard");
});


// Variables globales
let currentUser = null;
let questionCounter = 0;
let currentEditingScript = null;
let flowNodes = [];
let flowConnections = [];
let flowZoom = 1;
let flowOffset = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let selectedNode = null;
let isCreatingConnection = false;
let connectionStart = null;
let mediaStream = null;
let callTimerInterval = null;
let isMicrophoneActive = false;
let voiceAnalysisData = {
    toneHistory: [],
    dictionHistory: [],
    speedHistory: [],
    fillerWords: 0,
    wordFrequency: {}
};


function toggleMicrophone() {
    const micBtn = document.getElementById('micControlBtn');
    const micIcon = micBtn.querySelector('i');
    
    if (isMicrophoneActive) {
        // Apagar micrófono
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        micBtn.className = 'btn btn-danger me-2';
        micIcon.className = 'fas fa-microphone-slash me-2';
        micBtn.innerHTML = micIcon.outerHTML + 'Micrófono: OFF';
        isMicrophoneActive = false;
    } else {
        // Encender micrófono
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaStream = stream;
                micBtn.className = 'btn btn-success me-2';
                micIcon.className = 'fas fa-microphone me-2';
                micBtn.innerHTML = micIcon.outerHTML + 'Micrófono: ON';
                isMicrophoneActive = true;
            })
            .catch(error => {
                console.error('Error al acceder al micrófono:', error);
                showAlert('No se pudo acceder al micrófono. Por favor verifica los permisos.', 'danger');
            });
    }
}

window.saveConfirmation = function() {
    // Simplemente llama a startConfirmation que ya existe
    window.startConfirmation();
};

// Asegúrate de actualizar el estado al iniciar/finalizar llamadas
function updateMicrophoneUI(isActive) {
    isMicrophoneActive = isActive;
    const micBtn = document.getElementById('micControlBtn');
    if (!micBtn) return;
    
    const micIcon = micBtn.querySelector('i') || document.createElement('i');
    micIcon.className = isActive ? 'fas fa-microphone me-2' : 'fas fa-microphone-slash me-2';
    
    micBtn.className = isActive ? 'btn btn-success me-2' : 'btn btn-danger me-2';
    micBtn.innerHTML = micIcon.outerHTML + (isActive ? 'Micrófono: ON' : 'Micrófono: OFF');
}

window.startCallAnalysis = async function(confirmationId) {
    if (!confirmationId) {
        alert('Error: No se recibió el ID de confirmación');
        return;
    }

    // Configurar el modal
    const modalElement = document.getElementById('callAnalysisModal');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalElement.setAttribute('aria-hidden', 'false');

    
    // Variables para elementos del DOM
    let timerElement;
    let transcriptionElement;
    let questionsElement;

    // Función para limpiar recursos
    const cleanupResources = () => {
        if (window.callTimerInterval) {
            clearInterval(window.callTimerInterval);
            window.callTimerInterval = null;
        }
        if (window.callRecorder && window.callRecorder.state === 'recording') {
            window.callRecorder.stop();
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
    };

    // Configurar eventos del modal
    modalElement.addEventListener('shown.bs.modal', async () => {
        try {
            // Forzar que aria-hidden se elimine correctamente
            setTimeout(() => modalElement.removeAttribute('aria-hidden'), 10);

            // Esperar a que el modal sea visible y que existan los elementos
            let attempts = 0;
            let maxAttempts = 20; // 20 * 100ms = 2 segundos

            while (attempts < maxAttempts) {
                timerElement = document.querySelector('.call-timer');
                transcriptionElement = document.getElementById('transcriptionContainer');
                questionsElement = document.getElementById('scriptQuestionsContainer');

                if (timerElement && transcriptionElement && questionsElement) break;

                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!timerElement || !transcriptionElement || !questionsElement) {
                alert('No se pudo cargar el análisis porque faltan elementos en la pantalla.');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
                return;
            }

            // Iniciar temporizador
            window.callStartTime = new Date();
            window.callTimerInterval = setInterval(() => {
                const now = new Date();
                const elapsed = new Date(now - window.callStartTime);
                const t = document.querySelector('.call-timer');
                if (t) {
                    t.textContent = elapsed.toISOString().substr(11, 8);
                } else {
                    clearInterval(window.callTimerInterval);
                }
            }, 1000);


            // Actualizar en Firestore
            const db = firebase.firestore();
            await db.collection('confirmations').doc(confirmationId).update({
                status: 'en_progreso',
                startedAt: new Date().toISOString(),
                agentName: currentUser.displayName || currentUser.email
            });

            // Cargar preguntas
            const confirmationDoc = await db.collection('confirmations').doc(confirmationId).get();
            const scriptId = confirmationDoc.data().scriptId;
            const scriptDoc = await db.collection('scripts').doc(scriptId).get();

            if (scriptDoc.exists && scriptDoc.data().questions) {
                const questions = scriptDoc.data().questions;
                questionsElement.innerHTML = '';
                renderScriptQuestions(questions, questionsElement);
                attachRealtimeValidationEvents();
                handleQuestionVisibility();
            }

            // Iniciar reconocimiento de voz
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                window.callRecorder = new SpeechRecognition();
                callRecorder.continuous = true;
                callRecorder.interimResults = true;
                callRecorder.lang = 'es-ES';

                callRecorder.onresult = (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        const transcript = result[0].transcript;

                        if (result.isFinal) {
                            finalTranscript += transcript + ' ';
                            processTranscript(transcript);
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    if (transcriptionElement) {
                        transcriptionElement.innerHTML = `
                            <div>${finalTranscript}</div>
                            <div style="color: #6c757d;">${interimTranscript}</div>
                        `;
                        transcriptionElement.scrollTop = transcriptionElement.scrollHeight;
                    }
                };

                callRecorder.start();
            } else {
                transcriptionElement.innerHTML = 'Este navegador no soporta reconocimiento de voz.';
            }

        } catch (error) {
            console.error('Error en análisis de llamada:', error);
            alert('Error en análisis de llamada: ' + error.message);

            if (window.callTimerInterval) clearInterval(window.callTimerInterval);
            if (window.callRecorder?.state === 'recording') window.callRecorder.stop();
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
                mediaStream = null;
            }

            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    });






    modalElement.addEventListener('hidden.bs.modal', () => {
        cleanupResources();
        // Resetear UI
        updateMicrophoneUI(false);
        if (timerElement) timerElement.textContent = '00:00:00';
        modalElement.setAttribute('aria-hidden', 'true');
        loadConfirmations(); // 🔁 Recarga la tabla

    });

    // Mostrar el modal
    modalInstance.show();
};




// Función para detener el análisis (añade esto también)
window.stopCallAnalysis = async function () {
    try {
        const missingQuestions = [];
        const responses = [];

        const questions = document.querySelectorAll('.script-question:not(.d-none)');

        questions.forEach((q, index) => {
            const required = q.dataset.required === "true";
            const questionId = q.id.replace('question_', '');
            const questionText = q.querySelector('h5, h6')?.textContent || `Pregunta ${index + 1}`;
            const response = getQuestionResponse(q);

            // Si es obligatoria y sin respuesta, marcar como error
            if (required && (!response || response.trim() === '')) {
                q.classList.add('border-danger');
                if (!q.querySelector('.error-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'error-msg text-danger small mt-1';
                    msg.textContent = 'Esta pregunta es obligatoria';
                    q.appendChild(msg);
                }
                missingQuestions.push(questionText);
            } else {
                q.classList.remove('border-danger');
                const msg = q.querySelector('.error-msg');
                if (msg) msg.remove();

                // Guardar respuesta si existe
                if (response) {
                    responses.push({
                        questionId,
                        response,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        if (missingQuestions.length > 0) {
            alert(`Debes responder todas las preguntas obligatorias:\n\n- ${missingQuestions.join('\n- ')}`);
            return;
        }

        // Guardar respuestas finales y marcar como confirmada
        if (window.currentConfirmationId) {
            await firebase.firestore()
                .collection('confirmations')
                .doc(window.currentConfirmationId)
                .update({
                    responses,
                    status: 'confirmada',
                    completedAt: new Date().toISOString(),
                    completedBy: currentUser?.uid || null,
                    completedByName: currentUser?.displayName || currentUser?.email
                });
        }

        // Detener temporizador y grabación
        if (window.callTimerInterval) clearInterval(window.callTimerInterval);
        if (window.callRecorder && window.callRecorder.state === 'recording') {
            window.callRecorder.stop();
        }

        // Botón generar reporte
        const reportBtn = document.getElementById('generateReportBtn');
        if (reportBtn) reportBtn.classList.remove('d-none');

        const stopBtn = document.getElementById('stopCallBtn');
        if (stopBtn) stopBtn.disabled = true;

        showAlert('Llamada finalizada y marcada como confirmada.', 'success');
        const allInputs = document.querySelectorAll('#scriptQuestionsContainer input, #scriptQuestionsContainer select, #scriptQuestionsContainer textarea');
        allInputs.forEach(el => el.disabled = true);


    } catch (error) {
        console.error('Error al finalizar llamada:', error);
        showAlert('Error al finalizar llamada: ' + error.message, 'danger');
    }
};

async function initializeStats() {
    try {
        const statsRef = firebase.firestore().collection('stats').doc('confirmations');
        const doc = await statsRef.get();
        
        if (!doc.exists) {
            await statsRef.set({
                confirmed_count: 0,
                rejected_count: 0,
                sin_contacto_count: 0,
                last_updated: new Date().toISOString()
            });
            console.log('Documento de estadísticas inicializado');
        }
        return true;
    } catch (error) {
        console.error('Error inicializando estadísticas:', error);
        return false;
    }
}

async function initializeFirestore() {
    try {
        // Verificar si ya está inicializado
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Inicializar stats si no existen
        await initializeStats();
        return true;
    } catch (error) {
        console.error('Error inicializando Firestore:', error);
        return false;
    }
}


async function initializeFirestore() {
    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        await initializeStats(); // Ahora sí está definida
        return true;
    } catch (error) {
        console.error('Error inicializando Firestore:', error);
        return false;
    }
}


// Asegúrate de que Firebase esté inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Obtén las funciones de Firestore
const db = firebase.firestore();
const { doc, collection, updateDoc, getDoc, addDoc, deleteDoc, query, where, orderBy } = firebase.firestore;


firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // 1. Inicializar Firestore y stats
        const firestoreReady = await initializeFirestore();
        if (!firestoreReady) {
            return showAlert('Error crítico: No se pudo inicializar la base de datos', 'danger');
        }
        
        // 2. Configurar usuario
        currentUser = user;
        document.getElementById('userName').textContent = user.displayName || user.email;
        document.getElementById('navUserName').textContent = user.displayName || user.email;
        
        // 3. Cargar datos
        try {
            await Promise.all([
                loadScripts(),
                loadVerifications(),
                loadConfirmations()
            ]);
            await updateDashboardCounts();
        } catch (error) {
            console.error('Error cargando datos:', error);
            showAlert('Error al cargar datos iniciales', 'warning');
        }
    } else {
        window.location.href = 'index.html';
    }
});


// Inicializar Sortable para preguntas
document.addEventListener('DOMContentLoaded', function() {
    const callModal = document.getElementById('callAnalysisModal');
    
    if (callModal) {
        // Limpieza cuando el modal se oculta
        callModal.addEventListener('hidden.bs.modal', function() {
            console.log('Modal cerrado - limpiando recursos...');
            
            // Detener la grabación si existe
            if (window.voiceRecorder && window.voiceRecorder.isRecording) {
                window.voiceRecorder.stop().catch(e => console.error('Error al detener grabación:', e));
            }
            
            // Detener el stream del micrófono
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Track de micrófono detenido');
                });
                mediaStream = null;
            }
            
            // Limpiar el temporizador
            if (callTimerInterval) {
                clearInterval(callTimerInterval);
                callTimerInterval = null;
                console.log('Temporizador limpiado');
            }
            
            // Resetear la UI - VERIFICAR EXISTENCIA
            updateMicrophoneUI(false);
            const callTimer = document.querySelector('.call-timer');
            if (callTimer) {
                callTimer.textContent = '00:00:00';
            }
            
            // Opcional: Limpiar la transcripción - VERIFICAR EXISTENCIA
            const transcriptionContainer = document.getElementById('transcriptionContainer');
            if (transcriptionContainer) {
                transcriptionContainer.innerHTML = '<p class="text-muted">Iniciando transcripción...</p>';
            }
        });
    }
});

// Iniciar análisis de llamada
async function startVoiceRecognition() {
    try {
        // 1. Detener grabación previa si existe
        if (window.callRecorder) {
            try {
                // Desactivar todos los event listeners primero
                window.callRecorder.onend = null;
                window.callRecorder.onerror = null;
                window.callRecorder.onresult = null;
                
                if (window.callRecorder.state === 'recording') {
                    window.callRecorder.stop();
                }
            } catch (stopError) {
                console.warn('Error al detener grabación previa:', stopError);
            }
            delete window.callRecorder;
        }

        // 2. Verificar compatibilidad del navegador
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new Error('El reconocimiento de voz no está soportado en este navegador');
        }

        // 3. Configurar el reconocimiento de voz
        window.callRecorder = new SpeechRecognition();
        callRecorder.continuous = true;
        callRecorder.interimResults = true;
        callRecorder.lang = 'es-ES';
        
        // 4. Variables de control
        let restartAttempts = 0;
        const MAX_RESTART_ATTEMPTS = 3;
        let isManualStop = false;

        // 5. Configurar manejadores de eventos
        callRecorder.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    processTranscript(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }

            // Actualizar UI
            const transcriptionContainer = document.getElementById('transcriptionContainer');
            if (transcriptionContainer) {
                transcriptionContainer.innerHTML = finalTranscript + 
                    '<span style="color: #6c757d;">' + interimTranscript + '</span>';
                transcriptionContainer.scrollTop = transcriptionContainer.scrollHeight;
            }
        };

        callRecorder.onerror = (event) => {
            console.error('Error en reconocimiento:', {
                error: event.error,
                type: event.type
            });
            
            // No reiniciar automáticamente para errores graves
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }
            
            // Intentar reiniciar después de un breve retraso
            if (restartAttempts < MAX_RESTART_ATTEMPTS && !isManualStop) {
                restartAttempts++;
                setTimeout(() => {
                    if (window.callRecorder && !isManualStop) {
                        console.log(`Reintentando reconocimiento (intento ${restartAttempts})...`);
                        startVoiceRecognition();
                    }
                }, 1000);
            } else {
                showAlert('El reconocimiento de voz tuvo problemas. Por favor reinicia la llamada.', 'warning');
            }
        };

        callRecorder.onend = () => {
            console.log('Reconocimiento finalizado. Estado:', window.callRecorder?.state);
            
            // Solo reiniciar si no fue por un error o stop manual
            if (!isManualStop && window.callRecorder && restartAttempts < MAX_RESTART_ATTEMPTS) {
                // Esperar un momento antes de reiniciar
                setTimeout(() => {
                    if (window.callRecorder && !isManualStop) {
                        try {
                            if (window.callRecorder.state !== 'recording') {
                                console.log('Reiniciando reconocimiento...');
                                window.callRecorder.start();
                            }
                        } catch (startError) {
                            console.error('Error al reiniciar reconocimiento:', startError);
                            if (restartAttempts < MAX_RESTART_ATTEMPTS) {
                                restartAttempts++;
                                startVoiceRecognition();
                            }
                        }
                    }
                }, 300); // Pequeña pausa antes de reiniciar
            }
        };

        // 6. Iniciar grabación
        console.log('Iniciando reconocimiento de voz...');
        callRecorder.start();
        isManualStop = false;
        restartAttempts = 0;
        
        // 7. Actualizar UI
        const coachingTips = document.getElementById('coachingTips');
        if (coachingTips) {
            coachingTips.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-microphone"></i> Micrófono activado
                </div>
            `;
        }

    } catch (error) {
        console.error('Error crítico en startVoiceRecognition:', {
            error: error.message,
            stack: error.stack
        });
        
        // Mostrar alerta al usuario
        const transcriptionContainer = document.getElementById('transcriptionContainer');
        if (transcriptionContainer) {
            transcriptionContainer.innerHTML = `
                <div class="alert alert-danger">
                    Error al iniciar el micrófono: ${error.message}
                </div>
            `;
        }
        
        // Reintentar después de 3 segundos
        setTimeout(() => {
            if (confirm('No se pudo acceder al micrófono. ¿Reintentar?')) {
                startVoiceRecognition();
            }
        }, 3000);
    }
}

// Función para detener el reconocimiento de voz
function stopVoiceRecognition() {
    if (window.callRecorder) {
        try {
            // Marcar como detención manual
            window.isManualStop = true;
            
            // Desactivar el reinicio automático
            window.callRecorder.onend = null;
            
            // Detener solo si está grabando
            if (window.callRecorder.state === 'recording') {
                window.callRecorder.stop();
            }
            
            console.log('Reconocimiento de voz detenido manualmente');
        } catch (error) {
            console.error('Error al detener reconocimiento:', error);
        } finally {
            delete window.callRecorder;
            delete window.isManualStop;
        }
    }
}

function safeSetTextContent(selector, content, isId = true) {
    const element = isId ? document.getElementById(selector) : document.querySelector(selector);
    if (element) {
        element.textContent = content;
        return true;
    } else {
        console.warn(`Elemento ${selector} no encontrado en el DOM`);
        return false;
    }
}

// FUNCIÓN AUXILIAR PARA VERIFICAR ELEMENTOS Y ESTABLECER HTML
function safeSetInnerHTML(selector, content, isId = true) {
    const element = isId ? document.getElementById(selector) : document.querySelector(selector);
    if (element) {
        element.innerHTML = content;
        return true;
    } else {
        console.warn(`Elemento ${selector} no encontrado en el DOM`);
        return false;
    }
}


window.completeConfirmation = async function(confirmationId, status = 'confirmada') {
    // Validación adicional
    if (!confirmationId || !['confirmada', 'rechazada', 'sin_contacto'].includes(status)) {
        console.error("Datos inválidos:", {confirmationId, status});
        return;
    }

    try {
        // Usa firebase.firestore() en lugar de db para mantener consistencia
        await firebase.firestore().collection('confirmations').doc(confirmationId).update({
            status: status,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(), // Corregido aquí
            completedBy: currentUser.uid
        });

        // Actualiza la UI
        await loadConfirmations();
        showAlert(`Estado actualizado a: ${status}`, 'success');
        
    } catch (error) {
        console.error("Error en completeConfirmation:", error);
        showAlert(`Error al actualizar: ${error.message}`, 'danger');
    }
};

// Función auxiliar para calcular duración
function calculateCallDuration() {
    if (!callStartTime) return 0;
    const endTime = new Date();
    return Math.round((endTime - callStartTime) / 1000); // en segundos
}

// Función auxiliar para texto de estado
function getStatusText(status) {
    const statusTexts = {
        'confirmada': 'Confirmada',
        'rechazada': 'Rechazada',
        'sin_contacto': 'Sin contacto',
        'en_progreso': 'En progreso',
        'creado': 'Creada'
    };
    return statusTexts[status] || status;
}

// Función auxiliar para validar preguntas (versión mejorada)
function validateQuestionAnswered(questionElement) {
    if (!questionElement) return false;
    
    const requiredInput = questionElement.querySelector('[required]');
    if (!requiredInput) return true; // Si no es requerido
    
    // Verificar si está visible
    const isVisible = !questionElement.classList.contains('d-none') && 
                     questionElement.offsetParent !== null;
    if (!isVisible) return true;
    
    // Verificar respuesta según tipo de input
    const inputTypes = {
        'radio': () => questionElement.querySelector('input[type="radio"]:checked') !== null,
        'checkbox': () => questionElement.querySelectorAll('input[type="checkbox"]:checked').length > 0,
        'text': () => questionElement.querySelector('input[type="text"]')?.value.trim() !== '',
        'textarea': () => questionElement.querySelector('textarea')?.value.trim() !== '',
        'select': () => questionElement.querySelector('select')?.value !== ''
    };
    
    for (const [type, validator] of Object.entries(inputTypes)) {
        if (questionElement.querySelector(type)) {
            return validator();
        }
    }
    
    return false;
}

// Función auxiliar para calcular duración de llamada
function calculateCallDuration() {
    if (!callStartTime) return 0;
    const endTime = new Date();
    const duration = (endTime - callStartTime) / 1000; // en segundos
    return Math.round(duration);
}

// Función auxiliar para actualizar estadísticas
async function updateConfirmationStats(status) {
    try {
        const statsRef = firebase.firestore()
            .collection('stats')
            .doc('confirmations');
            
        // Primero verifica si el documento existe
        const doc = await statsRef.get();
        
        if (!doc.exists) {
            // Si no existe, créalo con valores iniciales
            await statsRef.set({
                confirmed_count: 0,
                rejected_count: 0,
                sin_contacto_count: 0,
                last_updated: new Date().toISOString()
            });
        }
        
        // Ahora realiza la actualización
        await statsRef.update({
            [`${status}_count`]: firebase.firestore.FieldValue.increment(1),
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating stats:', error);
        // Puedes agregar aquí notificación al usuario si lo deseas
    }
}

// Función auxiliar para mostrar alertas
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '2000';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => alertDiv.remove(), 5000);
}


window.viewConfirmation = async function(confirmationId) {
    try {
        // Obtener datos de la confirmación
        const confirmationDoc = await firebase.firestore()
            .collection('confirmations')
            .doc(confirmationId)
            .get();
            
        if (!confirmationDoc.exists) {
            throw new Error('Confirmación no encontrada');
        }
        
        const confirmation = confirmationDoc.data();
        
        // Obtener el script completo
        const scriptDoc = await firebase.firestore()
            .collection('scripts')
            .doc(confirmation.scriptId)
            .get();
        
        const script = scriptDoc.data();
        
        // Construir HTML del contenido
        let htmlContent = `
            <div class="mb-4">
                <h5>Detalles de la Confirmación</h5>
                <div class="row">
                    <div class="col-md-4">
                        <p><strong>ID Cliente:</strong> ${confirmation.clientId || 'N/A'}</p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Estado:</strong> <span class="badge ${getStatusBadgeClass(confirmation.status)}">${getStatusText(confirmation.status)}</span></p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Fecha:</strong> ${new Date(confirmation.date).toLocaleString()}</p>
                    </div>
                </div>
                <hr>
                <h5 class="mt-4">Script: ${script?.name || 'N/A'}</h5>
                <div class="script-content bg-light p-3 rounded">
        `;
        
        // Agregar preguntas y respuestas
            if (script?.questions && confirmation.responses) {
                script.questions.forEach((question, index) => {
                    const responseObj = confirmation.responses.find(r => r.questionId === question.id);
                    const response = responseObj ? responseObj.response : 'Sin respuesta';
                    htmlContent += `
                        <div class="mb-3 p-2 border-bottom">
                            <p><strong>${index + 1}. ${question.text}</strong></p>
                            <p class="ms-3">${response}</p>
                        </div>
                    `;
                });
}
        
        htmlContent += `
                </div>
                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="copyConfirmationDetails('${confirmationId}')">
                        <i class="fas fa-copy me-2"></i>Copiar todo el contenido
                    </button>
                </div>
            </div>
        `;
        
        // Mostrar en modal
        const modal = new bootstrap.Modal(document.getElementById('confirmationDetailsModal'));
        document.querySelector('#confirmationDetailsModal .modal-body').innerHTML = htmlContent;
        modal.show();
        
    } catch (error) {
        console.error('Error al ver confirmación:', error);
        alert('Error al cargar los detalles: ' + error.message);
    }
};

// Función auxiliar para clases de badge
function getStatusBadgeClass(status) {
    const classes = {
        'creado': 'bg-secondary',
        'en_progreso': 'bg-warning',
        'confirmada': 'bg-success',
        'rechazada': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

// Función para copiar el contenido
window.copyConfirmationDetails = async function(confirmationId) {
    try {
        const modalContent = document.getElementById('confirmationModalBody').innerText;
        await navigator.clipboard.writeText(modalContent);
        
        // Mostrar feedback
        const originalText = event.target.innerHTML;
        event.target.innerHTML = '<i class="fas fa-check me-2"></i>Copiado!';
        
        setTimeout(() => {
            event.target.innerHTML = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Error al copiar:', error);
        alert('No se pudo copiar el contenido');
    }
};

// Función auxiliar para iniciar reconocimiento de voz
async function startVoiceRecognition() {
    try {
        // 1. Detener grabación previa si existe
        if (window.callRecorder) {
            try {
                // Desactivar todos los event listeners primero
                window.callRecorder.onend = null;
                window.callRecorder.onerror = null;
                window.callRecorder.onresult = null;
                
                if (window.callRecorder.state === 'recording') {
                    window.callRecorder.stop();
                }
            } catch (stopError) {
                console.warn('Error al detener grabación previa:', stopError);
            }
            delete window.callRecorder;
        }

        // 2. Verificar compatibilidad del navegador
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new Error('El reconocimiento de voz no está soportado en este navegador');
        }

        // 3. Configurar el reconocimiento de voz
        window.callRecorder = new SpeechRecognition();
        callRecorder.continuous = true;
        callRecorder.interimResults = true;
        callRecorder.lang = 'es-ES';
        
        // 4. Variables de control
        let restartAttempts = 0;
        const MAX_RESTART_ATTEMPTS = 3;
        let isManualStop = false;

        // 5. Configurar manejadores de eventos
        callRecorder.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    processTranscript(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }

            // Actualizar UI - VERIFICAR EXISTENCIA ANTES DE ASIGNAR
            const transcriptionContainer = document.getElementById('transcriptionContainer');
            if (transcriptionContainer) {
                transcriptionContainer.innerHTML = finalTranscript + 
                    '<span style="color: #6c757d;">' + interimTranscript + '</span>';
                transcriptionContainer.scrollTop = transcriptionContainer.scrollHeight;
            } else {
                console.warn('transcriptionContainer no encontrado en el DOM');
            }
        };

        callRecorder.onerror = (event) => {
            console.error('Error en reconocimiento:', {
                error: event.error,
                type: event.type
            });
            
            // No reiniciar automáticamente para errores graves
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }
            
            // Intentar reiniciar después de un breve retraso
            if (restartAttempts < MAX_RESTART_ATTEMPTS && !isManualStop) {
                restartAttempts++;
                setTimeout(() => {
                    if (window.callRecorder && !isManualStop) {
                        console.log(`Reintentando reconocimiento (intento ${restartAttempts})...`);
                        startVoiceRecognition();
                    }
                }, 1000);
            } else {
                showAlert('El reconocimiento de voz tuvo problemas. Por favor reinicia la llamada.', 'warning');
            }
        };

        callRecorder.onend = () => {
            console.log('Reconocimiento finalizado. Estado:', window.callRecorder?.state);
            
            // Solo reiniciar si no fue por un error o stop manual
            if (!isManualStop && window.callRecorder && restartAttempts < MAX_RESTART_ATTEMPTS) {
                // Esperar un momento antes de reiniciar
                setTimeout(() => {
                    if (window.callRecorder && !isManualStop) {
                        try {
                            if (window.callRecorder.state !== 'recording') {
                                console.log('Reiniciando reconocimiento...');
                                window.callRecorder.start();
                            }
                        } catch (startError) {
                            console.error('Error al reiniciar reconocimiento:', startError);
                            if (restartAttempts < MAX_RESTART_ATTEMPTS) {
                                restartAttempts++;
                                startVoiceRecognition();
                            }
                        }
                    }
                }, 300); // Pequeña pausa antes de reiniciar
            }
        };

        // 6. Iniciar grabación
        console.log('Iniciando reconocimiento de voz...');
        callRecorder.start();
        isManualStop = false;
        restartAttempts = 0;
        
        // 7. Actualizar UI - VERIFICAR EXISTENCIA
        const coachingTips = document.getElementById('coachingTips');
        if (coachingTips) {
            coachingTips.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-microphone"></i> Micrófono activado
                </div>
            `;
        } else {
            console.warn('coachingTips no encontrado en el DOM');
        }

    } catch (error) {
        console.error('Error crítico en startVoiceRecognition:', {
            error: error.message,
            stack: error.stack
        });
        
        // Mostrar alerta al usuario - VERIFICAR EXISTENCIA
        const transcriptionContainer = document.getElementById('transcriptionContainer');
        if (transcriptionContainer) {
            transcriptionContainer.innerHTML = `
                <div class="alert alert-danger">
                    Error al iniciar el micrófono: ${error.message}
                </div>
            `;
        } else {
            // Fallback si no existe el contenedor
            console.error('No se pudo mostrar el error: transcriptionContainer no existe');
            alert(`Error al iniciar el micrófono: ${error.message}`);
        }
        
        // Reintentar después de 3 segundos
        setTimeout(() => {
            if (confirm('No se pudo acceder al micrófono. ¿Reintentar?')) {
                startVoiceRecognition();
            }
        }, 3000);
    }
}




// Renderizar preguntas del script
function renderScriptQuestions(questions) {
    const container = document.getElementById('scriptQuestionsContainer');
    if (!container) {
        console.error('Contenedor de preguntas no encontrado');
        return;
    }
    container.innerHTML = '';

    // Ordenar preguntas por su orden definido
    const sortedQuestions = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedQuestions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = `script-question mb-4 p-3 border rounded`;
        questionDiv.id = `question_${question.id}`;
        questionDiv.dataset.questionId = question.id;
        questionDiv.dataset.required = question.required || false;
        questionDiv.dataset.visible = question.visible !== false;
        questionDiv.dataset.conditions = JSON.stringify(question.conditionalLogic || []);

        let responseField = '';
        const inputName = `question_${question.id}`;
        const inputId = `input_${question.id}`;

        switch (question.type) {
            case 'yes_no':
                responseField = `
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="${inputName}" id="${inputId}_yes" value="Sí" 
                               ${question.required ? 'required' : ''}>
                        <label class="form-check-label" for="${inputId}_yes">Sí</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="${inputName}" id="${inputId}_no" value="No">
                        <label class="form-check-label" for="${inputId}_no">No</label>
                    </div>
                `;
                break;

            case 'select':
                responseField = `
                    <select class="form-select" name="${inputName}" id="${inputId}" ${question.required ? 'required' : ''}>
                        <option value="">Seleccione una opción</option>
                        ${question.options?.map(opt => 
                            `<option value="${opt}">${opt}</option>`
                        ).join('') || ''}
                    </select>
                `;
                break;

            case 'multiple':
                responseField = `
                    <div class="form-group">
                        ${question.options?.map(opt => `
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="${inputName}" 
                                       id="${inputId}_${opt.replace(/\s+/g, '_')}" value="${opt}">
                                <label class="form-check-label" for="${inputId}_${opt.replace(/\s+/g, '_')}">${opt}</label>
                            </div>
                        `).join('') || ''}
                    </div>
                `;
                break;

            case 'rating':
                const min = question.min || 1;
                const max = question.max || 5;
                responseField = `
                    <div class="rating-container d-flex justify-content-between">
                        ${Array.from({ length: max - min + 1 }, (_, i) => i + min).map(num => `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="${inputName}" 
                                       id="${inputId}_${num}" value="${num}" ${question.required ? 'required' : ''}>
                                <label class="form-check-label" for="${inputId}_${num}">${num}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'date':
                responseField = `
                    <input type="date" class="form-control answer-input" name="${inputName}" id="${inputId}"
                           ${question.required ? 'required' : ''}>
                `;
                break;

            case 'phone':
                responseField = `
                    <input type="tel" class="form-control answer-input" name="${inputName}" id="${inputId}"
                           pattern="[0-9]{8,15}" ${question.required ? 'required' : ''}>
                `;
                break;

            case 'email':
                responseField = `
                    <input type="email" class="form-control answer-input" name="${inputName}" id="${inputId}"
                           ${question.required ? 'required' : ''}>
                `;
                break;

            default: // text
                responseField = `
                    <input type="text" class="form-control answer-input" name="${inputName}" id="${inputId}"
                           ${question.required ? 'required' : ''}>
                `;
        }

        questionDiv.innerHTML = `
            <h5 class="question-text">${index + 1}. ${question.text}</h5>
            <div class="response-field mt-2">${responseField}</div>
            ${question.required ? '<div class="error-msg" style="display:none;">Esta pregunta es obligatoria</div>' : ''}
        `;

        // Añadir event listeners para cambios en las respuestas
        const inputs = questionDiv.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                if (getQuestionResponse(questionDiv)) {
                    questionDiv.classList.remove('unanswered');
                    const errorMsg = questionDiv.querySelector('.error-msg');
                    if (errorMsg) errorMsg.style.display = 'none';
                }
                handleQuestionVisibility();
            });
        });

        container.appendChild(questionDiv);
    });

    // Inicializar eventos y visibilidad
    attachRealtimeValidationEvents();
    handleQuestionVisibility();
}




// Manejar respuesta a preguntas
function handleQuestionResponse(input) {
    const questionDiv = input.closest('.script-question');
    if (!questionDiv) return;
    
    questionDiv.classList.add('answered');
    const confirmCheckbox = questionDiv.querySelector('.response-confirm input');
    if (confirmCheckbox) confirmCheckbox.checked = true;
    
    // No llamar a handleQuestionVisibility() aquí, se maneja en los event listeners
}

// Actualizar temporizador de llamada
function updateCallTimer() {
    const timerElement = document.querySelector('.call-timer');
    if (!timerElement) return; // Salir si no existe
    
    const now = new Date();
    const elapsed = new Date(now - callStartTime);
    timerElement.textContent = `${String(elapsed.getUTCHours()).padStart(2, '0')}:${String(elapsed.getUTCMinutes()).padStart(2, '0')}:${String(elapsed.getUTCSeconds()).padStart(2, '0')}`;
}

// Procesar transcripción para análisis
function processTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') return;

    const country = document.getElementById('confirmationCountry')?.value || 'GT';
    const coachingTips = document.getElementById('coachingTips');
    if (!coachingTips) return;

    const FILLER_WORDS = {
        GT: ["este", "eh", "bueno", "entonces", "o sea"],
        SV: ["pues", "verdad", "ok", "este", "mmm"],
        HN: ["entonces", "mmm", "ajá", "este", "pues"]
    };
    const COMMON_WORDS = ['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'a', 'un', 'una'];

    const currentFillers = FILLER_WORDS[country] || FILLER_WORDS.GT;
    const words = transcript.toLowerCase().split(/\s+/);
    const timestamp = new Date();

    // 1. Contar muletillas
    let fillerCount = 0;
    const usedFillers = {};
    words.forEach(word => {
        if (currentFillers.includes(word)) {
            fillerCount++;
            usedFillers[word] = (usedFillers[word] || 0) + 1;
        }
    });

    // 2. Mostrar cantidad total y color
    const fillerWordsCountElement = document.getElementById('fillerWordsCount');
    if (fillerWordsCountElement) {
        fillerWordsCountElement.textContent = fillerCount;
        fillerWordsCountElement.className = `badge fs-6 ${fillerCount > 5 ? 'bg-danger' : 'bg-success'}`;
    }

    // 3. Coaching por exceso de muletillas
    Object.entries(usedFillers).forEach(([word, count]) => {
        if (count >= 3) {
            addCoachingTip(`Usas mucho "${word}" (${count} veces). Intenta pausar en lugar de usar muletillas.`, 'warning');
        }
    });

    // 4. Velocidad (palabras por minuto)
    const elapsedMinutes = (timestamp - callStartTime) / (1000 * 60);
    const wordCount = words.length;
    const wordsPerMinute = wordCount / (elapsedMinutes || 1);
    let speedStatus;
    if (wordsPerMinute > 180) {
        speedStatus = { level: 'danger', text: 'Muy rápido' };
    } else if (wordsPerMinute > 140) {
        speedStatus = { level: 'warning', text: 'Rápido' };
    } else if (wordsPerMinute > 100) {
        speedStatus = { level: 'success', text: 'Ideal' };
    } else {
        speedStatus = { level: 'info', text: 'Lento' };
    }

    const speedProgress = document.getElementById('speedProgress');
    const speedFeedback = document.getElementById('speedFeedback');
    if (speedProgress) {
        const pct = Math.min(100, (wordsPerMinute / 180) * 100);
        speedProgress.style.width = `${pct}%`;
        speedProgress.className = `progress-bar bg-${speedStatus.level}`;
        if (speedFeedback) speedFeedback.textContent = speedStatus.text;
    }

    // 5. Tonalidad (simulada con uso de mayúsculas y exclamaciones)
    const isAggressive = /[A-Z]{2,}/.test(transcript) || /!{2,}/.test(transcript);
    const toneScore = isAggressive ? 85 + Math.random() * 10 : 55 + Math.random() * 25;
    const toneProgress = document.getElementById('toneProgress');
    const toneFeedback = document.getElementById('toneFeedback');
    
    if (toneProgress) {
        toneProgress.style.width = `${toneScore}%`;
        if (toneScore > 80) {
            toneProgress.className = 'progress-bar bg-danger';
            if (toneFeedback) toneFeedback.textContent = 'Muy fuerte';
            addCoachingTip('Tu tono suena fuerte o agresivo. Intenta suavizarlo.', 'danger');
        } else if (toneScore > 60) {
            toneProgress.className = 'progress-bar bg-success';
            if (toneFeedback) toneFeedback.textContent = 'Adecuado';
        } else {
            toneProgress.className = 'progress-bar bg-warning';
            if (toneFeedback) toneFeedback.textContent = 'Débil';
            addCoachingTip('Tu tono de voz es bajo. Habla con más energía.', 'warning');
        }
    }

    // 6. Dicción (por variedad de palabras)
    const uniqueWords = [...new Set(words.filter(w => !COMMON_WORDS.includes(w)))];
    const dictionRatio = uniqueWords.length / (wordCount || 1);
    const dictionScore = Math.min(100, Math.max(40, dictionRatio * 100));
    const dictionProgress = document.getElementById('dictionProgress');
    const dictionFeedback = document.getElementById('dictionFeedback');

    voiceAnalysisData.toneHistory.push(toneScore);
    voiceAnalysisData.dictionHistory.push(dictionScore);
    voiceAnalysisData.speedHistory.push(wordsPerMinute);


    if (dictionProgress) {
        dictionProgress.style.width = `${dictionScore}%`;
        if (dictionScore > 85) {
            dictionProgress.className = 'progress-bar bg-success';
            if (dictionFeedback) dictionFeedback.textContent = 'Excelente';
        } else if (dictionScore > 70) {
            dictionProgress.className = 'progress-bar bg-info';
            if (dictionFeedback) dictionFeedback.textContent = 'Buena';
        } else if (dictionScore > 50) {
            dictionProgress.className = 'progress-bar bg-warning';
            if (dictionFeedback) dictionFeedback.textContent = 'Regular';
            addCoachingTip('Tu dicción puede mejorar. Usa más variedad de palabras.', 'warning');
        } else {
            dictionProgress.className = 'progress-bar bg-danger';
            if (dictionFeedback) dictionFeedback.textContent = 'Pobre';
            addCoachingTip('Pronuncia con más claridad y usa palabras más diversas.', 'danger');
        }
    }

    // 7. Palabra más repetida
    const frequencyMap = {};
    words.forEach(word => {
        if (!COMMON_WORDS.includes(word)) {
            frequencyMap[word] = (frequencyMap[word] || 0) + 1;
        }
    });

    const mostRepeated = Object.entries(frequencyMap).sort((a, b) => b[1] - a[1])[0];
    const mostRepeatedElement = document.getElementById('mostRepeatedWord');
    if (mostRepeatedElement) {
        mostRepeatedElement.textContent = mostRepeated
            ? `${mostRepeated[0]} (${mostRepeated[1]}x)`
            : 'Ninguna destacada';
    }

    // 8. Ruido ambiente (palabras cortadas o sonidos repetidos)
    const noiseDetected = transcript.match(/(zzz+|brrr+|...|¿\?|uh|hmm)/gi);
    if (noiseDetected && noiseDetected.length > 2) {
        addCoachingTip('Hay bastante ruido o sonido confuso en el ambiente.', 'info');
    }

    // 9. Almacenar datos para el reporte final
    voiceAnalysisData = {
        ...voiceAnalysisData,
        transcript,
        wordFrequency: frequencyMap,
        fillerWords: fillerCount,
        fillerDetail: usedFillers,
        wordsPerMinute,
        toneScore,
        dictionScore,
        speedScore: wordsPerMinute,
        mostRepeated: mostRepeated?.[0] || '',
        noiseDetected: noiseDetected?.length || 0,
        lastUpdated: timestamp
    };
}


// Funciones auxiliares
function mergeWordFrequencies(existing, newData) {
    const result = {...existing};
    Object.entries(newData).forEach(([word, count]) => {
        result[word] = (result[word] || 0) + count;
    });
    return result;
}

// Actualizar análisis de tonalidad
function updateToneAnalysis(score) {
    const progress = document.getElementById('toneProgress');
    const feedback = document.getElementById('toneFeedback');
    
    progress.style.width = `${score}%`;
    
    if (score > 80) {
        progress.className = 'progress-bar bg-danger';
        feedback.textContent = 'Alto (puede sonar agresivo)';
        addCoachingTip('Intenta bajar el tono de voz', 'danger');
    } else if (score > 60) {
        progress.className = 'progress-bar bg-success';
        feedback.textContent = 'Normal';
    } else {
        progress.className = 'progress-bar bg-warning';
        feedback.textContent = 'Bajo (puede sonar poco seguro)';
        addCoachingTip('Intenta subir un poco el tono de voz', 'warning');
    }
}

// Actualizar análisis de dicción
function updateDictionAnalysis(score) {
    const progress = document.getElementById('dictionProgress');
    const feedback = document.getElementById('dictionFeedback');
    
    progress.style.width = `${score}%`;
    
    if (score > 85) {
        progress.className = 'progress-bar bg-success';
        feedback.textContent = 'Excelente';
    } else if (score > 70) {
        progress.className = 'progress-bar bg-info';
        feedback.textContent = 'Buena';
    } else if (score > 50) {
        progress.className = 'progress-bar bg-warning';
        feedback.textContent = 'Regular';
        addCoachingTip('Pronuncia con más claridad', 'warning');
    } else {
        progress.className = 'progress-bar bg-danger';
        feedback.textContent = 'Mala';
        addCoachingTip('Habla más despacio y pronuncia claramente', 'danger');
    }
}

// Actualizar análisis de velocidad
function updateSpeedAnalysis(score) {
    const progress = document.getElementById('speedProgress');
    const feedback = document.getElementById('speedFeedback');
    
    progress.style.width = `${score}%`;
    
    if (score > 80) {
        progress.className = 'progress-bar bg-danger';
        feedback.textContent = 'Muy rápida';
        addCoachingTip('Habla más despacio para mejor comprensión', 'danger');
    } else if (score > 60) {
        progress.className = 'progress-bar bg-warning';
        feedback.textContent = 'Rápida';
    } else if (score > 40) {
        progress.className = 'progress-bar bg-success';
        feedback.textContent = 'Ideal';
    } else {
        progress.className = 'progress-bar bg-info';
        feedback.textContent = 'Lenta';
        addCoachingTip('Puedes hablar un poco más rápido', 'warning');
    }
}

// Añadir consejo de coaching
function addCoachingTip(tip, type = 'info') {
    const tipsContainer = document.getElementById('coachingTips');
    const tipDiv = document.createElement('div');
    tipDiv.className = `coaching-tip tip-${type} mb-2 p-2 rounded`;
    tipDiv.innerHTML = `
        <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 
                         type === 'warning' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${tip}
    `;
    
    // Limitar a 5 consejos máximo
    if (tipsContainer.children.length >= 5) {
        tipsContainer.removeChild(tipsContainer.children[0]);
    }
    
    tipsContainer.appendChild(tipDiv);
    tipsContainer.scrollTop = tipsContainer.scrollHeight;
}

// Detener análisis de llamada
/**
 * Función para finalizar el análisis de la llamada y desactivar el micrófono
 */
async function stopCallAnalysis() {
    // Validar preguntas obligatorias antes de finalizar
    if (!validateRequiredQuestions()) {
        showAlert('Por favor complete todas las preguntas obligatorias marcadas en rojo antes de finalizar.', 'warning');
        return;
    }

    // Confirmar con el usuario antes de finalizar
    const confirmEnd = await showConfirmDialog(
        '¿Está seguro que desea finalizar la llamada?',
        'Esta acción no se puede deshacer.'
    );
    
    if (!confirmEnd) return;

    try {
        // 1. Detener la grabación y análisis de voz
        if (window.voiceRecorder && window.voiceRecorder.isRecording) {
            await window.voiceRecorder.stop();
        }

        // 2. Detener el stream del micrófono
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
            console.log('Micrófono desactivado correctamente');
        }

        // 3. Detener el temporizador de la llamada
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }

        // 4. Actualizar la UI
        updateMicrophoneUI(false);
        document.getElementById('stopCallBtn').disabled = true;
        document.getElementById('generateReportBtn').classList.remove('d-none');
        
        // 5. Guardar datos de la llamada
        const callData = prepareCallData();
        await saveCallAnalysis(callData);

        // 6. Mostrar confirmación al usuario
        showAlert('Llamada finalizada correctamente. Ahora puede generar el reporte.', 'success');

    } catch (error) {
        console.error('Error al finalizar la llamada:', error);
        showAlert('Ocurrió un error al finalizar la llamada. Por favor intente nuevamente.', 'danger');
    }
}

// Funciones auxiliares utilizadas:

/**
 * Valida las preguntas obligatorias del script
 */
function validateRequiredQuestions() {
    let allValid = true;
    const requiredQuestions = document.querySelectorAll('.script-question[data-required="true"]');
    
    requiredQuestions.forEach(question => {
        const input = question.querySelector('input, select, textarea');
        const answer = input ? input.value.trim() : '';
        
        if (!answer) {
            question.classList.add('missing-required');
            allValid = false;
            
            // Scroll a la primera pregunta faltante
            if (allValid === false) { // Solo la primera vez
                question.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            question.classList.remove('missing-required');
        }
    });
    
    return allValid;
}




/**
 * Prepara los datos de la llamada para guardar
 */
function prepareCallData() {
    return {
        callId: generateCallId(),
        startTime: callStartTime,
        endTime: new Date(),
        duration: document.querySelector('.call-timer').textContent,
        scriptId: currentScriptId,
        clientId: currentClientId,
        answers: collectQuestionAnswers(),
        voiceMetrics: getVoiceMetrics(),
        transcript: getCallTranscript()
    };
}

/**
 * Muestra un diálogo de confirmación
 */
async function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        // Implementación con tu librería de modales preferida
        // Ejemplo con Bootstrap:
        const modal = new bootstrap.Modal(document.getElementById('confirmDialog'));
        document.getElementById('confirmDialogTitle').textContent = title;
        document.getElementById('confirmDialogBody').textContent = message;
        
        document.getElementById('confirmDialogYes').onclick = () => {
            modal.hide();
            resolve(true);
        };
        
        document.getElementById('confirmDialogNo').onclick = () => {
            modal.hide();
            resolve(false);
        };
        
        modal.show();
    });
}



// Función para guardar respuestas temporales
async function saveCurrentResponses() {
    const responses = [];
    const questionElements = document.querySelectorAll('.script-question:not(.d-none)');
    
    questionElements.forEach(q => {
        const questionId = q.id.replace('question_', '');
        const response = getQuestionResponse(q);
        
        if (response) {
            responses.push({
                questionId,
                response,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Guardar en Firestore o en estado local
    if (window.currentConfirmationId) {

    const responses = [];
    const questionElements = document.querySelectorAll('.script-question:not(.d-none)');
    questionElements.forEach(q => {
        const questionId = q.id.replace('question_', '');
        const response = getQuestionResponse(q);
        if (response) {
            responses.push({
                questionId,
                response,
                timestamp: new Date().toISOString()
            });
    }
});

await firebase.firestore()
    .collection('confirmations')
    .doc(window.currentConfirmationId)
    .update({
        responses: responses, // <-- RESPUESTAS FINALES
        status: 'confirmada',
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.uid || null
    });

    }
}


// Función auxiliar para validar respuesta
function validateQuestionAnswered(questionElement) {
    if (!questionElement) return true;

    const requiredInput = questionElement.querySelector('[required]');
    if (!requiredInput) return true;
    
    const isVisible = questionElement.offsetParent !== null;
    if (!isVisible) return true;
    
    const response = getQuestionResponse(questionElement);
    const isValid = response && response.trim() !== '';
    
    if (!isValid) {
        questionElement.classList.add('unanswered');
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (!questionElement.querySelector('.error-msg')) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-msg';
            errorMsg.textContent = 'Esta pregunta es obligatoria';
            questionElement.appendChild(errorMsg);
        }
    } else {
        questionElement.classList.remove('unanswered', 'border-danger');
        const errorMsg = questionElement.querySelector('.error-msg');
        if (errorMsg) errorMsg.remove();
    }
    
    return isValid;
}

// Función para obtener respuesta
function getQuestionResponse(questionElement) {
    if (!questionElement) return null;
    
    const questionId = questionElement.dataset.questionId;
    const inputName = `question_${questionId}`;
    
    // Radio buttons
    const radioChecked = questionElement.querySelector(`input[type="radio"][name="${inputName}"]:checked`);
    if (radioChecked) return radioChecked.value;
    
    // Select
    const selectElement = questionElement.querySelector(`select[name="${inputName}"]`);
    if (selectElement && selectElement.value) return selectElement.value;
    
    // Checkboxes
    const checkboxes = questionElement.querySelectorAll(`input[type="checkbox"][name="${inputName}"]:checked`);
    if (checkboxes.length > 0) {
        return Array.from(checkboxes).map(cb => cb.value).join(', ');
    }
    
    // Inputs de texto
    const textInput = questionElement.querySelector(`input[type="text"][name="${inputName}"], 
                                                   input[type="email"][name="${inputName}"],
                                                   input[type="tel"][name="${inputName}"],
                                                   input[type="date"][name="${inputName}"],
                                                   textarea[name="${inputName}"]`);
    if (textInput && textInput.value.trim() !== '') {
        return textInput.value.trim();
    }
    
    return null;
}





/**
 * Evalúa si una respuesta cumple con una condición específica
 * @param {string} response - Respuesta del usuario
 * @param {object} condition - Objeto de condición a evaluar
 * @returns {boolean} - True si la condición se cumple, false si no
 */


// Función auxiliar para verificar si un valor es numérico
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

// Función mejorada para manejar visibilidad de preguntas
function handleQuestionVisibility() {
    const allQuestions = Array.from(document.querySelectorAll('.script-question'));
    const responses = {};
    
    // Recolectar respuestas actuales
    allQuestions.forEach(q => {
        const questionId = q.dataset.questionId;
        responses[questionId] = getQuestionResponse(q);
    });

    // Evaluar cada pregunta
    allQuestions.forEach(currentQuestion => {
        const questionId = currentQuestion.dataset.questionId;
        const conditions = JSON.parse(currentQuestion.dataset.conditions || '[]');
        let shouldShow = currentQuestion.dataset.visible === 'true';

        // Evaluar condiciones
        if (conditions.length > 0) {
            shouldShow = conditions.some(condition => {
                const targetResponse = responses[condition.targetQuestion];
                const conditionMet = evaluateCondition(targetResponse, condition);
                return conditionMet && condition.action === 'show';
            }) || (conditions.length === 0 && currentQuestion.dataset.visible === 'true');
        }

        // Aplicar visibilidad
        currentQuestion.classList.toggle('d-none', !shouldShow);
        currentQuestion.style.display = shouldShow ? '' : 'none';
        
        // Actualizar estilo basado en respuesta
        if (shouldShow) {
            const hasAnswer = getQuestionResponse(currentQuestion) !== null;
            updateQuestionStyle(currentQuestion, currentQuestion.dataset.required === 'true', hasAnswer);
        }
    });
}


// Función auxiliar para evaluar condiciones
function evaluateCondition(response, condition) {
    if (!condition || !condition.operator) return false;
    if (response === undefined || response === null) return false;
    
    const respStr = String(response).trim().toLowerCase();
    const condStr = String(condition.value).trim().toLowerCase();
    
    switch (condition.operator) {
        case 'equals': return respStr === condStr;
        case 'not_equals': return respStr !== condStr;
        case 'contains': return respStr.includes(condStr);
        case 'not_contains': return !respStr.includes(condStr);
        case 'greater': 
            return !isNaN(respStr) && !isNaN(condStr) && parseFloat(respStr) > parseFloat(condStr);
        case 'greater_or_equal':
            return !isNaN(respStr) && !isNaN(condStr) && parseFloat(respStr) >= parseFloat(condStr);
        case 'less':
            return !isNaN(respStr) && !isNaN(condStr) && parseFloat(respStr) < parseFloat(condStr);
        case 'less_or_equal':
            return !isNaN(respStr) && !isNaN(condStr) && parseFloat(respStr) <= parseFloat(condStr);
        default: return false;
    }
}


// Función para resetear preguntas cuando se ocultan
function resetQuestionState(questionElement) {
    const inputs = questionElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    questionElement.classList.remove('answered', 'border-danger');
    const errorMsg = questionElement.querySelector('.error-msg');
    if (errorMsg) errorMsg.remove();
}


// Función para obtener la respuesta de una pregunta
function getQuestionResponse(questionElement) {
    const radioSelected = questionElement.querySelector('input[type="radio"]:checked');
    const textInput = questionElement.querySelector('input[type="text"], textarea');
    const checkboxInputs = questionElement.querySelectorAll('input[type="checkbox"]:checked');
    const selectInput = questionElement.querySelector('select');
    
    if (radioSelected) return radioSelected.value;
    if (textInput && textInput.value.trim() !== '') return textInput.value.trim();
    if (checkboxInputs.length > 0) {
        return Array.from(checkboxInputs).map(cb => cb.value).join(', ');
    }
    if (selectInput && selectInput.value !== '') return selectInput.value;
    
    return '';
}




// Generar reporte de llamada
window.generateCallReport = function () {
    const modalBody = document.getElementById('callAnalysisModal').querySelector('.modal-body');
    if (!modalBody || !voiceAnalysisData) return;

    const {
        toneHistory = [],
        dictionHistory = [],
        speedHistory = [],
        fillerWords = 0
    } = voiceAnalysisData;

    const avgTone = toneHistory.length ? toneHistory.reduce((a, b) => a + b, 0) / toneHistory.length : 0;
    const avgDiction = dictionHistory.length ? dictionHistory.reduce((a, b) => a + b, 0) / dictionHistory.length : 0;
    const avgSpeed = speedHistory.length ? speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length : 0;

    const overallScore = Math.round((
        avgTone * 0.2 +
        avgDiction * 0.4 +
        avgSpeed * 0.2 +
        (100 - Math.min(fillerWords * 5, 100)) * 0.2
    ) * 100) / 100;

    const reportHtml = `
        <h4>Reporte de Llamada</h4>
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header">Resumen de Métricas</div>
                    <div class="card-body">
                        <div class="mb-3 text-center">
                            <h5>Puntuación General</h5>
                            <div class="score-circle mx-auto" style="width: 120px; height: 120px; 
                                background: conic-gradient(#4CAF50 0% ${overallScore}%, #f0f0f0 ${overallScore}% 100%);
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <div style="background: white; width: 80px; height: 80px; border-radius: 50%; 
                                    display: flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 1.5rem; font-weight: bold;">${isNaN(overallScore) ? '0' : overallScore}</span>
                                </div>
                            </div>
                        </div>
                        <table class="table">
                            <tr><td>Tonalidad promedio:</td><td>${avgTone.toFixed(1)}%</td></tr>
                            <tr><td>Dicción promedio:</td><td>${avgDiction.toFixed(1)}%</td></tr>
                            <tr><td>Velocidad promedio:</td><td>${avgSpeed.toFixed(1)}%</td></tr>
                            <tr><td>Muletillas detectadas:</td><td>${fillerWords}</td></tr>
                            <tr><td>Palabra más repetida:</td><td>${document.getElementById('mostRepeatedWord')?.textContent || 'No disponible'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Recomendaciones</div>
                    <div class="card-body" id="finalCoachingTips">
                        ${document.getElementById('coachingTips')?.innerHTML || '<p>Sin sugerencias registradas.</p>'}
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <button class="btn btn-primary" onclick="printReport()"><i class="fas fa-print me-2"></i>Imprimir Reporte</button>
            <button class="btn btn-success ms-2" onclick="saveCallReport()"><i class="fas fa-save me-2"></i>Guardar Reporte</button>
        </div>
    `;

    modalBody.innerHTML = reportHtml;

        // Cerrar automáticamente el modal después de 10 segundos
    setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('callAnalysisModal'));
        if (modal) {
            modal.hide();
        }
    }, 600000); // 10000 = 10 segundos

};


// Función para imprimir reporte
window.printReport = function() {
    window.print();
};

// Función para guardar reporte
window.saveCallReport = async function() {
    try {
        // Aquí implementarías la lógica para guardar el reporte en tu base de datos
        alert('Reporte guardado exitosamente');
    } catch (error) {
        console.error('Error saving report:', error);
        alert('Error al guardar el reporte');
    }
};

// Load scripts
async function loadScripts() {
    try {
        const q = firebase.firestore().collection('scripts').orderBy('createdAt', 'desc');
        const querySnapshot = await q.get();
        const scriptsList = document.getElementById('scriptsList');
        scriptsList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const script = doc.data();
            const scriptCard = createScriptCard(doc.id, script);
            scriptsList.appendChild(scriptCard);
            
            if (script.active) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = script.name;
                option.setAttribute('data-country', script.country);
                document.getElementById('confirmationScript').appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
}

window.filterScriptsByCountry = async function(country) {
    const scriptDropdown = document.getElementById('confirmationScript');
    scriptDropdown.innerHTML = '<option value="">Cargando scripts...</option>';
    
    if (!country) {
        scriptDropdown.innerHTML = '<option value="">Seleccione un país primero</option>';
        scriptDropdown.disabled = true;
        return;
    }

    try {
        scriptDropdown.disabled = true;
        
        // Usa la sintaxis de compatibilidad (v8)
        const querySnapshot = await firebase.firestore().collection('scripts')
            .where('country', '==', country)
            .where('active', '==', true)
            .orderBy('name')
            .get();
        
        scriptDropdown.innerHTML = '';
        
        if (querySnapshot.empty) {
            scriptDropdown.innerHTML = '<option value="">No hay scripts activos</option>';
        } else {
            scriptDropdown.appendChild(new Option('Seleccione un script', ''));
            querySnapshot.forEach(doc => {
                const script = doc.data();
                scriptDropdown.appendChild(new Option(script.name, doc.id));
            });
        }
    } catch (error) {
        console.error('Error al filtrar scripts:', error);
        scriptDropdown.innerHTML = '<option value="">Error al cargar</option>';
    } finally {
        scriptDropdown.disabled = false;
    }
};

// Create script card
function createScriptCard(id, script) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const countryFlag = {
        'GT': '🇬🇹',
        'SV': '🇸🇻',
        'HN': '🇭🇳'
    };
    
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">${script.name}</h6>
                <span class="badge ${script.active ? 'bg-success' : 'bg-secondary'}">
                    ${script.active ? 'Activo' : 'Inactivo'}
                </span>
            </div>
            <div class="card-body">
                <p class="card-text">${script.description || 'Sin descripción'}</p>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-flag me-1"></i>${countryFlag[script.country]} ${script.country}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-tags me-1"></i>${script.category}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-question-circle me-1"></i>${script.questions?.length || 0} preguntas
                    </small>
                </div>
                ${script.randomOrder ? '<div class="mb-2"><small class="text-warning"><i class="fas fa-random me-1"></i>Orden aleatorio</small></div>' : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary btn-sm me-2" onclick="editScript('${id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-success btn-sm me-2" onclick="cloneScript('${id}')">
                    <i class="fas fa-copy"></i> Clonar
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteScript('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    return col;
}

// Load verifications
async function loadVerifications(filter = 'all') {
    try {
        const verificationsContainer = document.getElementById('verificationsContainer');
        verificationsContainer.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted mb-3"></i><p>Cargando verificaciones...</p></div>';
        
        let q;
        if (filter === 'pending') {
            q = firebase.firestore().collection('verifications').where('status', '==', 'pending');
        } else if (filter === 'verified') {
            q = firebase.firestore().collection('verifications').where('status', '==', 'verified');
        } else if (filter === 'rejected') {
            q = firebase.firestore().collection('verifications').where('status', '==', 'rejected');
        } else {
            q = firebase.firestore().collection('verifications');
        }
        
        const querySnapshot = await q.get();
        verificationsContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            verificationsContainer.innerHTML = '<div class="text-center py-5"><i class="fas fa-info-circle fa-2x text-muted mb-3"></i><p>No hay verificaciones para mostrar</p></div>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const verification = doc.data();
            const verificationItem = createVerificationItem(doc.id, verification);
            verificationsContainer.appendChild(verificationItem);
        });
    } catch (error) {
        console.error('Error loading verifications:', error);
        document.getElementById('verificationsContainer').innerHTML = '<div class="alert alert-danger">Error al cargar las verificaciones</div>';
    }
}

// Create verification item
function createVerificationItem(id, verification) {
    const item = document.createElement('div');
    item.className = 'verification-item';
    
    let statusClass = '';
    let statusIcon = '';
    if (verification.status === 'verified') {
        statusClass = 'status-verified';
        statusIcon = 'fa-check';
    } else if (verification.status === 'rejected') {
        statusClass = 'status-rejected';
        statusIcon = 'fa-times';
    } else {
        statusClass = 'status-pending';
        statusIcon = 'fa-clock';
    }
    
    item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">${verification.clientName || 'Cliente sin nombre'}</h5>
            <div>
                <span class="badge bg-light text-dark me-2">
                    <i class="fas fa-calendar-alt me-1"></i>
                    ${new Date(verification.date).toLocaleDateString()}
                </span>
                <span class="verification-status ${statusClass}" onclick="changeVerificationStatus('${id}', '${verification.status}')">
                    <i class="fas ${statusIcon}"></i>
                </span>
            </div>
        </div>
        <div class="verification-field">
            <div class="verification-label">Tipo de Verificación:</div>
            <div class="verification-value">${verification.type || 'No especificado'}</div>
        </div>
        <div class="verification-field">
            <div class="verification-label">Responsable:</div>
            <div class="verification-value">${verification.agent || 'No asignado'}</div>
        </div>
        <div class="verification-field">
            <div class="verification-label">Resultado:</div>
            <div class="verification-value">${verification.result || 'Sin resultado'}</div>
        </div>
        <div class="mt-3">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="viewVerificationDetails('${id}')">
                <i class="fas fa-eye me-1"></i>Detalles
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="editVerification('${id}')">
                <i class="fas fa-edit me-1"></i>Editar
            </button>
        </div>
    `;
    
    return item;
}

// Load confirmations
async function loadConfirmations() {
    try {
        const tableBody = document.getElementById('confirmationsTable');
        tableBody.innerHTML = '';

        const searchTerm = document.getElementById('confirmationsSearch')?.value.toLowerCase() || '';
        const filterEstado = document.getElementById('filterEstado')?.value || '';
        const filterAnalista = document.getElementById('filterAnalista')?.value.toLowerCase() || '';
        const filterPais = document.getElementById('filterPais')?.value || '';
        const fechaInicio = document.getElementById('filterFechaInicio')?.value;
        const fechaFin = document.getElementById('filterFechaFin')?.value;

        let query = firebase.firestore().collection('confirmations').orderBy('date', 'desc');
        const snapshot = await query.get();

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No hay confirmaciones registradas</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const confirmation = doc.data();
            const id = doc.id;

            // Comparación por rango de fechas
            const date = confirmation.date ? confirmation.date.substring(0, 10) : '';
            const fechaMatch =
                (!fechaInicio || date >= fechaInicio) &&
                (!fechaFin || date <= fechaFin);

            const estadoMatch = !filterEstado || confirmation.status === filterEstado;
            const analistaMatch = !filterAnalista || (confirmation.createdByName || '').toLowerCase().includes(filterAnalista);
            const paisMatch = !filterPais || confirmation.country === filterPais;

            const searchMatch =
                id.toLowerCase().includes(searchTerm) ||
                (confirmation.clientId || '').toLowerCase().includes(searchTerm);

            if (fechaMatch && estadoMatch && analistaMatch && paisMatch && searchMatch) {
                const row = createConfirmationRow(id, confirmation);
                tableBody.appendChild(row);
            }
        });

    } catch (error) {
        console.error('Error loading confirmations:', error);
        const tableBody = document.getElementById('confirmationsTable');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error al cargar confirmaciones</td></tr>';
    }
}




// Create confirmation row
function createConfirmationRow(id, confirmation) {
    const row = document.createElement('tr');
    const clientNumber = confirmation.clientId.replace('Cliente ', '');
    
    const statusClasses = {
        'creado': 'bg-secondary',
        'en_progreso': 'bg-warning',
        'confirmada': 'bg-success'
    };

    // Botones según estado
    let actionButtons = '';
    if (confirmation.status === 'creado') {
        actionButtons = `
            <button class="btn btn-sm btn-outline-success" onclick="startCallAnalysis('${id}')">
                <i class="fas fa-phone"></i>
            </button>
        `;
        } else if (confirmation.status === 'en_progreso') {
                actionButtons = `
                    <button class="btn btn-sm btn-success" onclick="completeConfirmation('${id}', 'confirmada')">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                `;
        } else if (confirmation.status === 'confirmada') {
            actionButtons = `
                <button class="btn btn-sm btn-outline-primary me-2" onclick="viewConfirmation('${id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="viewCallMetrics('${id}')">
                    <i class="fas fa-chart-line"></i>
                </button>
            `;
        }





    row.innerHTML = `
        <td>${id.substring(0, 8)}</td>
        <td>${clientNumber}</td>
        <td>${confirmation.scriptName || 'N/A'}</td>
        <td><span class="badge ${statusClasses[confirmation.status]}">${getStatusText(confirmation.status)}</span></td>
        <td>${confirmation.country || 'N/A'}</td>
        <td>${confirmation.createdByName || 'N/A'}</td>
        <td>${new Date(confirmation.date).toLocaleString()}</td>
        <td>${actionButtons}</td>
    `;
    return row;
}

// Update dashboard counts
async function updateDashboardCounts() {
    try {
        // Confirmaciones de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const q = firebase.firestore()
            .collection('confirmations')
            .where('date', '>=', today.toISOString())
            .where('status', '==', 'confirmada');
        
        const snapshot = await q.get();
        document.getElementById('confirmationsToday').textContent = snapshot.size;
        
    } catch (error) {
        console.error('Error actualizando dashboard:', error);
    }
}

window.showCreateScriptModal = function() {
    currentEditingScript = null;
    document.getElementById('scriptModalTitle').textContent = 'Nuevo Script';
    document.getElementById('scriptForm').reset();
    document.getElementById('questionsList').innerHTML = '';
    questionCounter = 0;
    
    const modal = new bootstrap.Modal(document.getElementById('scriptModal'));
    modal.show();
};

window.addQuestion = function() {
    questionCounter++;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item border rounded p-3 mb-3';
    questionDiv.setAttribute('data-question-id', questionCounter);
    
    questionDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Pregunta #${questionCounter}</h6>
            <div>
                <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="moveQuestion(${questionCounter}, 'up')">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="moveQuestion(${questionCounter}, 'down')">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeQuestion(${questionCounter})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="mb-3">
                    <label class="form-label">Texto de la pregunta</label>
                    <input type="text" class="form-control question-text" required>
                </div>
            </div>
            <div class="col-md-4">
                <div class="mb-3">
                    <label class="form-label">Tipo de respuesta</label>
                    <select class="form-control response-type" onchange="updateResponseOptions(${questionCounter})">
                        <option value="text">Texto libre</option>
                        <option value="select">Selección única</option>
                        <option value="multiple">Selección múltiple</option>
                        <option value="yes_no">Sí/No</option>
                        <option value="rating">Calificación (1-5)</option>
                        <option value="date">Fecha</option>
                        <option value="phone">Teléfono</option>
                        <option value="email">Email</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="response-options-container" id="responseOptions${questionCounter}">
            <!-- Response options will be added here -->
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input question-required" type="checkbox" checked>
                    <label class="form-check-label">Pregunta obligatoria</label>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input question-visible" type="checkbox" checked>
                    <label class="form-check-label">Visible por defecto</label>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <label class="form-label">Lógica condicional (Basada en respuestas)</label>
            <div class="conditional-logic-container" id="conditionalLogic${questionCounter}">
                <button type="button" class="btn btn-sm btn-outline-info" onclick="addConditionalLogic(${questionCounter})">
                    <i class="fas fa-plus me-1"></i>Agregar condición
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('questionsList').appendChild(questionDiv);
    updateResponseOptions(questionCounter);
};

window.updateResponseOptions = function(questionId) {
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    if (!questionDiv) return;
    
    const responseType = questionDiv.querySelector('.response-type').value;
    const container = document.getElementById(`responseOptions${questionId}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (responseType === 'select' || responseType === 'multiple' || responseType === 'yes_no') {
        let options = [];
        
        if (responseType === 'yes_no') {
            options = ['Sí', 'No'];
        } else {
            options = ['Opción 1', 'Opción 2'];
        }
        
        container.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Opciones de respuesta</label>
                <div class="options-list" id="optionsList${questionId}">
                    ${options.map((opt, i) => `
                        <div class="input-group mb-2">
                            <input type="text" class="form-control option-text" value="${opt}">
                            <button type="button" class="btn btn-outline-danger" onclick="removeOption(this)">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-sm btn-outline-success" onclick="addOption(${questionId})">
                    <i class="fas fa-plus me-1"></i>Agregar opción
                </button>
            </div>
        `;
    } else if (responseType === 'rating') {
        container.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Configuración de calificación</label>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Mínimo</label>
                        <input type="number" class="form-control" value="1" min="1" max="10">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Máximo</label>
                        <input type="number" class="form-control" value="5" min="2" max="10">
                    </div>
                </div>
            </div>
        `;
    }
};

window.addOption = function(questionId) {
    const optionsList = document.getElementById(`optionsList${questionId}`);
    const optionCount = optionsList.children.length + 1;
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'input-group mb-2';
    optionDiv.innerHTML = `
        <input type="text" class="form-control option-text" placeholder="Opción ${optionCount}">
        <button type="button" class="btn btn-outline-danger" onclick="removeOption(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    optionsList.appendChild(optionDiv);
};

window.removeOption = function(button) {
    button.closest('.input-group').remove();
};

window.removeQuestion = function(questionId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
        document.querySelector(`[data-question-id="${questionId}"]`).remove();
    }
};

window.moveQuestion = function(questionId, direction) {
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    const container = document.getElementById('questionsList');
    
    if (direction === 'up' && questionDiv.previousElementSibling) {
        container.insertBefore(questionDiv, questionDiv.previousElementSibling);
    } else if (direction === 'down' && questionDiv.nextElementSibling) {
        container.insertBefore(questionDiv.nextElementSibling, questionDiv);
    }
};

window.addConditionalLogic = function(questionId) {
    const container = document.getElementById(`conditionalLogic${questionId}`);
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'conditional-rule border-start border-info ps-3 mt-2';
    
    conditionDiv.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <select class="form-control condition-question">
                    <option value="">Si la respuesta a...</option>
                    <!-- Will be populated with other questions -->
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-control condition-operator">
                    <option value="equals">es igual a</option>
                    <option value="not_equals">no es igual a</option>
                    <option value="contains">contiene</option>
                    <option value="not_contains">no contiene</option>
                    <option value="greater">es mayor a</option>
                    <option value="less">es menor a</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control condition-value" placeholder="Valor esperado">
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeCondition(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-6">
                <select class="form-control condition-action">
                    <option value="next">Ir a la siguiente pregunta</option>
                    <option value="specific">Ir a pregunta específica</option>
                    <option value="end">Finalizar script</option>
                    <option value="show">Mostrar esta pregunta</option>
                    <option value="hide">Ocultar esta pregunta</option>
                </select>
            </div>
            <div class="col-md-6" id="actionSpecificContainer" style="display: none;">
                <select class="form-control condition-specific-question">
                    <option value="">Seleccionar pregunta</option>
                    <!-- Will be populated with other questions -->
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(conditionDiv);
    
    // Populate question dropdowns
    populateQuestionDropdowns();
    
    // Show/hide specific question dropdown based on action
    conditionDiv.querySelector('.condition-action').addEventListener('change', function() {
        const specificContainer = conditionDiv.querySelector('#actionSpecificContainer');
        specificContainer.style.display = this.value === 'specific' ? 'block' : 'none';
    });
};

function populateQuestionDropdowns() {
    const questionDropdowns = document.querySelectorAll('.condition-question, .condition-specific-question');
    const questions = document.querySelectorAll('.question-item');
    
    questionDropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = dropdown.classList.contains('condition-question') 
            ? '<option value="">Si la respuesta a...</option>'
            : '<option value="">Seleccionar pregunta</option>';
        
        questions.forEach(question => {
            const questionId = question.getAttribute('data-question-id');
            const questionText = question.querySelector('.question-text').value || `Pregunta ${questionId}`;
            
            const option = document.createElement('option');
            option.value = questionId;
            option.textContent = questionText;
            dropdown.appendChild(option);
        });
        
        // Restore previous value if it still exists
        if (currentValue && Array.from(dropdown.options).some(opt => opt.value === currentValue)) {
            dropdown.value = currentValue;
        }
    });
}

window.removeCondition = function(button) {
    button.closest('.conditional-rule').remove();
};

window.toggleFlowView = function() {
    const flowVisualizer = document.getElementById('flowVisualizer');
    const questionsList = document.getElementById('questionsList');
    
    if (flowVisualizer.style.display === 'none') {
        // Switching to flow view
        questionsList.style.display = 'none';
        flowVisualizer.style.display = 'block';
        renderFlowView();
    } else {
        // Switching back to list view
        questionsList.style.display = 'block';
        flowVisualizer.style.display = 'none';
    }
};

function renderFlowView() {
    const flowVisualizer = document.getElementById('flowVisualizer');
    flowVisualizer.innerHTML = `
        <div class="flow-controls">
            <button class="btn btn-sm btn-outline-secondary" onclick="zoomFlow(0.1)">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="zoomFlow(-0.1)">
                <i class="fas fa-search-minus"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="centerFlow()">
                <i class="fas fa-expand"></i>
            </button>
        </div>
        <div class="flow-toolbar">
            <button class="btn btn-sm btn-primary me-2" onclick="saveFlow()">
                <i class="fas fa-save me-1"></i>Guardar Flujo
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="toggleFlowView()">
                <i class="fas fa-times me-1"></i>Salir
            </button>
        </div>
    `;
    
    const flowContainer = document.createElement('div');
    flowContainer.style.width = '100%';
    flowContainer.style.height = '100%';
    flowContainer.style.position = 'relative';
    flowContainer.style.overflow = 'hidden';
    flowContainer.style.transform = `scale(${flowZoom}) translate(${flowOffset.x}px, ${flowOffset.y}px)`;
    flowContainer.style.transformOrigin = '0 0';
    flowContainer.id = 'flowContainer';
    
    // Add event listeners for panning
    flowContainer.addEventListener('mousedown', startPan);
    flowContainer.addEventListener('mousemove', pan);
    flowContainer.addEventListener('mouseup', endPan);
    flowContainer.addEventListener('mouseleave', endPan);
    
    flowVisualizer.appendChild(flowContainer);
    
    // Create flow nodes from questions
    const questions = document.querySelectorAll('.question-item');
    flowNodes = [];
    flowConnections = [];
    
    questions.forEach((question, index) => {
        const questionId = question.getAttribute('data-question-id');
        const questionText = question.querySelector('.question-text').value || `Pregunta ${questionId}`;
        
        const node = createFlowNode(questionId, questionText, index * 300, 100);
        flowContainer.appendChild(node.element);
        flowNodes.push(node);
        
        // Add connections based on conditional logic
        const conditions = question.querySelectorAll('.conditional-rule');
        conditions.forEach(cond => {
            const action = cond.querySelector('.condition-action').value;
            const targetQuestion = cond.querySelector('.condition-specific-question')?.value;
            
            if (action === 'specific' && targetQuestion) {
                const connection = createFlowConnection(questionId, targetQuestion);
                flowConnections.push(connection);
                flowContainer.appendChild(connection.element);
            }
        });
    });
    
    // Add start and end nodes
    const startNode = createFlowNode('start', 'Inicio', 50, 50, 'action');
    const endNode = createFlowNode('end', 'Fin', questions.length * 300 - 100, 50, 'end');
    
    flowContainer.appendChild(startNode.element);
    flowContainer.appendChild(endNode.element);
    flowNodes.push(startNode, endNode);
    
    // Connect start to first question
    if (questions.length > 0) {
        const firstQuestionId = questions[0].getAttribute('data-question-id');
        const connection = createFlowConnection('start', firstQuestionId);
        flowConnections.push(connection);
        flowContainer.appendChild(connection.element);
    }
}

function createFlowNode(id, text, x, y, type = 'question') {
    const node = document.createElement('div');
    node.className = `flow-node ${type === 'question' ? 'question' : type === 'end' ? 'flow-node-end' : 'action'}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.setAttribute('data-node-id', id);
    
    node.innerHTML = `
        <div class="node-handle node-handle-in"></div>
        <div class="node-handle node-handle-out"></div>
        <h6>${text}</h6>
        ${type === 'question' ? `
        <div class="node-options">
            ${getQuestionOptions(id).map(opt => `
                <div class="node-option">
                    <div class="node-option-color" style="background: ${opt.color}"></div>
                    <span>${opt.text}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;
    
    // Make node draggable
    node.draggable = true;
    node.addEventListener('dragstart', dragNodeStart);
    node.addEventListener('dragend', dragNodeEnd);
    
    // Add connection handlers
    const handleIn = node.querySelector('.node-handle-in');
    const handleOut = node.querySelector('.node-handle-out');
    
    handleIn.addEventListener('mousedown', (e) => startConnection(e, id, 'in'));
    handleOut.addEventListener('mousedown', (e) => startConnection(e, id, 'out'));
    
    return {
        id,
        element: node,
        x,
        y,
        type
    };
}

function getQuestionOptions(questionId) {
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    if (!questionDiv) return [];
    
    const responseType = questionDiv.querySelector('.response-type').value;
    
    if (responseType === 'yes_no') {
        return [
            { text: 'Sí', color: '#10b981' },
            { text: 'No', color: '#ef4444' }
        ];
    } else if (responseType === 'select' || responseType === 'multiple') {
        const options = [];
        const optionInputs = questionDiv.querySelectorAll('.option-text');
        
        optionInputs.forEach((input, index) => {
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
            options.push({
                text: input.value || `Opción ${index + 1}`,
                color: colors[index % colors.length]
            });
        });
        
        return options;
    }
    
    return [{ text: 'Respuesta', color: '#3b82f6' }];
}

function createFlowConnection(fromId, toId) {
    const fromNode = flowNodes.find(n => n.id === fromId);
    const toNode = flowNodes.find(n => n.id === toId);
    
    if (!fromNode || !toNode) return null;
    
    // Calculate positions
    const x1 = fromNode.x + 180;
    const y1 = fromNode.y + 40;
    const x2 = toNode.x;
    const y2 = toNode.y + 40;
    
    // Calculate length and angle
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    // Create connection line
    const line = document.createElement('div');
    line.className = 'flow-connector';
    line.style.width = `${length}px`;
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.transform = `rotate(${angle}deg)`;
    
    // Create arrow head
    const arrow = document.createElement('div');
    arrow.className = 'flow-connector-arrow';
    arrow.style.left = `${x2 - 5}px`;
    arrow.style.top = `${y2 - 5}px`;
    
    return {
        from: fromId,
        to: toId,
        element: line,
        arrow: arrow
    };
}

function startConnection(e, nodeId, direction) {
    e.stopPropagation();
    isCreatingConnection = true;
    connectionStart = { nodeId, direction };
}

function dragNodeStart(e) {
    e.dataTransfer.setData('text/plain', this.getAttribute('data-node-id'));
    this.classList.add('dragging');
}

function dragNodeEnd(e) {
    this.classList.remove('dragging');
}

function startPan(e) {
    if (e.target.closest('.node-handle')) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
}

function pan(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    flowOffset.x += dx / flowZoom;
    flowOffset.y += dy / flowZoom;
    
    document.getElementById('flowContainer').style.transform = 
        `scale(${flowZoom}) translate(${flowOffset.x}px, ${flowOffset.y}px)`;
    
    dragStart = { x: e.clientX, y: e.clientY };
}

function endPan() {
    isDragging = false;
}

window.zoomFlow = function(amount) {
    flowZoom = Math.min(Math.max(0.5, flowZoom + amount), 2);
    document.getElementById('flowContainer').style.transform = 
        `scale(${flowZoom}) translate(${flowOffset.x}px, ${flowOffset.y}px)`;
};

window.centerFlow = function() {
    flowZoom = 1;
    flowOffset = { x: 0, y: 0 };
    document.getElementById('flowContainer').style.transform = 
        `scale(${flowZoom}) translate(${flowOffset.x}px, ${flowOffset.y}px)`;
};

window.saveFlow = function() {
    // This would save the flow connections back to the conditional logic
    alert('Funcionalidad de guardar flujo será implementada en la siguiente versión');
};

window.saveScript = async function() {
    try {
        // Verifica que hay un usuario autenticado
        if (!currentUser) {
            throw new Error('No hay usuario autenticado. Por favor, inicia sesión.');
        }

        const scriptData = {
            name: document.getElementById('scriptName').value,
            country: document.getElementById('scriptCountry').value,
            category: document.getElementById('scriptCategory').value,
            description: document.getElementById('scriptDescription').value,
            randomOrder: document.getElementById('randomOrder').checked,
            active: document.getElementById('scriptActive').checked,
            questions: collectQuestions(),
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        };

        if (currentEditingScript) {
            // Actualizar script existente - usa sintaxis de compatibilidad
            await firebase.firestore().collection('scripts').doc(currentEditingScript).update(scriptData);
        } else {
            // Crear nuevo script - usa sintaxis de compatibilidad
            scriptData.createdAt = new Date().toISOString();
            scriptData.createdBy = currentUser.uid;
            await firebase.firestore().collection('scripts').add(scriptData);
        }

        bootstrap.Modal.getInstance(document.getElementById('scriptModal')).hide();
        await loadScripts();
        
        alert('Script guardado exitosamente');
    } catch (error) {
        console.error('Error saving script:', error);
        alert('Error al guardar el script: ' + error.message);
    }
};
function collectQuestions() {
    const questions = [];
    const questionDivs = document.querySelectorAll('.question-item');
    
    questionDivs.forEach((questionDiv, index) => {
        const questionId = questionDiv.getAttribute('data-question-id');
        const questionText = questionDiv.querySelector('.question-text').value;
        const responseType = questionDiv.querySelector('.response-type').value;
        const required = questionDiv.querySelector('.question-required').checked;
        const visible = questionDiv.querySelector('.question-visible').checked;
        
        const question = {
            id: questionId,
            order: index + 1,
            text: questionText,
            type: responseType,
            required: required,
            visible: visible,
            options: [],
            conditionalLogic: []
        };
        
        // Collect options for select/multiple/yes_no questions
        if (responseType === 'select' || responseType === 'multiple' || responseType === 'yes_no') {
            const optionInputs = questionDiv.querySelectorAll('.option-text');
            optionInputs.forEach(input => {
                if (input.value.trim()) {
                    question.options.push(input.value.trim());
                }
            });
        }
        
        // Collect conditional logic
        const conditionalRules = questionDiv.querySelectorAll('.conditional-rule');
        conditionalRules.forEach(rule => {
            const conditionQuestion = rule.querySelector('.condition-question').value;
            const operator = rule.querySelector('.condition-operator').value;
            const value = rule.querySelector('.condition-value').value;
            const action = rule.querySelector('.condition-action').value;
            const specificQuestion = rule.querySelector('.condition-specific-question')?.value;
            
            if (conditionQuestion && operator && value && action) {
                question.conditionalLogic.push({
                    targetQuestion: conditionQuestion,
                    operator: operator,
                    value: value,
                    action: action,
                    specificQuestion: specificQuestion
                });
            }
        });
        
        questions.push(question);
    });
    
    return questions;
}

window.editScript = async function(scriptId) {
    try {
        currentEditingScript = scriptId;
        const scriptDoc = await firebase.firestore().collection('scripts').doc(scriptId).get();
        
        // Cambiar de scriptDoc.exists() a scriptDoc.exists
        if (scriptDoc.exists) {  // <-- ¡Aquí está el cambio!
            const script = scriptDoc.data();
            
            document.getElementById('scriptModalTitle').textContent = 'Editar Script';
            document.getElementById('scriptName').value = script.name;
            document.getElementById('scriptCountry').value = script.country;
            document.getElementById('scriptCategory').value = script.category;
            document.getElementById('scriptDescription').value = script.description || '';
            document.getElementById('randomOrder').checked = script.randomOrder || false;
            document.getElementById('scriptActive').checked = script.active;
            document.getElementById('scriptId').value = scriptId;
            
            // Load questions
            const questionsList = document.getElementById('questionsList');
            questionsList.innerHTML = '';
            questionCounter = 0;
            
            if (script.questions) {
                script.questions.forEach(question => {
                    questionCounter = Math.max(questionCounter, parseInt(question.id));
                    loadQuestion(question);
                });
            }
            
            questionCounter++;
            
            const modal = new bootstrap.Modal(document.getElementById('scriptModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading script:', error);
        alert('Error al cargar el script');
    }
};

function loadQuestion(questionData) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item border rounded p-3 mb-3';
    questionDiv.setAttribute('data-question-id', questionData.id);
    
    questionDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Pregunta #${questionData.order || questionData.id}</h6>
            <div>
                <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="moveQuestion(${questionData.id}, 'up')">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="moveQuestion(${questionData.id}, 'down')">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeQuestion(${questionData.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="mb-3">
                    <label class="form-label">Texto de la pregunta</label>
                    <input type="text" class="form-control question-text" value="${questionData.text || ''}" required>
                </div>
            </div>
            <div class="col-md-4">
                <div class="mb-3">
                    <label class="form-label">Tipo de respuesta</label>
                    <select class="form-control response-type" onchange="updateResponseOptions(${questionData.id})">
                        <option value="text" ${questionData.type === 'text' ? 'selected' : ''}>Texto libre</option>
                        <option value="select" ${questionData.type === 'select' ? 'selected' : ''}>Selección única</option>
                        <option value="multiple" ${questionData.type === 'multiple' ? 'selected' : ''}>Selección múltiple</option>
                        <option value="yes_no" ${questionData.type === 'yes_no' ? 'selected' : ''}>Sí/No</option>
                        <option value="rating" ${questionData.type === 'rating' ? 'selected' : ''}>Calificación (1-5)</option>
                        <option value="date" ${questionData.type === 'date' ? 'selected' : ''}>Fecha</option>
                        <option value="phone" ${questionData.type === 'phone' ? 'selected' : ''}>Teléfono</option>
                        <option value="email" ${questionData.type === 'email' ? 'selected' : ''}>Email</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="response-options-container" id="responseOptions${questionData.id}">
            <!-- Response options will be added here -->
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input question-required" type="checkbox" ${questionData.required ? 'checked' : ''}>
                    <label class="form-check-label">Pregunta obligatoria</label>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input question-visible" type="checkbox" ${questionData.visible !== false ? 'checked' : ''}>
                    <label class="form-check-label">Visible por defecto</label>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <label class="form-label">Lógica condicional (Basada en respuestas)</label>
            <div class="conditional-logic-container" id="conditionalLogic${questionData.id}">
                ${questionData.conditionalLogic && questionData.conditionalLogic.length > 0 ? 
                    questionData.conditionalLogic.map(logic => `
                        <div class="conditional-rule border-start border-info ps-3 mt-2">
                            <div class="row">
                                <div class="col-md-4">
                                    <select class="form-control condition-question">
                                        <option value="">Si la respuesta a...</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-control condition-operator">
                                        <option value="equals" ${logic.operator === 'equals' ? 'selected' : ''}>es igual a</option>
                                        <option value="not_equals" ${logic.operator === 'not_equals' ? 'selected' : ''}>no es igual a</option>
                                        <option value="contains" ${logic.operator === 'contains' ? 'selected' : ''}>contiene</option>
                                        <option value="not_contains" ${logic.operator === 'not_contains' ? 'selected' : ''}>no contiene</option>
                                        <option value="greater" ${logic.operator === 'greater' ? 'selected' : ''}>es mayor a</option>
                                        <option value="less" ${logic.operator === 'less' ? 'selected' : ''}>es menor a</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <input type="text" class="form-control condition-value" value="${logic.value || ''}" placeholder="Valor esperado">
                                </div>
                                <div class="col-md-2">
                                    <button type="button" class="btn btn-sm btn-danger" onclick="removeCondition(this)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-6">
                                    <select class="form-control condition-action">
                                        <option value="next" ${logic.action === 'next' ? 'selected' : ''}>Ir a la siguiente pregunta</option>
                                        <option value="specific" ${logic.action === 'specific' ? 'selected' : ''}>Ir a pregunta específica</option>
                                        <option value="end" ${logic.action === 'end' ? 'selected' : ''}>Finalizar script</option>
                                        <option value="show" ${logic.action === 'show' ? 'selected' : ''}>Mostrar esta pregunta</option>
                                        <option value="hide" ${logic.action === 'hide' ? 'selected' : ''}>Ocultar esta pregunta</option>
                                    </select>
                                </div>
                                <div class="col-md-6" id="actionSpecificContainer" style="${logic.action === 'specific' ? 'display: block;' : 'display: none;'}">
                                    <select class="form-control condition-specific-question">
                                        <option value="">Seleccionar pregunta</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `).join('') : ''
                }
                <button type="button" class="btn btn-sm btn-outline-info" onclick="addConditionalLogic(${questionData.id})">
                    <i class="fas fa-plus me-1"></i>Agregar condición
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('questionsList').appendChild(questionDiv);
    updateResponseOptions(questionData.id);
    
    // Load options if they exist
    if (questionData.options && questionData.options.length > 0) {
        const optionsList = document.getElementById(`optionsList${questionData.id}`);
        if (optionsList) {
            optionsList.innerHTML = '';
            questionData.options.forEach(opt => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'input-group mb-2';
                optionDiv.innerHTML = `
                    <input type="text" class="form-control option-text" value="${opt}">
                    <button type="button" class="btn btn-outline-danger" onclick="removeOption(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                optionsList.appendChild(optionDiv);
            });
        }
    }
    
    // Populate question dropdowns after a short delay to allow DOM to update
    setTimeout(() => {
        populateQuestionDropdowns();
        
        // Set values for conditional logic
        if (questionData.conditionalLogic && questionData.conditionalLogic.length > 0) {
            const conditions = questionDiv.querySelectorAll('.conditional-rule');
            
            questionData.conditionalLogic.forEach((logic, index) => {
                if (conditions[index]) {
                    const conditionQuestion = conditions[index].querySelector('.condition-question');
                    const specificQuestion = conditions[index].querySelector('.condition-specific-question');
                    
                    if (conditionQuestion && logic.targetQuestion) {
                        conditionQuestion.value = logic.targetQuestion;
                    }
                    
                    if (specificQuestion && logic.specificQuestion) {
                        specificQuestion.value = logic.specificQuestion;
                    }
                }
            });
        }
    }, 100);
}

window.cloneScript = async function(scriptId) {
    if (confirm('¿Quieres crear una copia de este script?')) {
        try {
            const scriptDoc = await firebase.firestore().collection('scripts').doc(scriptId).get();
            
            // Cambiar de scriptDoc.exists() a scriptDoc.exists
            if (scriptDoc.exists) {  // <-- ¡Aquí está el cambio!
                const originalScript = scriptDoc.data();
                const clonedScript = {
                    ...originalScript,
                    name: `${originalScript.name} (Copia)`,
                    active: false,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.uid,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser.uid
                };
                
                await firebase.firestore().collection('scripts').add(clonedScript);
                await loadScripts();
                alert('Script clonado exitosamente');
            }
        } catch (error) {
            console.error('Error cloning script:', error);
            alert('Error al clonar el script: ' + error.message);
        }
    }
};

window.deleteScript = async function(scriptId) {
    if (confirm('¿Estás seguro de que quieres eliminar este script? Esta acción no se puede deshacer.')) {
        try {
            await firebase.firestore().collection('scripts').doc(scriptId).delete();
            
            await loadScripts();
            alert('Script eliminado exitosamente');
        
        } catch (error) {
            console.error('Error deleting script:', error);
            alert('Error al eliminar el script');
        }
    }
};

window.filterVerifications = function(filter) {
    loadVerifications(filter);
};

window.changeVerificationStatus = async function(verificationId, currentStatus) {
    try {
        let newStatus;
        if (currentStatus === 'pending') newStatus = 'verified';
        else if (currentStatus === 'verified') newStatus = 'rejected';
        else newStatus = 'pending';
        
        await updateDoc(doc(db, 'verifications', verificationId), {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        });
        
        await loadVerifications();
    } catch (error) {
        console.error('Error changing verification status:', error);
        alert('Error al cambiar el estado de la verificación');
    }
};

window.viewVerificationDetails = function(verificationId) {
    alert(`Detalles de verificación ${verificationId} - Esta funcionalidad se implementará en la siguiente versión`);
};

window.editVerification = function(verificationId) {
    alert(`Editar verificación ${verificationId} - Esta funcionalidad se implementará en la siguiente versión`);
};

window.startNewConfirmation = function() {
    // Resetear formulario
    document.getElementById('confirmationForm').reset();

    // Resetear dropdowns
    document.getElementById('confirmationCountry').value = '';
    document.getElementById('confirmationScript').innerHTML = '<option value="">Seleccione un país primero</option>';
    document.getElementById('clientId').value = '';
    document.getElementById('confirmationNotes').value = '';

    // Resetear vista previa
    document.getElementById('clientDataPreview').innerHTML = `
        <p class="text-muted mb-0">Los datos del cliente aparecerán aquí al ingresar el ID</p>
    `;

    // 🔥 Limpiar estado global de la llamada anterior
    window.currentConfirmationId = null;
    window.callStartTime = null;
    window.callTimerInterval = null;
    window.callRecorder = null;
    window.voiceAnalysisData = {
        toneHistory: [],
        dictionHistory: [],
        speedHistory: [],
        fillerWords: 0,
        wordFrequency: {}
    };

    // Opcional: ocultar el botón de reporte y resetear campos
    const reportBtn = document.getElementById('generateReportBtn');
    if (reportBtn) reportBtn.classList.add('d-none');

    const stopBtn = document.getElementById('stopCallBtn');
    if (stopBtn) stopBtn.disabled = false;

    // Mostrar el modal de nueva confirmación
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
};



        window.startConfirmation = async function() {
            const form = document.getElementById('confirmationForm');
            
            // 1. Validar formulario
            if (!form.checkValidity()) {
                // Mostrar errores de validación
                form.classList.add('was-validated');
                
                // Enfocar el primer campo inválido
                const invalidField = form.querySelector(':invalid');
                if (invalidField) {
                    invalidField.focus();
                }
                
                return false;
            }

        try {
            const formData = {
                country: document.getElementById('confirmationCountry').value,
                scriptId: document.getElementById('confirmationScript').value,
                scriptName: document.getElementById('confirmationScript').selectedOptions[0].text,
                clientId: document.getElementById('clientId').value,
                notes: document.getElementById('confirmationNotes').value,
                date: new Date().toISOString(),
                status: 'creado',
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email
            };

            const docRef = await firebase.firestore().collection('confirmations').add(formData);

            // ✅ IMPORTANTE: asignar nuevo ID
            window.currentConfirmationId = docRef.id;

            bootstrap.Modal.getInstance(document.getElementById('confirmationModal')).hide();
            await loadConfirmations();

            // Iniciar análisis con ID nuevo
            startCallAnalysis(docRef.id);

        } catch (error) {
            console.error('Error al iniciar confirmación:', error);
            alert('Error al guardar la confirmación: ' + error.message);
        }
    };


        // Función auxiliar para mostrar alertas (puedes reemplazarla con Toast/SweetAlert)
        function alert(message, type = 'info') {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            alertDiv.role = 'alert';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            document.body.appendChild(alertDiv);
            
            // Auto-eliminar después de 5 segundos
            setTimeout(() => alertDiv.remove(), 5000);
        }

function attachRealtimeValidationEvents() {
    const questionElements = document.querySelectorAll('.script-question');

    questionElements.forEach(questionDiv => {
        const inputs = questionDiv.querySelectorAll('input, select, textarea');
        const isRequired = questionDiv.dataset.required === 'true';

        inputs.forEach(input => {
            // Evento para cambios
            input.addEventListener('change', function() {
                const hasAnswer = getQuestionResponse(questionDiv) !== null;
                questionDiv.classList.toggle('answered', hasAnswer);
                updateQuestionStyle(questionDiv, isRequired, hasAnswer);
                handleQuestionVisibility();
            });

            // Evento para inputs de texto en tiempo real
            if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                input.addEventListener('input', function() {
                    const hasAnswer = input.value.trim() !== '';
                    questionDiv.classList.toggle('answered', hasAnswer);
                    updateQuestionStyle(questionDiv, isRequired, hasAnswer);
                });
            }
        });
    });
}

function updateQuestionStyle(questionElement, isRequired, isAnswered) {
    if (isAnswered) {
        // Estilo para pregunta respondida (verde)
        questionElement.style.backgroundColor = '#E8F5E9';  // Verde claro
        questionElement.style.borderLeft = '4px solid #4CAF50';  // Verde
        questionElement.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.3)';
    } else if (isRequired) {
        // Estilo para pregunta obligatoria no respondida (rojo)
        questionElement.style.backgroundColor = '#FFEBEE';  // Rojo claro
        questionElement.style.borderLeft = '4px solid #F44336';  // Rojo
        questionElement.style.boxShadow = 'none';
    } else {
        // Estilo para pregunta opcional no respondida (azul)
        questionElement.style.backgroundColor = '#E3F2FD';  // Azul claro
        questionElement.style.borderLeft = '4px solid #2196F3';  // Azul
        questionElement.style.boxShadow = 'none';
    }
}


window.viewCallMetrics = async function (confirmationId) {
    try {
        const doc = await firebase.firestore().collection('confirmations').doc(confirmationId).get();
        const data = doc.data();

        if (!data || !data.responses) {
            alert("No hay métricas disponibles para esta confirmación.");
            return;
        }

        // Simular métricas desde los datos guardados si existen
        window.voiceAnalysisData = {
            toneHistory: [data.voiceMetrics?.toneScore || 70],
            dictionHistory: [data.voiceMetrics?.dictionScore || 70],
            speedHistory: [data.voiceMetrics?.speedScore || 100],
            fillerWords: data.voiceMetrics?.fillerWords || 0,
            wordFrequency: data.voiceMetrics?.wordFrequency || {},
            mostRepeated: data.voiceMetrics?.mostRepeated || '',
            transcript: data.transcript || '',
            lastUpdated: data.voiceMetrics?.lastUpdated || new Date().toISOString()
        };

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('callAnalysisModal'));
        modal.show();

        // Esperar 200ms y mostrar el reporte
        setTimeout(() => {
            generateCallReport();
        }, 200);

    } catch (error) {
        console.error('Error al mostrar métricas:', error);
        alert('No se pudieron cargar las métricas.');
    }
};