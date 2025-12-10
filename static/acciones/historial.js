// static/acciones/historial.js
class GestorHistorial {
    constructor() {
        this.initialize();
    }

    initialize() {
        console.log('Inicializando GestorHistorial...');
        this.cargarElementos();
        this.configurarEventosHistorial();
        this.setupNavigationObserver();
    }

    cargarElementos() {
        // Solo elementos del historial
        this.buscarInput = document.getElementById('buscar-historial');
        this.btnBuscar = document.getElementById('btn-buscar');
        this.btnGenerarReporte = document.getElementById('btn-generar-reporte');
        this.listaHistorial = document.getElementById('lista-historial');
        this.seccionHistorial = document.getElementById('seccion-historial');
        
        console.log('Elementos del historial cargados:', {
            buscarInput: !!this.buscarInput,
            btnBuscar: !!this.btnBuscar,
            btnGenerarReporte: !!this.btnGenerarReporte,
            listaHistorial: !!this.listaHistorial,
            seccionHistorial: !!this.seccionHistorial
        });
    }

    configurarEventosHistorial() {
        // Solo eventos del historial
        if (this.btnBuscar) {
            this.btnBuscar.addEventListener('click', () => this.buscarHistorial());
            console.log('Evento de búsqueda configurado');
        }
        
        if (this.buscarInput) {
            this.buscarInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarHistorial();
            });
        }
        
        if (this.btnGenerarReporte) {
            this.btnGenerarReporte.addEventListener('click', () => this.generarReportePDF());
        }
        
        // Configurar para que se cargue automáticamente cuando se muestra la sección
        this.configurarCargaAutomatica();
    }

    configurarCargaAutomatica() {
        // Si ya estamos en la sección de historial, cargar inmediatamente
        if (this.seccionHistorial && this.seccionHistorial.classList.contains('activa')) {
            setTimeout(() => {
                this.cargarHistorial();
            }, 500);
        }
    }

    setupNavigationObserver() {
        // Observar cambios en los botones de navegación
        const btnHistorial = document.getElementById('btn-historial');
        if (btnHistorial) {
            btnHistorial.addEventListener('click', () => {
                // Esperar un poco para que la sección se active
                setTimeout(() => {
                    if (this.seccionHistorial && this.seccionHistorial.classList.contains('activa')) {
                        this.cargarHistorial();
                    }
                }, 100);
            });
        }
    }

    async cargarHistorial(busqueda = '') {
        try {
            console.log('Cargando historial... Busqueda:', busqueda);
            
            // Mostrar indicador de carga
            this.mostrarCargando(true);
            
            const url = busqueda ? `/historial?buscar=${encodeURIComponent(busqueda)}` : '/historial';
            console.log('URL de historial:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos recibidos del historial:', data);
            
            this.mostrarHistorial(data.registros || []);
        } catch (error) {
            console.error('Error cargando historial:', error);
            if (this.listaHistorial) {
                this.listaHistorial.innerHTML = `
                    <div class="sin-registros">
                        <box-icon name='error' size="48px" color="#f44336"></box-icon>
                        <p>Error al cargar el historial</p>
                        <p style="font-size: 0.9rem; color: #718096;">${error.message}</p>
                        <button onclick="window.gestorHistorial.cargarHistorial()" 
                                style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Reintentar
                        </button>
                    </div>
                `;
            }
        } finally {
            this.mostrarCargando(false);
        }
    }

    mostrarCargando(mostrar) {
        if (!this.listaHistorial) return;
        
        if (mostrar) {
            this.listaHistorial.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <box-icon name='loader-circle' animation='spin' size="48px" color="#4f46e5"></box-icon>
                    <p style="margin-top: 1rem; color: #64748b;">Cargando historial...</p>
                </div>
            `;
        }
    }

    mostrarHistorial(registros) {
        if (!this.listaHistorial) {
            console.error('Elemento listaHistorial no encontrado');
            return;
        }
        
        if (!registros || registros.length === 0) {
            this.listaHistorial.innerHTML = `
                <div class="sin-registros">
                    <box-icon name='history' size="48px" color="#a0aec0"></box-icon>
                    <p>No hay registros en el historial</p>
                    <p style="font-size: 0.9rem; color: #718096;">Los comandos que ejecutes aparecerán aquí</p>
                </div>
            `;
            return;
        }

        console.log('Mostrando', registros.length, 'registros en el historial');
        
        this.listaHistorial.innerHTML = registros.map(registro => `
            <div class="registro-historial" data-id="${registro.id}">
                <div class="registro-comando">
                    <div class="comando-label">
                        <box-icon name='user-voice' size="16px"></box-icon>
                        Comando del usuario:
                    </div>
                    <div class="comando-texto">${this.escapeHtml(registro.comando_usuario)}</div>
                </div>
                
                <div class="registro-respuesta">
                    <div class="respuesta-label">
                        <box-icon name='bot' size="16px"></box-icon>
                        Respuesta del asistente:
                    </div>
                    <div class="respuesta-texto">${this.escapeHtml(registro.respuesta_asistente)}</div>
                </div>
                
                <div class="registro-footer">
                    <div class="registro-fecha">
                        <box-icon name='calendar' size="16px"></box-icon>
                        ${registro.fecha_hora || 'Fecha no disponible'}
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
        console.log('Buscando en historial:', texto);
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
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.archivo) {
                // Abrir el PDF en nueva pestaña
                window.open(data.archivo, '_blank');
                this.mostrarNotificacion('Reporte PDF generado exitosamente', 'success');
            } else {
                this.mostrarNotificacion('Error al generar el reporte', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            this.mostrarNotificacion('Error al generar el reporte PDF', 'error');
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
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.mensaje) {
                this.mostrarNotificacion('Registro eliminado exitosamente', 'success');
                this.cargarHistorial(); // Recargar la lista
            } else {
                this.mostrarNotificacion('Error eliminando registro', 'error');
            }
        } catch (error) {
            console.error('Error eliminando registro:', error);
            this.mostrarNotificacion('Error al eliminar el registro', 'error');
        }
    }

    editarRegistro(id) {
        const registroElement = document.querySelector(`.registro-historial[data-id="${id}"]`);
        if (!registroElement) {
            this.mostrarNotificacion('Registro no encontrado', 'error');
            return;
        }
        
        const comandoUsuario = registroElement.querySelector('.comando-texto').textContent;
        const respuestaAsistente = registroElement.querySelector('.respuesta-texto').textContent;
        
        const nuevoComando = prompt('Editar lo que dijo el usuario:', comandoUsuario);
        if (nuevoComando === null) return;
        
        const nuevaRespuesta = prompt('Editar la respuesta del asistente:', respuestaAsistente);
        if (nuevaRespuesta === null) return;
        
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
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.mensaje) {
                this.mostrarNotificacion('Registro actualizado exitosamente', 'success');
                this.cargarHistorial();
            } else {
                this.mostrarNotificacion('Error actualizando registro', 'error');
            }
        } catch (error) {
            console.error('Error actualizando registro:', error);
            this.mostrarNotificacion('Error al actualizar el registro', 'error');
        }
    }

    mostrarNotificacion(mensaje, tipo) {
        // Eliminar notificaciones anteriores
        const notificacionesAnteriores = document.querySelectorAll('.notificacion-temporal');
        notificacionesAnteriores.forEach(n => n.remove());
        
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-temporal';
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ${tipo === 'success' ? 'background: #48bb78;' : 
              tipo === 'error' ? 'background: #f56565;' : 
              'background: #4299e1;'}
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        const icono = tipo === 'success' ? 'check-circle' : 
                     tipo === 'error' ? 'error' : 'info-circle';
        
        notificacion.innerHTML = `
            <box-icon name='${icono}' color="white"></box-icon>
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(notificacion);
        
        // Animar entrada
        setTimeout(() => {
            notificacion.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            notificacion.style.opacity = '0';
            notificacion.style.transform = 'translateX(100%)';
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
    
    // Esperar un poco para asegurar que todos los elementos estén cargados
    setTimeout(() => {
        window.gestorHistorial = new GestorHistorial();
        console.log('GestorHistorial inicializado');
        
        // Verificar si estamos en la sección de historial inicialmente
        const seccionHistorial = document.getElementById('seccion-historial');
        if (seccionHistorial && seccionHistorial.classList.contains('activa')) {
            console.log('Sección de historial activa, cargando datos...');
            setTimeout(() => {
                window.gestorHistorial.cargarHistorial();
            }, 1000);
        }
    }, 500);
});

// También configurar para cuando se navega mediante los botones
// Esto se maneja en el dashboard.js, pero agregamos compatibilidad aquí
function cargarHistorialDesdeNavegacion() {
    if (window.gestorHistorial) {
        setTimeout(() => {
            window.gestorHistorial.cargarHistorial();
        }, 300);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.cargarHistorialDesdeNavegacion = cargarHistorialDesdeNavegacion;
}