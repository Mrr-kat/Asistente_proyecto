// historial.js (CÓDIGO COMPLETO CORREGIDO)
class GestorHistorial {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.cargarElementos();
        this.configurarEventosHistorial();
        this.cargarHistorialAutomatico();
    }

    cargarElementos() {
        // Solo elementos del historial
        this.buscarInput = document.getElementById('buscar-historial');
        this.btnBuscar = document.getElementById('btn-buscar');
        this.btnGenerarReporte = document.getElementById('btn-generar-reporte');
        this.listaHistorial = document.getElementById('lista-historial');
        this.seccionHistorial = document.getElementById('seccion-historial');
    }

    configurarEventosHistorial() {
        // Solo eventos del historial
        if (this.btnBuscar) {
            this.btnBuscar.addEventListener('click', () => this.buscarHistorial());
        }
        
        if (this.buscarInput) {
            this.buscarInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarHistorial();
            });
        }
        
        if (this.btnGenerarReporte) {
            this.btnGenerarReporte.addEventListener('click', () => this.generarReportePDF());
        }
        
        // Observar cuando se muestra la sección de historial
        if (this.seccionHistorial) {
            this.observarCambiosSeccion();
        }
    }
    
    observarCambiosSeccion() {
        // Observador para detectar cuando se activa la sección de historial
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (this.seccionHistorial.classList.contains('activa')) {
                        console.log('Sección historial activada, cargando datos...');
                        setTimeout(() => this.cargarHistorial(), 300);
                    }
                }
            });
        });
        
        observer.observe(this.seccionHistorial, { attributes: true });
    }
    
    cargarHistorialAutomatico() {
        // Cargar historial si la sección ya está activa al cargar la página
        if (this.seccionHistorial && this.seccionHistorial.classList.contains('activa')) {
            console.log('Historial ya visible, cargando datos...');
            setTimeout(() => this.cargarHistorial(), 500);
        }
    }

    async cargarHistorial(busqueda = '') {
        try {
            console.log('Cargando historial...');
            this.mostrarEstadoCarga(true);
            
            const url = busqueda ? `/historial?buscar=${encodeURIComponent(busqueda)}` : '/historial';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data.registros ? data.registros.length : 0, 'registros');
            
            if (data.registros && Array.isArray(data.registros)) {
                this.mostrarHistorial(data.registros);
            } else {
                console.error('Formato de datos inválido:', data);
                this.mostrarError('Formato de datos inválido');
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.mostrarError('Error al cargar el historial');
        } finally {
            this.mostrarEstadoCarga(false);
        }
    }
    
    mostrarEstadoCarga(cargando) {
        if (!this.listaHistorial) return;
        
        if (cargando) {
            this.listaHistorial.innerHTML = `
                <div class="sin-registros">
                    <box-icon name='loader-circle' animation='spin' size="48px" color="#4CAF50"></box-icon>
                    <p style="margin-top: 10px;">Cargando historial...</p>
                </div>
            `;
        }
    }
    
    mostrarError(mensaje) {
        if (this.listaHistorial) {
            this.listaHistorial.innerHTML = `
                <div class="sin-registros">
                    <box-icon name='error' size="48px" color="#f44336"></box-icon>
                    <p>${mensaje}</p>
                    <button onclick="window.gestorHistorial.cargarHistorial()" 
                            style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    mostrarHistorial(registros) {
        if (!this.listaHistorial) return;
        
        if (!registros || registros.length === 0) {
            this.listaHistorial.innerHTML = `
                <div class="sin-registros">
                    <box-icon name='history' size="48px" color="#a0aec0"></box-icon>
                    <p>No hay registros en el historial</p>
                    <p style="font-size: 0.9rem; color: #718096; margin-top: 5px;">
                        Los comandos que ejecutes aparecerán aquí automáticamente
                    </p>
                </div>
            `;
            return;
        }

        this.listaHistorial.innerHTML = registros.map(registro => `
            <div class="registro-historial" data-id="${registro.id}">
                <div class="registro-comando">
                    <div class="comando-label">
                        <box-icon name='user-voice' size="16px"></box-icon>
                        Usuario:
                    </div>
                    <div class="comando-texto">${this.escapeHtml(registro.comando_usuario || 'Sin texto')}</div>
                </div>
                
                <div class="registro-respuesta">
                    <div class="respuesta-label">
                        <box-icon name='bot' size="16px"></box-icon>
                        Asistente:
                    </div>
                    <div class="respuesta-texto">${this.escapeHtml(registro.respuesta_asistente || 'Sin respuesta')}</div>
                </div>
                
                <div class="registro-footer">
                    <div class="registro-fecha">
                        <box-icon name='calendar' size="16px"></box-icon>
                        ${registro.fecha_hora || 'Sin fecha'}
                    </div>
                    <div class="registro-actions">
                        <button class="btn-editar" onclick="window.gestorHistorial.editarRegistro(${registro.id})" title="Editar">
                            <box-icon name='edit' size="18px"></box-icon>
                        </button>
                        <button class="btn-eliminar" onclick="window.gestorHistorial.eliminarRegistro(${registro.id})" title="Eliminar">
                            <box-icon name='trash' size="18px"></box-icon>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    buscarHistorial() {
        const texto = this.buscarInput ? this.buscarInput.value.trim() : '';
        this.cargarHistorial(texto);
    }

    async generarReportePDF() {
        try {
            this.mostrarNotificacion('Generando reporte PDF...', 'info');
            
            const response = await fetch('/historial/reportes/pdf', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.archivo) {
                // Abrir el PDF en nueva pestaña
                window.open(data.archivo, '_blank');
                this.mostrarNotificacion('✅ Reporte PDF generado exitosamente', 'success');
            } else {
                this.mostrarNotificacion('❌ Error al generar el reporte', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            this.mostrarNotificacion('❌ Error al generar el reporte PDF', 'error');
        }
    }

    async eliminarRegistro(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            return;
        }

        try {
            const response = await fetch(`/historial/${id}`, { 
                method: 'DELETE' 
            });
            
            const data = await response.json();
            
            if (data.mensaje) {
                this.mostrarNotificacion('✅ Registro eliminado exitosamente', 'success');
                // Recargar el historial después de eliminar
                setTimeout(() => this.cargarHistorial(), 300);
            } else {
                this.mostrarNotificacion('❌ Error eliminando registro', 'error');
            }
        } catch (error) {
            console.error('Error eliminando registro:', error);
            this.mostrarNotificacion('❌ Error al eliminar el registro', 'error');
        }
    }

    editarRegistro(id) {
        const registroElement = document.querySelector(`.registro-historial[data-id="${id}"]`);
        if (!registroElement) {
            this.mostrarNotificacion('❌ No se encontró el registro', 'error');
            return;
        }
        
        const comandoUsuario = registroElement.querySelector('.comando-texto').textContent;
        const respuestaAsistente = registroElement.querySelector('.respuesta-texto').textContent;
        
        const nuevoComando = prompt('Editar lo que dijo el usuario:', comandoUsuario);
        if (nuevoComando === null) return; // Usuario canceló
        
        const nuevaRespuesta = prompt('Editar la respuesta del asistente:', respuestaAsistente);
        if (nuevaRespuesta === null) return; // Usuario canceló
        
        if (nuevoComando !== comandoUsuario || nuevaRespuesta !== respuestaAsistente) {
            this.actualizarRegistro(id, nuevoComando, nuevaRespuesta);
        }
    }

    async actualizarRegistro(id, comandoUsuario, respuestaAsistente) {
        try {
            const datos = {
                comando_usuario: comandoUsuario,
                respuesta_asistente: respuestaAsistente
            };
            
            const response = await fetch(`/historial/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(datos)
            });
            
            const data = await response.json();
            
            if (data.mensaje) {
                this.mostrarNotificacion('✅ Registro actualizado exitosamente', 'success');
                // Recargar el historial después de actualizar
                setTimeout(() => this.cargarHistorial(), 300);
            } else {
                this.mostrarNotificacion('❌ Error actualizando registro', 'error');
            }
        } catch (error) {
            console.error('Error actualizando registro:', error);
            this.mostrarNotificacion('❌ Error al actualizar el registro', 'error');
        }
    }

    mostrarNotificacion(mensaje, tipo) {
        // Eliminar notificaciones anteriores
        const notificacionesAnteriores = document.querySelectorAll('.notificacion-flotante');
        notificacionesAnteriores.forEach(notif => notif.remove());
        
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-flotante';
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            ${tipo === 'success' ? 'background: linear-gradient(135deg, #48bb78, #38a169);' : 
              tipo === 'error' ? 'background: linear-gradient(135deg, #f56565, #e53e3e);' : 
              'background: linear-gradient(135deg, #4299e1, #3182ce);'}
        `;
        
        notificacion.innerHTML = `
            ${tipo === 'success' ? '<box-icon name="check-circle" color="white"></box-icon>' :
              tipo === 'error' ? '<box-icon name="error" color="white"></box-icon>' :
              '<box-icon name="info-circle" color="white"></box-icon>'}
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(notificacion);
        
        // Animar entrada
        setTimeout(() => {
            notificacion.style.opacity = '1';
            notificacion.style.transform = 'translateX(0)';
        }, 10);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notificacion.style.opacity = '0';
            notificacion.style.transform = 'translateX(20px)';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando gestor de historial...');
    window.gestorHistorial = new GestorHistorial();
    
    // También cargar historial cuando se navegue a esa sección vía botones
    const btnHistorial = document.getElementById('btn-historial');
    if (btnHistorial) {
        btnHistorial.addEventListener('click', () => {
            setTimeout(() => {
                if (window.gestorHistorial && window.gestorHistorial.seccionHistorial) {
                    if (window.gestorHistorial.seccionHistorial.classList.contains('activa')) {
                        window.gestorHistorial.cargarHistorial();
                    }
                }
            }, 100);
        });
    }
});

// Función global para recargar el historial desde otras partes de la aplicación
window.recargarHistorial = function() {
    if (window.gestorHistorial) {
        window.gestorHistorial.cargarHistorial();
    }
};

// Escuchar eventos personalizados para actualizar el historial
document.addEventListener('comandoEjecutado', () => {
    console.log('Comando ejecutado, recargando historial...');
    if (window.gestorHistorial) {
        setTimeout(() => window.gestorHistorial.cargarHistorial(), 500);
    }
});