from sqlalchemy.orm import Session
from sqlalchemy import func
from db.models import HistorialInteraccion, EstadisticasUsuario
from datetime import datetime, timedelta
from typing import Dict, List, Any

class EstadisticasService:
    
    @staticmethod
    def obtener_estadisticas_generales(db: Session, usuario_id: int) -> Dict[str, Any]:
        """Obtener estadísticas generales del usuario"""
        try:
            # Total de comandos ejecutados
            total_comandos = db.query(HistorialInteraccion).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True
            ).count()
            
            # Comandos por tipo
            comandos_por_tipo = db.query(
                HistorialInteraccion.comando_ejecutado,
                func.count(HistorialInteraccion.id).label('cantidad')
            ).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True
            ).group_by(
                HistorialInteraccion.comando_ejecutado
            ).order_by(func.count(HistorialInteraccion.id).desc()).all()
            
            # Comandos por día de la semana
            comandos_por_dia = db.query(
                func.strftime('%w', HistorialInteraccion.fecha_hora).label('dia'),
                func.count(HistorialInteraccion.id).label('cantidad')
            ).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True
            ).group_by('dia').all()
            
            # Últimos 7 días
            fecha_limite = datetime.now() - timedelta(days=7)
            comandos_ultimos_7_dias = db.query(
                func.date(HistorialInteraccion.fecha_hora).label('fecha'),
                func.count(HistorialInteraccion.id).label('cantidad')
            ).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True,
                HistorialInteraccion.fecha_hora >= fecha_limite
            ).group_by('fecha').order_by('fecha').all()
            
            # Comandos por hora del día
            comandos_por_hora = db.query(
                func.strftime('%H', HistorialInteraccion.fecha_hora).label('hora'),
                func.count(HistorialInteraccion.id).label('cantidad')
            ).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True
            ).group_by('hora').order_by('hora').all()
            
            # Último uso
            ultimo_uso = db.query(HistorialInteraccion).filter(
                HistorialInteraccion.usuario_id == usuario_id
            ).order_by(HistorialInteraccion.fecha_hora.desc()).first()
            
            # Comando más usado
            comando_mas_usado = None
            if comandos_por_tipo:
                comando_mas_usado = {
                    "comando": comandos_por_tipo[0][0],
                    "cantidad": comandos_por_tipo[0][1]
                }
            
            # Hora pico
            hora_pico = None
            if comandos_por_hora:
                max_item = max(comandos_por_hora, key=lambda x: x[1])
                hora_pico = {
                    "hora": max_item[0],
                    "cantidad": max_item[1]
                }
            
            return {
                "total_comandos": total_comandos,
                "comandos_por_tipo": [{"comando": c[0], "cantidad": c[1]} for c in comandos_por_tipo],
                "comandos_por_dia": [{"dia": c[0], "cantidad": c[1]} for c in comandos_por_dia],
                "comandos_ultimos_7_dias": [{"fecha": str(c[0]), "cantidad": c[1]} for c in comandos_ultimos_7_dias],
                "comandos_por_hora": [{"hora": c[0], "cantidad": c[1]} for c in comandos_por_hora],
                "ultimo_uso": ultimo_uso.fecha_hora.strftime("%d/%m/%Y %I:%M %p") if ultimo_uso else "Nunca",
                "comando_mas_usado": comando_mas_usado,
                "hora_pico": hora_pico
            }
        except Exception as e:
            print(f"Error obteniendo estadísticas: {e}")
            return {
                "total_comandos": 0,
                "comandos_por_tipo": [],
                "comandos_por_dia": [],
                "comandos_ultimos_7_dias": [],
                "comandos_por_hora": [],
                "ultimo_uso": "Nunca",
                "comando_mas_usado": None,
                "hora_pico": None
            }
    
    @staticmethod
    def obtener_tendencias(db: Session, usuario_id: int, dias: int = 30) -> Dict[str, Any]:
        """Obtener tendencias de uso"""
        try:
            fecha_limite = datetime.now() - timedelta(days=dias)
            
            # Comandos por día
            comandos_por_dia = db.query(
                func.date(HistorialInteraccion.fecha_hora).label('fecha'),
                func.count(HistorialInteraccion.id).label('cantidad')
            ).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True,
                HistorialInteraccion.fecha_hora >= fecha_limite
            ).group_by('fecha').order_by('fecha').all()
            
            # Tasa de éxito (simplificada)
            total_dias = len(comandos_por_dia)
            tasa_exito = 95 if total_dias > 0 else 0  # Valor simulado
            
            # Mes actual vs mes anterior
            hoy = datetime.now()
            primer_dia_mes_actual = datetime(hoy.year, hoy.month, 1)
            
            if hoy.month > 1:
                primer_dia_mes_anterior = datetime(hoy.year, hoy.month - 1, 1)
            else:
                primer_dia_mes_anterior = datetime(hoy.year - 1, 12, 1)
            
            comandos_mes_actual = db.query(HistorialInteraccion).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True,
                HistorialInteraccion.fecha_hora >= primer_dia_mes_actual
            ).count()
            
            comandos_mes_anterior = db.query(HistorialInteraccion).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                HistorialInteraccion.activo == True,
                HistorialInteraccion.fecha_hora >= primer_dia_mes_anterior,
                HistorialInteraccion.fecha_hora < primer_dia_mes_actual
            ).count()
            
            variacion = 0
            if comandos_mes_anterior > 0:
                variacion = ((comandos_mes_actual - comandos_mes_anterior) / comandos_mes_anterior) * 100
            
            # Calcular promedio diario
            suma_comandos = sum(c[1] for c in comandos_por_dia)
            promedio_diario = suma_comandos / len(comandos_por_dia) if comandos_por_dia else 0
            
            return {
                "tendencias_diarias": [{"fecha": str(c[0]), "cantidad": c[1]} for c in comandos_por_dia],
                "tasa_exito": tasa_exito,
                "comandos_mes_actual": comandos_mes_actual,
                "comandos_mes_anterior": comandos_mes_anterior,
                "variacion_porcentaje": variacion,
                "promedio_diario": promedio_diario
            }
        except Exception as e:
            print(f"Error obteniendo tendencias: {e}")
            return {
                "tendencias_diarias": [],
                "tasa_exito": 0,
                "comandos_mes_actual": 0,
                "comandos_mes_anterior": 0,
                "variacion_porcentaje": 0,
                "promedio_diario": 0
            }
    
    @staticmethod
    def registrar_estadistica_diaria(db: Session, usuario_id: int):
        """Registrar estadísticas diarias del usuario"""
        try:
            hoy = datetime.now().date()
            
            # Contar comandos del día
            comandos_hoy = db.query(HistorialInteraccion).filter(
                HistorialInteraccion.usuario_id == usuario_id,
                func.date(HistorialInteraccion.fecha_hora) == hoy
            ).count()
            
            # Buscar o crear registro del día
            estadistica = db.query(EstadisticasUsuario).filter(
                EstadisticasUsuario.usuario_id == usuario_id,
                func.date(EstadisticasUsuario.fecha) == hoy
            ).first()
            
            if not estadistica:
                estadistica = EstadisticasUsuario(
                    usuario_id=usuario_id,
                    comandos_ejecutados=comandos_hoy,
                    fecha=datetime.now()
                )
                db.add(estadistica)
            else:
                estadistica.comandos_ejecutados = comandos_hoy
            
            db.commit()
            return estadistica
        except Exception as e:
            print(f"Error registrando estadística diaria: {e}")
            db.rollback()
            return None