window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
    
    if (window.innerWidth > 768) {
        mainContent.classList.toggle('shifted');
    }
};

window.toggleSubmenu = function(submenuId) {
    const submenu = document.getElementById(`submenu-${submenuId}`);
    submenu.classList.toggle('d-none');
};

window.showSection = function(sectionName) {
    try {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            if (section) section.classList.add('d-none');
        });
        
        // Show selected section
        const section = document.getElementById(`section-${sectionName}`);
        if (section) section.classList.remove('d-none');
        
        // Update active menu
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item) item.classList.remove('active');
        });
        
        // Set the clicked menu item as active
        if (sectionName === 'verificaciones') {
            const submenuItem = document.querySelector('.submenu-item[onclick="showSection(\'verificaciones\')"]');
            if (submenuItem) {
                const menuItem = submenuItem.parentElement.parentElement.querySelector('.menu-item');
                if (menuItem) menuItem.classList.add('active');
            }
        } else {
            const menuItem = document.querySelector(`.menu-item[onclick="showSection('${sectionName}')"]`);
            if (menuItem) menuItem.classList.add('active');
        }
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    } catch (error) {
        console.error('Error in showSection:', error);
    }
};

// Función auxiliar para texto de estado
function getStatusText(status) {
    const statusTexts = {
        'creado': 'Creado',
        'en_progreso': 'En Progreso',
        'confirmada': 'Confirmada',
        'sin_contacto': 'Sin Contacto'
    };
    return statusTexts[status] || status;
}

// Detener micrófono al finalizar
window.stopMicrophone = function() {
    if (window.callRecorder && window.callRecorder.state === 'recording') {
        window.callRecorder.stop();
        console.log('Micrófono apagado');
    }
};