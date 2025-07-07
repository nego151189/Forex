document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('evaluacionForm');
    const resultado = document.getElementById('resultadoProductos');
    const historial = document.getElementById('historialEvaluaciones');
    const busquedaInput = document.getElementById('busquedaSolicitud');

    const campos = [
        'solicitud', 'edad', 'segmento', 'maf', 'productoFisico',
        'ingresos', 'estadoCivil', 'marca', 'scoreBuro'
    ];

    let editandoId = null;
    let reglasCache = [];

    async function obtenerReglas() {
        if (reglasCache.length === 0) {
            const snapshot = await firebase.firestore().collection('productosFinancieros').get();
            reglasCache = snapshot.docs.map(doc => doc.data());
        }
        return reglasCache;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        resultado.innerHTML = '<li class="list-group-item">Evaluando...</li>';

        const entrada = {};
        campos.forEach(c => {
            entrada[c] = document.getElementById(c).value.trim();
        });

        entrada.edad = parseInt(entrada.edad);
        entrada.maf = parseFloat(entrada.maf);
        entrada.ingresos = parseFloat(entrada.ingresos);
        entrada.scoreBuro = parseFloat(entrada.scoreBuro);

        try {
            const user = firebase.auth().currentUser;
            const reglas = await obtenerReglas();
            const resultados = [];

            reglas.forEach(data => {
                const cumple = data.condiciones.every(cond => {
                    const valorCampo = entrada[cond.campo];
                    const operador = cond.operador;
                    const valor = cond.valor;

                    if (operador === 'entre') {
                        const [min, max] = valor.split('-').map(Number);
                        return valorCampo >= min && valorCampo <= max;
                    }

                    if (operador === 'in') {
                        const opciones = valor.split(',').map(v => v.trim());
                        return opciones.includes(valorCampo.toString());
                    }

                    switch (operador) {
                        case '==': return valorCampo == valor;
                        case '!=': return valorCampo != valor;
                        case '>': return valorCampo > Number(valor);
                        case '<': return valorCampo < Number(valor);
                        case '>=': return valorCampo >= Number(valor);
                        case '<=': return valorCampo <= Number(valor);
                        default: return false;
                    }
                });

                if (cumple) {
                    resultados.push({ producto: data.resultadoEsperado, color: data.color || "#000000" });
                }
            });

            const resultadoFinal = resultados.length > 0 ? resultados : [{ producto: "Sin coincidencias", color: "#666" }];
            resultado.innerHTML = resultadoFinal.map(r =>
                `<li class="list-group-item" style="color: ${r.color}"><i class="fas fa-check-circle me-2"></i>${r.producto}</li>`
            ).join('');

            const ref = firebase.firestore().collection('evaluacionesProductos');
            const payload = {
                ...entrada,
                productosAplicables: resultadoFinal.map(r => r.producto),
                evaluadoPor: user ? user.email : "Desconocido",
                evaluadoEn: new Date().toISOString()
            };

            if (editandoId) {
                await ref.doc(editandoId).set(payload);
                editandoId = null;
            } else {
                await ref.add(payload);
            }

            form.reset();
            resultado.innerHTML = '';
            cargarHistorial();

        } catch (error) {
            console.error('Error al evaluar productos:', error);
            resultado.innerHTML = '<li class="list-group-item text-danger">Error al evaluar productos.</li>';
        }
    });

    async function cargarHistorial() {
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;
        try {
            const snapshot = await firebase.firestore().collection('evaluacionesProductos').orderBy('evaluadoEn', 'desc').get();
            historial.innerHTML = '';
            if (snapshot.empty) {
                historial.innerHTML = '<tr><td colspan="5" class="text-muted">No hay evaluaciones registradas</td></tr>';
                return;
            }

            snapshot.forEach(doc => {


            const fechaEval = new Date(data.evaluadoEn);
                            if (fechaDesde && fechaEval < new Date(fechaDesde)) return;
                            if (fechaHasta && fechaEval > new Date(fechaHasta + 'T23:59:59')) return;

                
                                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${data.solicitud || '-'}</td>
                    <td>${data.evaluadoPor || '-'}</td>
                    <td>${new Date(data.evaluadoEn).toLocaleString()}</td>
                    <td>${(data.productosAplicables || []).join('<br>')}</td>
                    <td>
                        <button class="btn btn-sm btn-warning editar-evaluacion" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                historial.appendChild(fila);
            });

            document.querySelectorAll('.editar-evaluacion').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const doc = await firebase.firestore().collection('evaluacionesProductos').doc(id).get();
                    if (!doc.exists) return;
                    const data = doc.data();
                    campos.forEach(c => {
                        document.getElementById(c).value = data[c] || '';
                    });
                    resultado.innerHTML = (data.productosAplicables || []).map(p =>
                        `<li class="list-group-item"><i class="fas fa-check-circle text-success me-2"></i>${p}</li>`
                    ).join('');
                    editandoId = id;
                    window.scrollTo(0, 0);
                });
            });

            const rows = historial.querySelectorAll('tr');
            busquedaInput.addEventListener('input', () => {
                const val = busquedaInput.value.toLowerCase();
                rows.forEach(row => {
                    const match = row.children[0]?.textContent?.toLowerCase().includes(val);
                    row.style.display = match || !val ? '' : 'none';
                });
            });
        } catch (error) {
            console.error('Error al cargar historial:', error);
            historial.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar historial</td></tr>';
        }
    }

    cargarHistorial();
});