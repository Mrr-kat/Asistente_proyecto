class DashboardManager {
    constructor() {
        this.charts = {};
        this.data = null;
        this.isInitialized = false;
        this.initialize();
    }

    initialize() {
        console.log('Inicializando DashboardManager...');
        this.initializeElements();
        this.setupEventListeners();
        this.initializeCharts();
        this.isInitialized = true;
        console.log('DashboardManager inicializado');
    }

    initializeElements() {
        console.log('Buscando elementos del dashboard...');
        
        this.btnDashboard = document.getElementById('btn-dashboard');
        this.seccionDashboard = document.getElementById('seccion-dashboard');
        this.btnActualizar = document.getElementById('btn-actualizar-dashboard');
        this.btnDescargarReporte = document.getElementById('btn-descargar-reporte');
        
        // Elementos de datos
        this.totalComandos = document.getElementById('total-comandos');
        this.tasaExito = document.getElementById('tasa-exito');
        this.variacion = document.getElementById('variacion');
        this.ultimoUso = document.getElementById('ultimo-uso');
        
        // Canvas para gráficos
        this.canvasComandosTipo = document.getElementById('grafico-comandos-tipo');
        this.canvasUltimos7Dias = document.getElementById('grafico-ultimos-7-dias');
        this.canvasPorHora = document.getElementById('grafico-por-hora');
        this.canvasTendencias = document.getElementById('grafico-tendencias');
        
        // Tablas
        this.tablaComandosPopulares = document.getElementById('tabla-comandos-populares');
        this.tablaEstadisticasDia = document.getElementById('tabla-estadisticas-dia');
        
        console.log('Elementos encontrados:', {
            btnDashboard: !!this.btnDashboard,
            seccionDashboard: !!this.seccionDashboard,
            btnActualizar: !!this.btnActualizar,
            btnDescargarReporte: !!this.btnDescargarReporte,
            canvaComandosTipo: !!this.canvasComandosTipo
        });
    }

    setupEventListeners() {
        // Configurar navegación (manejar todos los botones aquí)
        this.setupNavigation();
        
        // Eventos específicos del dashboard
        if (this.btnActualizar) {
            this.btnActualizar.addEventListener('click', () => this.cargarDashboard());
        }
        
        if (this.btnDescargarReporte) {
            this.btnDescargarReporte.addEventListener('click', () => this.descargarReporte());
        }
    }

    setupNavigation() {
        console.log('Configurando navegación...');
        
        // Obtener todos los botones de navegación
        const btnAsistente = document.getElementById('btn-asistente');
        const btnHistorial = document.getElementById('btn-historial');
        const btnDashboard = document.getElementById('btn-dashboard');
        
        // Obtener todas las secciones
        const seccionAsistente = document.getElementById('seccion-asistente');
        const seccionHistorial = document.getElementById('seccion-historial');
        const seccionDashboard = document.getElementById('seccion-dashboard');
        
        // Función para mostrar sección
        const mostrarSeccion = (seccion) => {
            console.log('Mostrando sección:', seccion);
            
            // Ocultar todas las secciones
            if (seccionAsistente) seccionAsistente.classList.remove('activa');
            if (seccionHistorial) seccionHistorial.classList.remove('activa');
            if (seccionDashboard) seccionDashboard.classList.remove('activa');
            
            // Remover active de todos los botones
            if (btnAsistente) btnAsistente.classList.remove('active');
            if (btnHistorial) btnHistorial.classList.remove('active');
            if (btnDashboard) btnDashboard.classList.remove('active');
            
            // Mostrar sección seleccionada
            switch(seccion) {
                case 'asistente':
                    if (seccionAsistente) seccionAsistente.classList.add('activa');
                    if (btnAsistente) btnAsistente.classList.add('active');
                    break;
                case 'historial':
                    if (seccionHistorial) seccionHistorial.classList.add('activa');
                    if (btnHistorial) btnHistorial.classList.add('active');
                    // Cargar historial si existe
                    if (window.gestorHistorial) {
                        setTimeout(() => {
                            window.gestorHistorial.cargarHistorial();
                        }, 100);
                    }
                    break;
                case 'dashboard':
                    if (seccionDashboard) seccionDashboard.classList.add('activa');
                    if (btnDashboard) btnDashboard.classList.add('active');
                    // Cargar dashboard después de mostrar
                    setTimeout(() => {
                        this.cargarDashboard();
                    }, 100);
                    break;
            }
        };
        
        // Configurar eventos de navegación
        if (btnAsistente) {
            btnAsistente.addEventListener('click', () => mostrarSeccion('asistente'));
        }
        
        if (btnHistorial) {
            btnHistorial.addEventListener('click', () => mostrarSeccion('historial'));
        }
        
        if (btnDashboard) {
            btnDashboard.addEventListener('click', () => mostrarSeccion('dashboard'));
        }
        
        // Configurar logout
        
        console.log('Navegación configurada');
    }

    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js no está cargado');
            return;
        }

        // Inicializar gráficos vacíos
        if (this.canvasComandosTipo) {
            this.charts.comandosTipo = new Chart(this.canvasComandosTipo.getContext('2d'), {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { responsive: true, plugins: { legend: { position: 'right' } } }
            });
        }

        if (this.canvasUltimos7Dias) {
            this.charts.ultimos7Dias = new Chart(this.canvasUltimos7Dias.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Comandos', data: [], borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.4, fill: true }] },
                options: { responsive: true, scales: { y: { beginAtZero: true } } }
            });
        }

        if (this.canvasPorHora) {
            this.charts.porHora = new Chart(this.canvasPorHora.getContext('2d'), {
                type: 'bar',
                data: { labels: [], datasets: [{ label: 'Comandos por Hora', data: [], backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: '#10b981', borderWidth: 1 }] },
                options: { responsive: true, scales: { y: { beginAtZero: true } } }
            });
        }

        if (this.canvasTendencias) {
            this.charts.tendencias = new Chart(this.canvasTendencias.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Tendencia de Uso', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.4, fill: true }] },
                options: { responsive: true, scales: { y: { beginAtZero: true } } }
            });
        }
        
        console.log('Gráficos inicializados');
    }

    async cargarDashboard() {
        try {
            console.log('Cargando dashboard...');
            this.mostrarCargando(true);
            
            const response = await fetch('/dashboard/estadisticas');
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            this.data = await response.json();
            console.log('Datos recibidos:', this.data);
            
            this.actualizarUI();
            this.actualizarGraficos();
            this.actualizarTablas();
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            this.mostrarNotificacion('Error al cargar dashboard', 'error');
            
            // Mostrar datos de ejemplo para debugging
            this.mostrarDatosEjemplo();
        } finally {
            this.mostrarCargando(false);
        }
    }

    mostrarDatosEjemplo() {
        // Datos de ejemplo para debugging
        this.data = {
            estadisticas: {
                total_comandos: 15,
                comandos_por_tipo: [
                    { comando: "reproduce", cantidad: 5 },
                    { comando: "busca en", cantidad: 4 },
                    { comando: "hora", cantidad: 3 },
                    { comando: "dime", cantidad: 3 }
                ],
                comandos_por_dia: [
                    { dia: "1", cantidad: 3 },
                    { dia: "2", cantidad: 5 },
                    { dia: "3", cantidad: 7 }
                ],
                comandos_ultimos_7_dias: [
                    { fecha: "2024-01-01", cantidad: 2 },
                    { fecha: "2024-01-02", cantidad: 3 },
                    { fecha: "2024-01-03", cantidad: 5 }
                ],
                comandos_por_hora: [
                    { hora: "09", cantidad: 3 },
                    { hora: "14", cantidad: 7 },
                    { hora: "20", cantidad: 5 }
                ],
                ultimo_uso: "Hoy 15:30"
            },
            tendencias: {
                tasa_exito: 85,
                variacion_porcentaje: 12.5,
                tendencias_diarias: [
                    { fecha: "2024-01-01", cantidad: 2 },
                    { fecha: "2024-01-02", cantidad: 3 },
                    { fecha: "2024-01-03", cantidad: 5 }
                ]
            }
        };
        
        this.actualizarUI();
        this.actualizarGraficos();
        this.actualizarTablas();
    }

    actualizarUI() {
        if (!this.data) return;
        
        const { estadisticas, tendencias } = this.data;
        
        if (this.totalComandos) {
            this.totalComandos.textContent = estadisticas.total_comandos?.toLocaleString() || '0';
        }
        
        if (this.tasaExito) {
            this.tasaExito.textContent = `${(tendencias.tasa_exito || 0).toFixed(1)}%`;
        }
        
        if (this.variacion) {
            const variacionValor = tendencias.variacion_porcentaje || 0;
            const variacionText = variacionValor >= 0 
                ? `+${variacionValor.toFixed(1)}%`
                : `${variacionValor.toFixed(1)}%`;
            
            this.variacion.textContent = variacionText;
            this.variacion.style.color = variacionValor >= 0 ? '#10b981' : '#ef4444';
        }
        
        if (this.ultimoUso) {
            this.ultimoUso.textContent = estadisticas.ultimo_uso || 'Nunca';
        }
    }

    actualizarGraficos() {
        if (!this.data || typeof Chart === 'undefined') return;
        
        const { estadisticas, tendencias } = this.data;
        
        // 1. Gráfico de comandos por tipo
        if (this.charts.comandosTipo && estadisticas.comandos_por_tipo && estadisticas.comandos_por_tipo.length > 0) {
            const labels = estadisticas.comandos_por_tipo.map(item => item.comando);
            const data = estadisticas.comandos_por_tipo.map(item => item.cantidad);
            const colors = this.generateColors(labels.length);
            
            this.charts.comandosTipo.data.labels = labels;
            this.charts.comandosTipo.data.datasets[0].data = data;
            this.charts.comandosTipo.data.datasets[0].backgroundColor = colors;
            this.charts.comandosTipo.update();
        }
        
        // 2. Gráfico de últimos 7 días
        if (this.charts.ultimos7Dias && estadisticas.comandos_ultimos_7_dias && estadisticas.comandos_ultimos_7_dias.length > 0) {
            const labels = estadisticas.comandos_ultimos_7_dias.map(item => {
                try {
                    return new Date(item.fecha).toLocaleDateString('es', { weekday: 'short' });
                } catch {
                    return item.fecha;
                }
            });
            const data = estadisticas.comandos_ultimos_7_dias.map(item => item.cantidad);
            
            this.charts.ultimos7Dias.data.labels = labels;
            this.charts.ultimos7Dias.data.datasets[0].data = data;
            this.charts.ultimos7Dias.update();
        }
        
        // 3. Gráfico por hora
        if (this.charts.porHora && estadisticas.comandos_por_hora && estadisticas.comandos_por_hora.length > 0) {
            const labels = estadisticas.comandos_por_hora.map(item => `${item.hora}:00`);
            const data = estadisticas.comandos_por_hora.map(item => item.cantidad);
            
            this.charts.porHora.data.labels = labels;
            this.charts.porHora.data.datasets[0].data = data;
            this.charts.porHora.update();
        }
        
        // 4. Gráfico de tendencias
        if (this.charts.tendencias && tendencias.tendencias_diarias && tendencias.tendencias_diarias.length > 0) {
            const labels = tendencias.tendencias_diarias.map(item => {
                try {
                    return new Date(item.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' });
                } catch {
                    return item.fecha;
                }
            });
            const data = tendencias.tendencias_diarias.map(item => item.cantidad);
            
            this.charts.tendencias.data.labels = labels;
            this.charts.tendencias.data.datasets[0].data = data;
            this.charts.tendencias.update();
        }
    }

    actualizarTablas() {
        if (!this.data) return;
        
        const { estadisticas, tendencias } = this.data;
        
        // Tabla de comandos populares
        if (this.tablaComandosPopulares && estadisticas.comandos_por_tipo && estadisticas.comandos_por_tipo.length > 0) {
            const totalComandos = estadisticas.total_comandos || 1;
            
            const rows = estadisticas.comandos_por_tipo.map(item => `
                <tr>
                    <td>${this.escapeHtml(item.comando)}</td>
                    <td>${item.cantidad}</td>
                    <td>${((item.cantidad / totalComandos) * 100).toFixed(1)}%</td>
                </tr>
            `).join('');
            
            this.tablaComandosPopulares.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Comando</th>
                            <th>Veces Usado</th>
                            <th>Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        }
        
        // Tabla de estadísticas por día
        if (this.tablaEstadisticasDia && estadisticas.comandos_por_dia && estadisticas.comandos_por_dia.length > 0) {
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            
            const maxCantidad = Math.max(...estadisticas.comandos_por_dia.map(d => d.cantidad || 0));
            
            const rows = estadisticas.comandos_por_dia.map(item => `
                <tr>
                    <td>${diasSemana[parseInt(item.dia) || 0]}</td>
                    <td>${item.cantidad || 0}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${((item.cantidad || 0) / (maxCantidad || 1)) * 100}%"></div>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            this.tablaEstadisticasDia.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Día</th>
                            <th>Comandos</th>
                            <th>Distribución</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        }
    }

    async descargarReporte() {
        try {
            const response = await fetch('/dashboard/reporte-detallado');
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-dashboard-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.mostrarNotificacion('Reporte descargado', 'success');
        } catch (error) {
            console.error('Error descargando reporte:', error);
            this.mostrarNotificacion('Error al descargar reporte', 'error');
        }
    }

    generateColors(count) {
        const colors = [
            'rgba(79, 70, 229, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(14, 165, 233, 0.8)',
            'rgba(20, 184, 166, 0.8)'
        ];
        
        if (count <= colors.length) {
            return colors.slice(0, count);
        }
        
        return [...colors, ...Array.from({ length: count - colors.length }, (_, i) => 
            `hsl(${360 * i / Math.max(1, count - colors.length)}, 70%, 65%)`
        )];
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    mostrarCargando(mostrar) {
        const content = this.seccionDashboard?.querySelector('.dashboard-content');
        if (!content) return;
        
        if (mostrar) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <box-icon name='loader-circle' animation='spin' size="48px" color="#4f46e5"></box-icon>
                    <p style="margin-top: 1rem; color: #64748b;">Cargando dashboard...</p>
                </div>
            `;
        } else if (this.data) {
            // Recrear el contenido
            const dashboardHTML = `
                <!-- Tarjetas de resumen -->
                <div class="resumen-cards">
                    <div class="card estadistica-card">
                        <div class="card-icon" style="background: #4f46e5;">
                            <box-icon name='command'></box-icon>
                        </div>
                        <div class="card-content">
                            <h3 id="total-comandos">0</h3>
                            <p>Comandos Totales</p>
                        </div>
                    </div>
                    
                    <div class="card estadistica-card">
                        <div class="card-icon" style="background: #10b981;">
                            <box-icon name='check-circle'></box-icon>
                        </div>
                        <div class="card-content">
                            <h3 id="tasa-exito">0%</h3>
                            <p>Tasa de Éxito</p>
                        </div>
                    </div>
                    
                    <div class="card estadistica-card">
                        <div class="card-icon" style="background: #f59e0b;">
                            <box-icon name='trending-up'></box-icon>
                        </div>
                        <div class="card-content">
                            <h3 id="variacion">0%</h3>
                            <p>Crecimiento Mensual</p>
                        </div>
                    </div>
                    
                    <div class="card estadistica-card">
                        <div class="card-icon" style="background: #ef4444;">
                            <box-icon name='time'></box-icon>
                        </div>
                        <div class="card-content">
                            <h3 id="ultimo-uso">Nunca</h3>
                            <p>Último Uso</p>
                        </div>
                    </div>
                </div>
                
                <!-- Gráficos -->
                <div class="graficos-container">
                    <div class="grafico-card">
                        <h3>Comandos por Tipo</h3>
                        <canvas id="grafico-comandos-tipo"></canvas>
                    </div>
                    
                    <div class="grafico-card">
                        <h3>Uso Últimos 7 Días</h3>
                        <canvas id="grafico-ultimos-7-dias"></canvas>
                    </div>
                    
                    <div class="grafico-card">
                        <h3>Distribución por Hora</h3>
                        <canvas id="grafico-por-hora"></canvas>
                    </div>
                    
                    <div class="grafico-card">
                        <h3>Tendencias Mensuales</h3>
                        <canvas id="grafico-tendencias"></canvas>
                    </div>
                </div>
                
                <!-- Tablas de datos -->
                <div class="tablas-container">
                    <div class="tabla-card">
                        <h3>Comandos Más Usados</h3>
                        <div id="tabla-comandos-populares" class="tabla-datos"></div>
                    </div>
                    
                    <div class="tabla-card">
                        <h3>Estadísticas por Día</h3>
                        <div id="tabla-estadisticas-dia" class="tabla-datos"></div>
                    </div>
                </div>
            `;
            
            content.innerHTML = dashboardHTML;
            
            // Re-inicializar elementos después de recrear el HTML
            this.initializeElements();
            this.initializeCharts();
            this.actualizarUI();
            this.actualizarGraficos();
            this.actualizarTablas();
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
            ${tipo === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
        `;
        notificacion.textContent = mensaje;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.style.opacity = '0';
            setTimeout(() => notificacion.remove(), 300);
        }, 3000);
    }
}

// Inicialización automática cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando dashboard...');
    
    // Verificar que los elementos existan
    const elementosRequeridos = [
        'btn-dashboard',
        'seccion-dashboard'
    ];
    
    const todosExisten = elementosRequeridos.every(id => document.getElementById(id));
    
    if (todosExisten) {
        window.dashboardManager = new DashboardManager();
        console.log('DashboardManager creado exitosamente');
        
        // Verificar si estamos en la sección dashboard inicialmente
        const seccionDashboard = document.getElementById('seccion-dashboard');
        if (seccionDashboard && seccionDashboard.classList.contains('activa')) {
            setTimeout(() => {
                window.dashboardManager.cargarDashboard();
            }, 500);
        }
    } else {
        console.error('Faltan elementos requeridos para el dashboard');
        elementosRequeridos.forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`Elemento no encontrado: ${id}`);
            }
        });
    }
});