import sqlite3
import pandas as pd
import random
from datetime import datetime, timedelta

# Configuración de reproducibilidad
random.seed(42)

DB_NAME = "evaluacion360.db"
SCHEMA_FILE = "schema.sql"
CSV_FILE = "datos_evaluacion_360.csv"

# 1. DATOS INICIALES
COMPETENCIAS = [
    {
        "nombre": "Liderazgo",
        "descripcion": "Capacidad para guiar, motivar e inspirar a equipos de trabajo hacia el logro de metas institucionales."
    },
    {
        "nombre": "Comunicación Efectiva",
        "descripcion": "Habilidad para transmitir ideas con claridad, asertividad y practicar la escucha activa."
    },
    {
        "nombre": "Pedagogía y Gestión",
        "descripcion": "Dominio metodológico en el aula y eficiencia en la gestión de procesos académicos/administrativos."
    },
    {
        "nombre": "Trabajo en Equipo",
        "descripcion": "Disposición para colaborar de manera empática, respetuosa y proactiva con compañeros de trabajo."
    },
    {
        "nombre": "Puntualidad y Compromiso",
        "descripcion": "Cumplimiento oportuno de horarios, compromisos laborales y adhesión a los valores institucionales."
    }
]

NOMBRES_MAESTROS = [
    "Carlos Mendoza", "Ana Lucía Torres", "Roberto Gómez", "Elena Rostova", "Fernando Silva",
    "Sofía Hernández", "Javier Morales", "Patricia Aguilar", "Gabriel Castro", "Valeria Ríos",
    "Hugo Ortega", "Beatriz Vargas", "Diego Navarro", "Carmen Delgado", "Guillermo Peña",
    "Isabel Romero", "Manuel Guerrero", "Natalia Reyes", "Alejandro Ruiz", "Lorena Benítez"
]

NOMBRES_ADMINISTRATIVOS = [
    "Ricardo Palacios", "Claudia Ramírez", "Esteban Fuentes", "Mariana Solís",
    "Andrés Molina", "Pilar Fernández", "Gonzalo Ibáñez", "Teresa Campos"
]

NOMBRES_DIRECTIVOS = [
    "Dra. Beatriz Villaseñor", "Dr. Alejandro de la Vega"
]

DEPARTAMENTOS_ACADEMICOS = ["Matemáticas", "Ciencias Exactas", "Humanidades", "Idiomas", "Tecnología e Informática"]
DEPARTAMENTOS_ADMINISTRATIVOS = ["Recursos Humanos", "Servicios Escolares", "Finanzas", "Admisiones"]
DEPARTAMENTOS_DIRECTIVOS = ["Dirección Académica", "Dirección General"]

# Comentarios plantilla según nivel de calificación
COMENTARIOS_POR_CALIFICACION = {
    5: [
        "Demuestra un desempeño sobresaliente y es un referente positivo en la institución.",
        "Excelente manejo de sus responsabilidades, supera constantemente las expectativas.",
        "Su aporte y liderazgo son fundamentales para el éxito del equipo.",
        "Gran capacidad resolutiva y trato sumamente profesional con todos.",
        "Puntualidad impecable y actitud ejemplar en todas sus actividades."
    ],
    4: [
        "Muy buen desempeño general, cumple de forma constante con los objetivos.",
        "Muestra compromiso con sus funciones y mantiene buena comunicación.",
        "Buen trabajo colaborativo con apertura a sugerencias de mejora.",
        "Maneja adecuadamente los grupos y demuestra sólido conocimiento en su área.",
        "Entregas oportunas y buena disposición frente a nuevos retos."
    ],
    3: [
        "Desempeño aceptable en sus funciones habituales, dentro del promedio esperado.",
        "Cumple con lo requerido, aunque podría mostrar mayor iniciativa en ciertos proyectos.",
        "Su comunicación es adecuada, pero a veces falta mayor seguimiento a los compromisos.",
        "Mantiene un ritmo constante, recomendable reforzar habilidades en esta área.",
        "Generalmente puntual, con oportunidades de optimizar sus tiempos de respuesta."
    ],
    2: [
        "Requiere fortalecer esta competencia para alcanzar el estándar de la institución.",
        "Se observan inconsistencias en el cumplimiento oportuno de tareas.",
        "Le cuesta trabajo integrarse en actividades colaborativas de su departamento.",
        "Es necesario mejorar la claridad en la transmisión de instrucciones o reportes.",
        "Requiere apoyo de supervisión para estructurar mejor sus prioridades."
    ],
    1: [
        "Área crítica de oportunidad que requiere plan de acción inmediato.",
        "Dificultades severas en la integración y cumplimiento de metas básicas.",
        "Falta recurrente de puntualidad o seguimiento a acuerdos establecidos.",
        "Genera fricción en el equipo debido a deficiencias en la comunicación.",
        "No cumple con los criterios mínimos evaluados en esta dimensión."
    ]
}

