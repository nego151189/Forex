document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('productoForm');
    const tabla = document.getElementById('productosTable');

    if (!form || !tabla || typeof firebase === 'undefined') return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const producto = {
            solicitud: document.getElementById('solicitud').value.trim(),
            edad: parseInt(document.getElementById('edad').value),
            segmento: document.getElementById('segmento').value,
            maf: document.getElementById('maf').value,
            productoFisico: document.getElementById('productoFisico').value,
            ingresos: parseFloat(document.getElementById('ingresos').value),
            estadoCivil: document.getElementById('estadoCivil').value,
            marca: document.getElementById('marca').value,
            resultadoEsperado: document.getElementById('resultadoEsperado').value.trim(),
            creadoEn: new Date().toISOString()
        };

        try {
            await firebase.firestore().collection('productosFinancieros').add(producto);
            form.reset();
            cargarProductos();
            alert('Producto guardado correctamente.');
        } catch (error) {
            console.error('Error al guardar producto:', error);
            alert('Error al guardar producto.');
        }
    });

    async function cargarProductos() {
        try {
            const snapshot = await firebase.firestore()
                .collection('productosFinancieros')
                .orderBy('creadoEn', 'desc')
                .get();

            tabla.innerHTML = '';

            if (snapshot.empty) {
                tabla.innerHTML = '<tr><td colspan="8" class="text-center">No hay productos registrados</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${p.solicitud}</td>
                    <td>${p.edad}</td>
                    <td>${p.segmento}</td>
                    <td>${p.maf}</td>
                    <td>${p.productoFisico}</td>
                    <td>${p.ingresos}</td>
                    <td>${p.estadoCivil}</td>
                    <td>${p.marca}</td>
<td>${p.resultadoEsperado || "-"}</td>
                `;
                tabla.appendChild(fila);
            });
        } catch (error) {
            console.error('Error al cargar productos:', error);
            tabla.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar productos</td></tr>';
        }
    }

    cargarProductos();
});