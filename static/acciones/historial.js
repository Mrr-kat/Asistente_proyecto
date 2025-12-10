class GestorHistorial {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.cargarElementos();
        this.configurarEventosHistorial();
    }

    cargarElementos() {
        // Solo elementos del historial
        this.buscarInput = document.getElementById('buscar-historial');
        this.btnBuscar = document.getElementById('btn-buscar');
        this.btnGenerarReporte = document.getElementById('btn-generar-reporte');
        this.listaHistorial = document.getElementById('lista-historial');
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

    async cargarHistorial(busqueda = '') {
        try {
            const url = busqueda ? `/historial?buscar=${encodeURIComponent(busqueda)}` : '/historial';
            const response = await fetch(url);
            const data = await response.json();
            
            this.mostrarHistorial(data.registros);
        } catch (error) {
            console.error('Error cargando historial:', error);
            if (this.listaHistorial) {
                this.listaHistorial.innerHTML = '<div class="sin-registros">Error al cargar el historial</div>';
            }
        }
    }

    mostrarHistorial(registros) {
        if (!this.listaHistorial) return;
        
        if (!registros || registros.length === 0) {
            this.listaHistorial.innerHTML = '<div class="sin-registros">No hay registros en el historial</div>';
            return;
        }

        this.listaHistorial.innerHTML = registros.map(registro => `
            <div class="registro-historial" data-id="${registro.id}">
                <div class="registro-comando">
                    <div class="comando-label">Usuario:</div>
                    <div class="comando-texto">${this.escapeHtml(registro.comando_usuario)}</div>
                </div>
                
                <div class="registro-respuesta">
                    <div class="respuesta-label">Respuesta asistente:</div>
                    <div class="respuesta-texto">${this.escapeHtml(registro.respuesta_asistente)}</div>
                </div>
                
                <div class="registro-footer">
                    <div class="registro-fecha">
                        <box-icon name='calendar' size="16px"></box-icon>
                        ${registro.fecha_hora}
                    </div>
                    <div class="registro-actions">
                        <button class="btn-editar" onclick="gestorHistorial.editarRegistro(${registro.id})" title="Editar">
                            <box-icon name='edit' size="18px"></box-icon>
                        </button>
                        <button class="btn-eliminar" onclick="gestorHistorial.eliminarRegistro(${registro.id})" title="Eliminar">
                            <box-icon name='trash' size="18px"></box-icon>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    buscarHistorial() {
        const texto = this.buscarInput.value.trim();
        this.cargarHistorial(texto);
    }

    async generarReportePDF() {
        try {
            const response = await fetch('/historial/reportes/pdf', { method: 'POST' });
            const data = await response.json();
            
            if (data.archivo) {
                window.open(data.archivo, '_blank');
                alert('Reporte PDF generado exitosamente');
            }
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            alert('Error al generar el reporte PDF');
        }
    }

    async eliminarRegistro(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            return;
        }

        try {
            const response = await fetch(`/historial/${id}`, { method: 'DELETE' });
            const data = await response.json();
            
            if (data.mensaje) {
                this.mostrarNotificacion('Registro eliminado exitosamente', 'success');
                this.cargarHistorial();
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
        if (!registroElement) return;
        
        const comandoUsuario = registroElement.querySelector('.comando-texto').textContent;
        const respuestaAsistente = registroElement.querySelector('.respuesta-texto').textContent;
        
        const nuevoComando = prompt('Editar lo que dijo el usuario:', comandoUsuario);
        const nuevaRespuesta = prompt('Editar la respuesta del asistente:', respuestaAsistente);
        
        if (nuevoComando !== null || nuevaRespuesta !== null) {
            this.actualizarRegistro(id, nuevoComando, nuevaRespuesta);
        }
    }

    async actualizarRegistro(id, comandoUsuario, respuestaAsistente) {
        try {
            const datos = {};
            if (comandoUsuario !== null) datos.comando_usuario = comandoUsuario;
            if (respuestaAsistente !== null) datos.respuesta_asistente = respuestaAsistente;
            
            const response = await fetch(`/historial/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            
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
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
            ${tipo === 'success' ? 'background: #48bb78;' : 'background: #f56565;'}
        `;
        notificacion.textContent = mensaje;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.style.opacity = '0';
            setTimeout(() => notificacion.remove(), 300);
        }, 3000);
    }
}