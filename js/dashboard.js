

document.addEventListener("DOMContentLoaded", () => {
  const agregarBtn = document.getElementById("agregarCondicion");
  const guardarBtn = document.getElementById("guardarProducto");
  const listaCondiciones = document.getElementById("listaCondiciones");
  const condiciones = [];

  agregarBtn.addEventListener("click", () => {
    const campo = document.getElementById("campo").value;
    const operador = document.getElementById("operador").value;
    const valor = document.getElementById("valor").value.trim();

    if (!campo || !operador || !valor) {
      alert("Todos los campos son obligatorios");
      return;
    }

    const condicion = { campo, operador, valor };
    condiciones.push(condicion);

    const item = document.createElement("li");
    item.className = "list-group-item d-flex justify-content-between align-items-center";
    item.innerHTML = `
      <span><strong>${campo}</strong> ${operador} ${valor}</span>
      <button class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      listaCondiciones.removeChild(item);
      const index = condiciones.indexOf(condicion);
      if (index > -1) condiciones.splice(index, 1);
    });

    listaCondiciones.appendChild(item);

    document.getElementById("campo").value = "";
    document.getElementById("operador").value = "==";
    document.getElementById("valor").value = "";
  });

  guardarBtn.addEventListener("click", async () => {
    const resultado = document.getElementById("resultadoEsperado").value.trim();

    if (condiciones.length === 0 || !resultado) {
      alert("Agrega al menos una condición y define un resultado esperado.");
      return;
    }

    const currentUser = firebase.auth().currentUser;

    const producto = {
      condiciones,
      resultado,
      creadoPor: currentUser?.uid || null,
      nombreUsuario: currentUser?.displayName || currentUser?.email || "Desconocido",
      fecha: new Date().toISOString()
    };

    try {
      await firebase.firestore().collection("productos_parametrizados").add(producto);
      alert("Producto guardado correctamente");

      condiciones.length = 0;
      listaCondiciones.innerHTML = "";
      document.getElementById("resultadoEsperado").value = "";

      cargarProductosRegistrados();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error al guardar: " + error.message);
    }
  });

  async function cargarProductosRegistrados() {
    const contenedor = document.getElementById("productosRegistrados");
    contenedor.innerHTML = "";

    try {
      const snapshot = await firebase.firestore()
        .collection("productos_parametrizados")
        .orderBy("fecha", "desc")
        .get();

      if (snapshot.empty) {
        contenedor.innerHTML = `<div class="text-center text-muted">No hay productos registrados</div>`;
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const tarjeta = document.createElement("div");
        tarjeta.className = "col-md-12 border rounded p-3 bg-light";

        tarjeta.innerHTML =
          "<p><strong>Condiciones:</strong> " +
          data.condiciones.map(c => c.campo + " " + c.operador + " " + c.valor).join(" y ") +
          "</p>" +
          "<p><strong>Resultado:</strong> " + data.resultado + "</p>" +
          "<p><strong>Fecha:</strong> " + new Date(data.fecha).toLocaleString() + "</p>" +
          "<button class='btn btn-sm btn-danger' onclick=\"eliminarProducto('" + doc.id + "')\">" +
          "<i class='fas fa-trash me-1'></i>Eliminar</button>";

        contenedor.appendChild(tarjeta);
      });
    } catch (error) {
      console.error("Error al cargar productos:", error);
      contenedor.innerHTML = `<div class="text-danger text-center">Error al cargar productos</div>`;
    }
  }

  window.eliminarProducto = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
      await firebase.firestore().collection("productos_parametrizados").doc(id).delete();
      alert("Producto eliminado correctamente");
      cargarProductosRegistrados();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("Error al eliminar: " + error.message);
    }
  };

  cargarProductosRegistrados();
});