def init_database():
    """Ejecuta el archivo schema.sql para recrear las tablas e índices."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    cursor.executescript(schema_sql)
    conn.commit()
    conn.close()
    print(f"[OK] Base de datos '{DB_NAME}' inicializada con '{SCHEMA_FILE}'.")

def generate_users():
    """Genera 30 usuarios (20 maestros, 8 administrativos, 2 directivos)."""
    users = []
    
    # 2 Directivos
    for i, nombre in enumerate(NOMBRES_DIRECTIVOS):
        dept = DEPARTAMENTOS_DIRECTIVOS[i % len(DEPARTAMENTOS_DIRECTIVOS)]
        fecha_ingreso = (datetime.now() - timedelta(days=random.randint(1500, 3000))).strftime("%Y-%m-%d")
        users.append((nombre, "Directivo", dept, fecha_ingreso))
        
    # 8 Administrativos
    for i, nombre in enumerate(NOMBRES_ADMINISTRATIVOS):
        dept = DEPARTAMENTOS_ADMINISTRATIVOS[i % len(DEPARTAMENTOS_ADMINISTRATIVOS)]
        fecha_ingreso = (datetime.now() - timedelta(days=random.randint(500, 2000))).strftime("%Y-%m-%d")
        users.append((nombre, "Administrativo", dept, fecha_ingreso))
        
    # 20 Maestros
    for i, nombre in enumerate(NOMBRES_MAESTROS):
        dept = DEPARTAMENTOS_ACADEMICOS[i % len(DEPARTAMENTOS_ACADEMICOS)]
        fecha_ingreso = (datetime.now() - timedelta(days=random.randint(300, 2500))).strftime("%Y-%m-%d")
        users.append((nombre, "Maestro", dept, fecha_ingreso))

    return users

def seed_data():
    init_database()
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Insertar Competencias
    for comp in COMPETENCIAS:
        cursor.execute(
            "INSERT INTO competencias (nombre_competencia, descripcion) VALUES (?, ?)",
            (comp["nombre"], comp["descripcion"])
        )
    conn.commit()
    print(f"[OK] {len(COMPETENCIAS)} competencias insertadas.")

    # 2. Insertar Usuarios
    raw_users = generate_users()
    cursor.executemany(
        "INSERT INTO usuarios (nombre, rol, departamento, fecha_ingreso) VALUES (?, ?, ?, ?)",
        raw_users
    )
    conn.commit()
    print(f"[OK] {len(raw_users)} usuarios insertados.")

    # Obtener usuarios agrupados por rol
    cursor.execute("SELECT id, nombre, rol, departamento FROM usuarios")
    all_users = cursor.fetchall()
    
    directivos = [u for u in all_users if u[2] == "Directivo"]
    administrativos = [u for u in all_users if u[2] == "Administrativo"]
    maestros = [u for u in all_users if u[2] == "Maestro"]

    cursor.execute("SELECT id, nombre_competencia FROM competencias")
    competencias_db = cursor.fetchall()

    evaluaciones = []
    fecha_base = datetime.now() - timedelta(days=30)

    # Perfil de sesgo de desempeño por usuario para hacer los datos creíbles
    # (algunos colaboradores son brillantes, otros promedio, otros con áreas de mejora)
    user_performance_profile = {}
    for u in all_users:
        u_id = u[0]
        # Media de calificación entre 3.2 y 4.8
        user_performance_profile[u_id] = {
            "base_score": random.choice([3.2, 3.6, 4.0, 4.3, 4.7]),
            "self_bias": random.choice([0.2, 0.4, 0.0, -0.2]) # sesgo de autoevaluación
        }

    def generar_calificacion(evaluado_id, tipo_relacion):
        profile = user_performance_profile[evaluado_id]
        mean = profile["base_score"]
        if tipo_relacion == "Autoevaluación":
            mean += profile["self_bias"]
        elif tipo_relacion == "Jefe":
            mean += random.uniform(-0.1, 0.2)
        elif tipo_relacion == "Subordinado":
            mean += random.uniform(-0.2, 0.3)
        
        val = int(round(random.gauss(mean, 0.6)))
        val = max(1, min(5, val))
        return val

    def crear_evaluacion(evaluador_id, evaluado_id, tipo_relacion):
        for comp in competencias_db:
            comp_id = comp[0]
            calif = generar_calificacion(evaluado_id, tipo_relacion)
            comentario = random.choice(COMENTARIOS_POR_CALIFICACION[calif])
            fecha = (fecha_base + timedelta(days=random.randint(0, 25), hours=random.randint(8, 17))).strftime("%Y-%m-%d %H:%M:%S")
            evaluaciones.append((evaluador_id, evaluado_id, tipo_relacion, comp_id, calif, comentario, fecha))

    # 3. GENERAR MATRIZ 360° PARA CADA USUARIO
    for target in all_users:
        target_id, target_nombre, target_rol, target_dept = target

        # A) Autoevaluación
        crear_evaluacion(target_id, target_id, "Autoevaluación")

        # B) Evaluación por Jefe
        if target_rol in ["Maestro", "Administrativo"]:
            jefe = random.choice(directivos)
            crear_evaluacion(jefe[0], target_id, "Jefe")
        else: # Directivo evaluado por otro directivo
            jefes_posibles = [d for d in directivos if d[0] != target_id]
            if jefes_posibles:
                crear_evaluacion(jefes_posibles[0][0], target_id, "Jefe")

        # C) Evaluación por Pares (mismo rol o departamento)
        if target_rol == "Maestro":
            pares = [m for m in maestros if m[0] != target_id]
        elif target_rol == "Administrativo":
            pares = [a for a in administrativos if a[0] != target_id]
        else:
            pares = [d for d in directivos if d[0] != target_id]
        
        evaluadores_pares = random.sample(pares, min(2, len(pares)))
        for par in evaluadores_pares:
            crear_evaluacion(par[0], target_id, "Par")

        # D) Evaluación por Subordinados
        if target_rol == "Directivo":
            subordinados = random.sample(maestros + administrativos, 3)
            for sub in subordinados:
                crear_evaluacion(sub[0], target_id, "Subordinado")
        elif target_rol in ["Maestro", "Administrativo"]:
            # Algunos maestros y admins reciben retroalimentación de subordinados/asistentes
            posibles_subs = [u for u in (maestros + administrativos) if u[0] != target_id]
            subordinados = random.sample(posibles_subs, 1)
            for sub in subordinados:
                crear_evaluacion(sub[0], target_id, "Subordinado")

    cursor.executemany(
        """INSERT INTO evaluaciones_360 
           (evaluador_id, evaluado_id, tipo_relacion, competencia_id, calificacion, comentario, fecha_evaluacion) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        evaluaciones
    )
    conn.commit()
    print(f"[OK] {len(evaluaciones)} registros de evaluaciones 360° insertados exitosamente.")

    # 4. EXPORTAR A CSV DENORMALIZADO (datos_evaluacion_360.csv)
    query_export = """
    SELECT 
        e.id AS evaluacion_id,
        ev.id AS evaluador_id,
        ev.nombre AS evaluador_nombre,
        ev.rol AS evaluador_rol,
        ed.id AS evaluado_id,
        ed.nombre AS evaluado_nombre,
        ed.rol AS evaluado_rol,
        ed.departamento AS evaluado_departamento,
        e.tipo_relacion,
        c.id AS competencia_id,
        c.nombre_competencia,
        e.calificacion,
        e.comentario,
        e.fecha_evaluacion
    FROM evaluaciones_360 e
    JOIN usuarios ev ON e.evaluador_id = ev.id
    JOIN usuarios ed ON e.evaluado_id = ed.id
    JOIN competencias c ON e.competencia_id = c.id
    ORDER BY ed.nombre, c.nombre_competencia, e.tipo_relacion;
    """
    
    df = pd.read_sql_query(query_export, conn)
    df.to_csv(CSV_FILE, index=False, encoding="utf-8-sig")
    print(f"[OK] Archivo CSV denormalizado exportado exitosamente como '{CSV_FILE}' con {len(df)} filas.")

    conn.close()

if __name__ == "__main__":
    seed_data()
