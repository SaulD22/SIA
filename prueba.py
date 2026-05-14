
import websocket
import json
import requests
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime
from matplotlib.ticker import MaxNLocator
import os
import threading
import schedule
import time

# --- CONFIGURACIÓN GLOBAL ---
URL_GET_INFO = 'http://localhost:3010/informacion/'
URL_GET_REPORTES = 'http://localhost:3010/graficas'
URL_POST = 'http://localhost:3010/reporte/'
WS_URL = 'ws://localhost:3010/ws'

# =====================================================================
# 1. MOTOR DE GENERACIÓN Y GUARDADO DE GRÁFICAS
# =====================================================================
def generar_y_guardar_grafica(fecha_objetivo, es_cierre_final=False):
    """Descarga datos, filtra por fecha, dibuja y hace el POST al servidor."""
    print(f"\n>> Procesando gráfica para la fecha: {fecha_objetivo} | Cierre Final: {es_cierre_final}")
    
    # Obtener datos
    headers_get = {'User-Agent': 'Mozilla/5.0'}
    res = requests.get(URL_GET_INFO, headers=headers_get)
    
    if res.status_code == 200:
        data = json.loads(res.content)
        df = pd.DataFrame(data)
        
        # Filtrar por la fecha objetivo
        df['fecha_acceso'] = pd.to_datetime(df['fecha_acceso'])
        df_filtrado = df[df['fecha_acceso'].dt.date == fecha_objetivo]
        
        # Lógica de nombres dinámicos
        if es_cierre_final:
            etiqueta = "FINAL"
        else:
            hora_actual = datetime.now().strftime("%H%M")
            etiqueta = f"PARCIAL_{hora_actual}"
            
        nombre_foto = f"grafica_{etiqueta}_{fecha_objetivo}.png"
        
        # Dibujar lienzo
        plt.figure(figsize=(10, 6))
        ax = plt.gca()
        
        if df_filtrado.empty:
            plt.text(0.5, 0.5, f'Sin accesos registrados el {fecha_objetivo}', 
                     horizontalalignment='center', verticalalignment='center', fontsize=12)
        else:
            conteo = df_filtrado['nombre_usuario'].value_counts()
            conteo.plot(kind='bar', color='skyblue', edgecolor='black')
            ax.yaxis.set_major_locator(MaxNLocator(integer=True))
            
        plt.title(f'Frecuencia de Accesos - {fecha_objetivo} ({etiqueta})')
        plt.xlabel('Nombre del Usuario')
        plt.ylabel('Cantidad')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        # Guardar imagen local temporalmente
        plt.savefig(nombre_foto)
        plt.close()
        
        # Leer archivo para envío
        print(">> Subiendo imagen a la base de datos...")
        with open(nombre_foto, 'rb') as f:
            img_data = f.read()
            
        payload = {
            'tipo_grafica': 'frecuencia_id',
            'nombre_archivo': nombre_foto,
            'formato_imagen': 'image/png',
            'datos_binarios': list(img_data)
        }
        
        # POST al servidor (Sin API KEY según el requerimiento de este endpoint)
        headers_post = {"Content-Type": "application/json"}
        res_post = requests.post(URL_POST, json=payload, headers=headers_post)
        
        if res_post.status_code == 200:
            print(f"✅ Éxito: {nombre_foto} respaldada en el servidor.")
        else:
            print(f"⚠️ Error al guardar. Código HTTP: {res_post.status_code}")
            
        # Limpiar computadora
        if os.path.exists(nombre_foto):
            os.remove(nombre_foto)
            
    else:
        print(f"❌ Error descargando datos del servidor. HTTP: {res.status_code}")


