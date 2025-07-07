// Verificar que firebase está disponible
if (typeof firebase === 'undefined') {
    console.error("Firebase no está definido. Carga los SDK primero.");
} else {
    let questionCounter = 0;
    let scripts = {
        guatemala: [],
        honduras: [],
        salvador: []
    };

    // Verificar autenticación antes de inicializar
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.warn('Usuario no autenticado, redirigiendo...');
            window.location.href = 'index.html';
            return;
        }
        
        
        
        addQuestion('guatemala');
        
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('open');
            });
        }
    });

    function getActiveCountry() {
        const activeTab = document.querySelector('.nav-tabs .nav-link.active');
        return activeTab.id.replace('-tab', '');
    }

    function getContainerForCountry(country) {
        const containers = {
            guatemala: 'questionsContainer',
            honduras: 'questionsContainerHonduras',
            salvador: 'questionsContainerSalvador'
        };
        return containers[country] || 'questionsContainer';
    }

    function addQuestion(country = null) {
        if (!country) {
            country = getActiveCountry();
        }
        
        questionCounter++;
        const containerId = getContainerForCountry(country);
        const container = document.getElementById(containerId);
        
        const questionHtml = `
            <div class="question-card" id="question-${questionCounter}">
                <div class="question-header">
                    <div class="question-title">
                        <i class="fas fa-question-circle me-2"></i>
                        Pregunta ${questionCounter}
                    </div>
                    <div class="question-actions">
                        <button class="btn-icon btn-edit" onclick="editQuestion(${questionCounter})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteQuestion(${questionCounter})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="question-content">
                    <div class="mb-3">
                        <label class="form-label">Texto de la pregunta:</label>
                        <textarea class="question-text" placeholder="Escribe aquí la pregunta que se hará al cliente..."></textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Tipo de respuesta:</label>
                        <select class="form-select" onchange="updateAnswerType(${questionCounter}, this.value)">
                            <option value="text">Texto libre</option>
                            <option value="number">Número</option>
                            <option value="select">Selección múltiple</option>
                            <option value="radio">Opción única</option>
                            <option value="boolean">Sí/No</option>
                        </select>
                    </div>
                    
                    <div class="answer-options" id="options-${questionCounter}">
                        <!-- Options will be added dynamically based on answer type -->
                    </div>
                    
                    <div class="conditions-section">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6><i class="fas fa-code-branch me-2"></i>Condiciones y Lógica</h6>
                            <button class="btn btn-sm btn-outline-primary" onclick="addCondition(${questionCounter})">
                                <i class="fas fa-plus me-1"></i>Agregar Condición
                            </button>
                        </div>
                        <div id="conditions-${questionCounter}">
                            <p class="text-muted mb-0">No hay condiciones definidas.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += questionHtml;
        updateAnswerType(questionCounter, 'text');
    }

    function updateAnswerType(questionId, type) {
        const optionsContainer = document.getElementById(`options-${questionId}`);
        
        switch(type) {
            case 'select':
            case 'radio':
                optionsContainer.innerHTML = `
                    <div class="option-group">
                        <label class="form-label">Opciones disponibles:</label>
                        <div id="option-list-${questionId}">
                            <div class="option-input">
                                <input type="text" placeholder="Opción 1" class="form-control">
                                <button class="btn btn-sm btn-outline-danger" onclick="removeOption(this)">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="option-input">
                                <input type="text" placeholder="Opción 2" class="form-control">
                                <button class="btn btn-sm btn-outline-danger" onclick="removeOption(this)">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="addOption(${questionId})">
                            <i class="fas fa-plus me-1"></i>Agregar Opción
                        </button>
                    </div>
                `;
                break;
            case 'number':
                optionsContainer.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Valor mínimo:</label>
                            <input type="number" class="form-control" placeholder="0">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Valor máximo:</label>
                            <input type="number" class="form-control" placeholder="100">
                        </div>
                    </div>
                `;
                break;
            case 'boolean':
                optionsContainer.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Texto para "Sí":</label>
                            <input type="text" class="form-control" value="Sí" placeholder="Sí">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Texto para "No":</label>
                            <input type="text" class="form-control" value="No" placeholder="No">
                        </div>
                    </div>
                `;
                break;
            default:
                optionsContainer.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Longitud mínima:</label>
                            <input type="number" class="form-control" placeholder="0" min="0">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Longitud máxima:</label>
                            <input type="number" class="form-control" placeholder="255" min="1">
                        </div>
                    </div>
                `;
                break;
        }
    }

    function addOption(questionId) {
        const optionList = document.getElementById(`option-list-${questionId}`);
        const optionCount = optionList.children.length + 1;
        
        const optionHtml = `
            <div class="option-input">
                <input type="text" placeholder="Opción ${optionCount}" class="form-control">
                <button class="btn btn-sm btn-outline-danger" onclick="removeOption(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        optionList.innerHTML += optionHtml;
    }

    function removeOption(button) {
        button.parentElement.remove();
    }

    function addCondition(questionId) {
        const conditionsContainer = document.getElementById(`conditions-${questionId}`);
        
        // Remove "no conditions" message if it exists
        const noConditionsMsg = conditionsContainer.querySelector('.text-muted');
        if (noConditionsMsg) {
            noConditionsMsg.remove();
        }
        
        const conditionId = Date.now();
        const conditionHtml = `
            <div class="condition-card" id="condition-${conditionId}">
                <div class="condition-header">
                    <strong>Nueva Condición</strong>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeCondition(${conditionId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <label class="form-label">Si la respuesta es:</label>
                        <select class="form-select">
                            <option value="equals">Igual a</option>
                            <option value="contains">Contiene</option>
                            <option value="greater">Mayor que</option>
                            <option value="less">Menor que</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Valor:</label>
                        <input type="text" class="form-control" placeholder="Ingresa el valor">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Entonces:</label>
                        <select class="form-select">
                            <option value="show">Mostrar pregunta</option>
                            <option value="hide">Ocultar pregunta</option>
                            <option value="end">Finalizar script</option>
                            <option value="jump">Saltar a pregunta</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        conditionsContainer.innerHTML += conditionHtml;
    }

    function removeCondition(conditionId) {
        document.getElementById(`condition-${conditionId}`).remove();
    }

    function editQuestion(questionId) {
        const questionCard = document.getElementById(`question-${questionId}`);
        questionCard.classList.toggle('active');
        
        // You can add more edit functionality here
        alert(`Editando pregunta ${questionId}`);
    }

    function deleteQuestion(questionId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
            document.getElementById(`question-${questionId}`).remove();
            updatePreview();
        }
    }

    function updatePreview() {
        const country = getActiveCountry();
        const questions = document.querySelectorAll(`#${getContainerForCountry(country)} .question-card`);
        
        const preview = document.getElementById('scriptPreview');
        preview.innerHTML = '';
        
        questions.forEach(question => {
            const questionId = question.id.replace('question-', '');
            const questionText = question.querySelector('.question-text').value;
            const answerType = question.querySelector('.form-select').value;
            
            preview.innerHTML += `
                // Pregunta ${questionId}
                // Tipo: ${answerType}
                "${questionText}"
                
            `;
        });
    }

    function saveScript() {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            alert('Debes iniciar sesión para guardar scripts');
            window.location.href = 'index.html';
            return;
        }

        const country = getActiveCountry();
        const questions = document.querySelectorAll(`#${getContainerForCountry(country)} .question-card`);
        const scriptData = {
            country: country,
            questions: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: user.uid
        };

        questions.forEach(question => {
            const questionText = question.querySelector('.question-text').value;
            const answerType = question.querySelector('.form-select').value;
            
            scriptData.questions.push({
                text: questionText,
                type: answerType
            });
        });

        firebase.firestore().collection('scripts').add(scriptData)
            .then(() => {
                alert('Script guardado correctamente');
            })
            .catch(error => {
                console.error('Error saving script:', error);
                alert('Error al guardar el script: ' + error.message);
            });
    }

    function exportScript() {
        const country = getActiveCountry();
        const questions = document.querySelectorAll(`#${getContainerForCountry(country)} .question-card`);
        let scriptContent = `// Script para ${country}\n\n`;

        questions.forEach(question => {
            const questionId = question.id.replace('question-', '');
            const questionText = question.querySelector('.question-text').value;
            const answerType = question.querySelector('.form-select').value;
            
            scriptContent += `// Pregunta ${questionId}\n`;
            scriptContent += `// Tipo: ${answerType}\n`;
            scriptContent += `"${questionText}"\n\n`;
        });

        // Crear un blob y descargar el archivo
        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `script_${country}_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Hacer las funciones disponibles globalmente
    window.addQuestion = addQuestion;
    window.updateAnswerType = updateAnswerType;
    window.addOption = addOption;
    window.removeOption = removeOption;
    window.addCondition = addCondition;
    window.removeCondition = removeCondition;
    window.editQuestion = editQuestion;
    window.deleteQuestion = deleteQuestion;
    window.updatePreview = updatePreview;
    window.saveScript = saveScript;
    window.exportScript = exportScript;
}