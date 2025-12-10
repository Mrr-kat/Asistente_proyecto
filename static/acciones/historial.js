// historial.js (COMPLETO CORREGIDO)
class GestorHistorial {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.cargarElementos();
        this.configurarEventosHistorial();
        this.observarCambiosSeccion();
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
    }

    observarCambiosSeccion() {
        // Observar cuando se activa la sección de historial
        if (this.seccionHistorial) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        if (this.seccionHistorial.classList.contains('activa')) {
                            console.log('Sección historial activada, cargando datos...');
                            setTimeout(() => {
                                this.cargarHistorial();
                            }, 300);
                        }
                    }
                });
            });
            
            observer.observe(this.seccionHistorial, { attributes: true });
        }
    }

    async cargarHistorial(busqueda = '') {
        try {
            console.log('Cargando historial...');
            this.mostrarCargando(true);
            
            const url = busqueda ? `/historial?buscar=${encodeURIComponent(busqueda)}` : '/historial';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Registros recibidos:', data.registros?.length || 0);
            
            this.mostrarHistorial(data.registros || []);
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.mostrarError('Error al cargar el historial');
        } finally {
            this.mostrarCargando(false);
        }
    }

    mostrarCargando(mostrar) {
        if (!this.listaHistorial) return;
        
        if (mostrar) {
            this.listaHistorial.innerHTML = `
                <div class="cargando-historial">
                    <box-icon name='loader-circle' animation='spin' size="48px" color="#4f46e5"></box-icon>
                    <p>Cargando historial...</p>
                </div>
            `;
            
            // Agregar estilos si no existen
            if (!document.querySelector('#estilos-cargando')) {
                const style = document.createElement('style');
                style.id = 'estilos-cargando';
                style.textContent = `
                    .cargando-historial {
                        text-align: center;
                        padding: 3rem;
                        color: #64748b;
                    }
                    .cargando-historial box-icon {
                        margin-bottom: 1rem;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    mostrarError(mensaje) {
        if (!this.listaHistorial) return;
        
        this.listaHistorial.innerHTML = `
            <div class="error-historial">
                <box-icon name='error' size="48px" color="#f44336"></box-icon>
                <p>${mensaje}</p>
                <button class="btn-reintentar" onclick="window.gestorHistorial.cargarHistorial()">
                    Reintentar
                </button>
            </div>
        `;
        
        // Agregar estilos si no existen
        if (!document.querySelector('#estilos-error')) {
            const style = document.createElement('style');
            style.id = 'estilos-error';
            style.textContent = `
                .error-historial {
                    text-align: center;
                    padding: 3rem;
                    color: #64748b;
                }
                .error-historial box-icon {
                    margin-bottom: 1rem;
                }
                .btn-reintentar {
                    margin-top: 1rem;
                    padding: 0.75rem 1.5rem;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                .btn-reintentar:hover {
                    background: #45a049;
                    transform: translateY(-2px);
                }
            `;
            document.head.appendChild(style);
        }
    }

    mostrarHistorial(registros) {
        if (!this.listaHistorial) {
            console.error('Elemento lista-historial no encontrado');
            return;
        }
        
        if (!registros || registros.length === 0) {
            this.listaHistorial.innerHTML = `
                <div class="sin-registros">
                    <box-icon name='history' size="48px" color="#a0aec0"></box-icon>
                    <p>No hay registros en el historial</p>
                    <p class="subtitulo">Los comandos que ejecutes aparecerán aquí</p>
                </div>
            `;
            
            // Agregar estilos si no existen
            if (!document.querySelector('#estilos-sin-registros')) {
                const style = document.createElement('style');
                style.id = 'estilos-sin-registros';
                style.textContent = `
                    .sin-registros {
                        text-align: center;
                        padding: 3rem;
                        color: #a0aec0;
                    }
                    .sin-registros box-icon {
                        margin-bottom: 1rem;
                    }
                    .sin-registros .subtitulo {
                        font-size: 0.9rem;
                        color: #718096;
                        margin-top: 0.5rem;
                    }
                `;
                document.head.appendChild(style);
            }
            return;
        }

        this.listaHistorial.innerHTML = registros.map(registro => `
            <div class="registro-historial" data-id="${registro.id}">
                <div class="registro-header">
                    <div class="registro-tipo">
                        <box-icon name='${this.obtenerIconoTipo(registro.comando_ejecutado)}' 
                                 size="18px" color="#4f46e5"></box-icon>
                        <span class="tipo-texto">${this.formatearTipoComando(registro.comando_ejecutado)}</span>
                    </div>
                    <span class="registro-fecha">
                        <box-icon name='calendar' size="14px"></box-icon>
                        ${registro.fecha_hora}
                    </span>
                </div>
                
                <div class="registro-comando">
                    <div class="comando-label">
                        <box-icon name='user-voice' size="14px"></box-icon>
                        <span>Usuario dijo:</span>
                    </div>
                    <div class="comando-texto" contenteditable="false">${this.escapeHtml(registro.comando_usuario)}</div>
                </div>
                
                <div class="registro-respuesta">
                    <div class="respuesta-label">
                        <box-icon name='bot' size="14px"></box-icon>
                        <span>Asistente respondió:</span>
                    </div>
                    <div class="respuesta-texto" contenteditable="false">${this.escapeHtml(registro.respuesta_asistente)}</div>
                </div>
                
                <div class="registro-actions">
                    <button class="btn-editar" onclick="window.gestorHistorial.iniciarEdicion(${registro.id})" 
                            title="Editar registro">
                        <box-icon name='edit' size="16px"></box-icon>
                        <span>Editar</span>
                    </button>
                    <button class="btn-guardar" onclick="window.gestorHistorial.guardarEdicion(${registro.id})" 
                            title="Guardar cambios" style="display: none;">
                        <box-icon name='save' size="16px"></box-icon>
                        <span>Guardar</span>
                    </button>
                    <button class="btn-cancelar" onclick="window.gestorHistorial.cancelarEdicion(${registro.id})" 
                            title="Cancelar edición" style="display: none;">
                        <box-icon name='x' size="16px"></box-icon>
                        <span>Cancelar</span>
                    </button>
                    <button class="btn-eliminar" onclick="window.gestorHistorial.eliminarRegistro(${registro.id})" 
                            title="Eliminar registro">
                        <box-icon name='trash' size="16px"></box-icon>
                        <span>Eliminar</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    obtenerIconoTipo(tipoComando) {
        const iconos = {
            'reproduce': 'play-circle',
            'busca en youtube': 'youtube',
            'hora': 'time',
            'busca en google': 'search',
            'busca en wikipedia': 'book',
            'informacion': 'info-circle'
        };
        return iconos[tipoComando] || 'command';
    }

    formatearTipoComando(tipoComando) {
        const nombres = {
            'reproduce': 'Reproducir',
            'busca en youtube': 'Buscar en YouTube',
            'hora': 'Consulta de hora',
            'busca en google': 'Buscar en Google',
            'busca en wikipedia': 'Consulta Wikipedia',
            'informacion': 'Información'
        };
        return nombres[tipoComando] || tipoComando;
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
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.archivo) {
                // Abrir el PDF en nueva pestaña
                window.open(data.archivo, '_blank');
                this.mostrarNotificacion('✅ Reporte PDF generado exitosamente', 'success');
            } else {
                throw new Error('No se generó el archivo');
            }
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            this.mostrarNotificacion('❌ Error al generar el reporte PDF', 'error');
        }
    }

    async eliminarRegistro(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro?\nEsta acción no se puede deshacer.')) {
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
                this.mostrarNotificacion('✅ Registro eliminado exitosamente', 'success');
                this.cargarHistorial(); // Recargar la lista
            } else {
                this.mostrarNotificacion('❌ Error eliminando registro', 'error');
            }
        } catch (error) {
            console.error('Error eliminando registro:', error);
            this.mostrarNotificacion('❌ Error al eliminar el registro', 'error');
        }
    }

    iniciarEdicion(id) {
        const registroElement = document.querySelector(`.registro-historial[data-id="${id}"]`);
        if (!registroElement) return;
        
        // Habilitar edición
        const comandoTexto = registroElement.querySelector('.comando-texto');
        const respuestaTexto = registroElement.querySelector('.respuesta-texto');
        
        comandoTexto.setAttribute('contenteditable', 'true');
        respuestaTexto.setAttribute('contenteditable', 'true');
        
        comandoTexto.style.border = '2px solid #4f46e5';
        respuestaTexto.style.border = '2px solid #4f46e5';
        comandoTexto.style.padding = '10px';
        respuestaTexto.style.padding = '10px';
        comandoTexto.style.borderRadius = '5px';
        respuestaTexto.style.borderRadius = '5px';
        comandoTexto.style.backgroundColor = '#f8fafc';
        respuestaTexto.style.backgroundColor = '#f8fafc';
        
        // Mostrar botones de guardar/cancelar, ocultar editar/eliminar
        registroElement.querySelector('.btn-editar').style.display = 'none';
        registroElement.querySelector('.btn-eliminar').style.display = 'none';
        registroElement.querySelector('.btn-guardar').style.display = 'flex';
        registroElement.querySelector('.btn-cancelar').style.display = 'flex';
        
        // Guardar contenido original
        comandoTexto.dataset.original = comandoTexto.textContent;
        respuestaTexto.dataset.original = respuestaTexto.textContent;
        
        // Enfocar el primer campo editable
        comandoTexto.focus();
    }

    cancelarEdicion(id) {
        const registroElement = document.querySelector(`.registro-historial[data-id="${id}"]`);
        if (!registroElement) return;
        
        // Restaurar contenido original
        const comandoTexto = registroElement.querySelector('.comando-texto');
        const respuestaTexto = registroElement.querySelector('.respuesta-texto');
        
        if (comandoTexto.dataset.original) {
            comandoTexto.textContent = comandoTexto.dataset.original;
        }
        if (respuestaTexto.dataset.original) {
            respuestaTexto.textContent = respuestaTexto.dataset.original;
        }
        
        this.finalizarEdicion(registroElement);
    }

    async guardarEdicion(id) {
        const registroElement = document.querySelector(`.registro-historial[data-id="${id}"]`);
        if (!registroElement) return;
        
        const comandoTexto = registroElement.querySelector('.comando-texto');
        const respuestaTexto = registroElement.querySelector('.respuesta-texto');
        
        const nuevoComando = comandoTexto.textContent.trim();
        const nuevaRespuesta = respuestaTexto.textContent.trim();
        
        if (!nuevoComando || !nuevaRespuesta) {
            this.mostrarNotificacion('❌ Ambos campos son requeridos', 'error');
            return;
        }
        
        try {
            const datos = {
                comando_usuario: nuevoComando,
                respuesta_asistente: nuevaRespuesta
            };
            
            this.mostrarNotificacion('⏳ Guardando cambios...', 'info');
            
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
                this.mostrarNotificacion('✅ Registro actualizado exitosamente', 'success');
                this.finalizarEdicion(registroElement, false);
                
                // Actualizar datos locales
                comandoTexto.dataset.original = nuevoComando;
                respuestaTexto.dataset.original = nuevaRespuesta;
            } else {
                this.mostrarNotificacion('❌ Error actualizando registro', 'error');
            }
        } catch (error) {
            console.error('Error actualizando registro:', error);
            this.mostrarNotificacion('❌ Error al actualizar el registro', 'error');
        }
    }

    finalizarEdicion(registroElement, mantenerCambios = true) {
        const comandoTexto = registroElement.querySelector('.comando-texto');
        const respuestaTexto = registroElement.querySelector('.respuesta-texto');
        
        // Deshabilitar edición
        comandoTexto.setAttribute('contenteditable', 'false');
        respuestaTexto.setAttribute('contenteditable', 'false');
        
        // Remover estilos
        comandoTexto.style.border = '';
        respuestaTexto.style.border = '';
        comandoTexto.style.padding = '';
        respuestaTexto.style.padding = '';
        comandoTexto.style.backgroundColor = '';
        respuestaTexto.style.backgroundColor = '';
        
        // Mostrar botones normales
        registroElement.querySelector('.btn-editar').style.display = 'flex';
        registroElement.querySelector('.btn-eliminar').style.display = 'flex';
        registroElement.querySelector('.btn-guardar').style.display = 'none';
        registroElement.querySelector('.btn-cancelar').style.display = 'none';
    }

    mostrarNotificacion(mensaje, tipo) {
        // Remover notificaciones anteriores
        const notificacionesAnteriores = document.querySelectorAll('.notificacion-flotante');
        notificacionesAnteriores.forEach(notif => notif.remove());
        
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-flotante';
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ${tipo === 'success' ? 'background: linear-gradient(135deg, #48bb78, #38a169);' : 
              tipo === 'error' ? 'background: linear-gradient(135deg, #f56565, #e53e3e);' : 
              'background: linear-gradient(135deg, #4299e1, #3182ce);'}
        `;
        
        notificacion.innerHTML = `
            <box-icon name='${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'error' : 'info-circle'}' 
                     color="white" size="20px"></box-icon>
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(notificacion);
        
        // Animar entrada
        setTimeout(() => {
            notificacion.style.transform = 'translateX(0)';
            notificacion.style.opacity = '1';
        }, 10);
        
        // Configurar animación de salida
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

// Inicializar automáticamente cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando gestor de historial...');
    
    // Esperar un momento para asegurar que todos los elementos estén cargados
    setTimeout(() => {
        window.gestorHistorial = new GestorHistorial();
        
        // Cargar historial si estamos en la sección activa
        const seccionHistorial = document.getElementById('seccion-historial');
        if (seccionHistorial && seccionHistorial.classList.contains('activa')) {
            console.log('Historial ya activo, cargando datos...');
            window.gestorHistorial.cargarHistorial();
        }
        
        console.log('Gestor de historial inicializado correctamente');
    }, 500);
});

// Asegurar que se pueda acceder desde la consola para debugging
if (typeof window !== 'undefined') {
    window.GestorHistorial = GestorHistorial;
}