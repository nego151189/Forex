firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log('Usuario autenticado:', user.email);

    firebase.firestore().collection("usuarios").where("correo", "==", user.email).limit(1).get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const nombre = data.nombre || user.email;
          const rol = data.rol || "analista"; // rol por defecto

          // Mostrar nombre y rol en el panel superior
          const userName = document.getElementById("userName");
          const userRole = document.getElementById("userRole");
          const navUser = document.getElementById("navUserName");

          if (userName) userName.textContent = nombre;
          if (userRole) userRole.textContent = rol;
          if (navUser) navUser.textContent = nombre;

          // Guardar en localStorage
          localStorage.setItem("userRol", rol);
          localStorage.setItem("userCorreo", user.email);
        } else {
          alert("Este usuario no está registrado en el sistema.");
          firebase.auth().signOut();
        }
      })
      .catch(error => {
        console.error("Error al obtener el rol del usuario:", error);
        alert("No se pudo verificar el rol.");
      });

  } else {
    // Usuario no autenticado
    window.location.href = "index.html";
  }
});

// Cerrar sesión (solo si el botón existe)
const logout = document.getElementById("logoutBtn");
if (logout) {
  logout.addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  });
}