# =====================================================================
# 2. SISTEMA DE RELLENADO HISTÓRICO (BACKFILL)
# =====================================================================
def sincronizar_graficas_pasadas():
    """Se ejecuta al iniciar. Detecta días sin gráfica final y las genera."""
    print("\n--- INICIANDO SINCRONIZACIÓN DE DÍAS PASADOS ---")
    headers_get = {'User-Agent': 'Mozilla/5.0'}
    
    # Todos los accesos registrados
    res_info = requests.get(URL_GET_INFO, headers=headers_get)
    if res_info.status_code != 200:
        print("❌ Fallo al obtener historial.")
        return
        
    df_info = pd.DataFrame(json.loads(res_info.content))
    if df_info.empty:
        print("✅ Base de datos vacía. Nada que sincronizar.")
        return
        
    df_info['fecha_acceso'] = pd.to_datetime(df_info['fecha_acceso'])
    fechas_con_accesos = set(df_info['fecha_acceso'].dt.date)
    
    # Gráficas que ya existen en el servidor
    res_rep = requests.get(URL_GET_REPORTES, headers=headers_get)
    fechas_ya_graficadas = set()
    
    if res_rep.status_code == 200:
        reportes = json.loads(res_rep.content)
        for rep in reportes:
            nombre = rep.get('nombre_archivo', '')
            if "FINAL" in nombre:
                try:
                    fecha_str = nombre.split('_FINAL_')[1].replace('.png', '')
                    fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                    fechas_ya_graficadas.add(fecha_obj)
                except:
                    continue
                    
    # Conjuntos: Días con accesos que NO tienen gráfica
    fechas_faltantes = fechas_con_accesos - fechas_ya_graficadas
    hoy = datetime.now().date()
    
    # Ignorar hoy (se hace a las 23:59 automáticamente)
    if hoy in fechas_faltantes:
        fechas_faltantes.remove(hoy)
        
    if not fechas_faltantes:
        print("✅ Todo el historial está al día.")
    else:
        print(f"⚠️ Se encontraron {len(fechas_faltantes)} días faltantes. Recuperando...")
        for fecha_faltante in sorted(fechas_faltantes):
            generar_y_guardar_grafica(fecha_faltante, es_cierre_final=True)
            
    print("--- FIN DE LA SINCRONIZACIÓN ---\n")


# =====================================================================
# 3. EL RELOJ INTERNO (CIERRE DIARIO AUTOMÁTICO)
# =====================================================================
def tarea_cierre_diario():
    hoy = datetime.now().date()
    print(f"\n⏰ [RELOJ INTERNO]: Ejecutando corte de caja definitivo para {hoy}")
    generar_y_guardar_grafica(hoy, es_cierre_final=True)

def iniciar_reloj():
    schedule.every().day.at("23:59").do(tarea_cierre_diario)
    while True:
        schedule.run_pending()
        time.sleep(30)


# =====================================================================
# 4. WEBSOCKET (CONEXIÓN EN TIEMPO REAL)
# =====================================================================
def on_message(ws, message):
    print(f"\n📡 [SEÑAL WEBSOCKET RECIBIDA]: {message}")
    try:
        datos = json.loads(message)
        if datos.get("accion") == "generar_grafica":
            hoy = datetime.now().date()
            # Se ejecuta en un hilo para no congelar la escucha del WebSocket
            hilo = threading.Thread(target=generar_y_guardar_grafica, args=(hoy, False))
            hilo.start()
    except Exception as e:
        print(f"Error procesando mensaje: {e}")

def on_error(ws, error):
    print(f"❌ Error en la conexión WebSocket: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 Conexión WebSocket cerrada.")

def on_open(ws):
    print("✅ ¡Conectado al servidor por WebSocket exitosamente!")
    print("🎧 Esperando peticiones en tiempo real...\n")


# =====================================================================
# FLUJO PRINCIPAL DE EJECUCIÓN
# =====================================================================
if __name__ == "__main__":
    print("========================================")
    print("  INICIANDO WORKER DE ANÁLISIS DE DATOS ")
    print("========================================\n")
    
    # PASO 1: Recuperar el pasado
    sincronizar_graficas_pasadas()
    
    # PASO 2: Encender reloj diario (en segundo plano)
    hilo_reloj = threading.Thread(target=iniciar_reloj, daemon=True)
    hilo_reloj.start()
    
    # PASO 3: Mantener abierta la conexión WebSocket para reportes parciales
    wsapp = websocket.WebSocketApp(WS_URL,
                                   on_open=on_open,
                                   on_message=on_message,
                                   on_error=on_error,
                                   on_close=on_close)
    wsapp.run_forever()
