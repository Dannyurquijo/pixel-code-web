import sqlite3
import pandas as pd
import random
from datetime import datetime, timedelta

random.seed(42)

CSV_FILE = "evaluacion_360_escuela.csv"

COMPETENCIAS = [
    {"id": 1, "nombre": "Liderazgo", "descripcion": "Capacidad para guiar, motivar e inspirar a equipos hacia el logro de metas institucionales."},
    {"id": 2, "nombre": "Comunicación Efectiva", "descripcion": "Habilidad para transmitir ideas con claridad, asertividad y escuchar de forma activa."},
    {"id": 3, "nombre": "Pedagogía y Gestión", "descripcion": "Dominio metodológico en el aula y eficiencia en la gestión de procesos académicos/administrativos."},
    {"id": 4, "nombre": "Trabajo en Equipo", "descripcion": "Disposición para colaborar de manera empática, respetuosa y proactiva con compañeros de trabajo."},
    {"id": 5, "nombre": "Puntualidad y Compromiso", "descripcion": "Cumplimiento oportuno de horarios, compromisos laborales y adhesión a los valores institucionales."}
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

def generate_csv_data():
    all_users = []
    # 2 Directivos (IDs 1, 2)
    for i, nombre in enumerate(NOMBRES_DIRECTIVOS):
        dept = DEPARTAMENTOS_DIRECTIVOS[i % len(DEPARTAMENTOS_DIRECTIVOS)]
        ingreso = (datetime.now() - timedelta(days=random.randint(1500, 3000))).strftime("%Y-%m-%d")
        all_users.append({"id": len(all_users) + 1, "nombre": nombre, "rol": "Directivo", "departamento": dept, "fecha_ingreso": ingreso})

    # 8 Admin (IDs 3-10)
    for i, nombre in enumerate(NOMBRES_ADMINISTRATIVOS):
        dept = DEPARTAMENTOS_ADMINISTRATIVOS[i % len(DEPARTAMENTOS_ADMINISTRATIVOS)]
        ingreso = (datetime.now() - timedelta(days=random.randint(500, 2000))).strftime("%Y-%m-%d")
        all_users.append({"id": len(all_users) + 1, "nombre": nombre, "rol": "Administrativo", "departamento": dept, "fecha_ingreso": ingreso})

    # 20 Maestros (IDs 11-30)
    for i, nombre in enumerate(NOMBRES_MAESTROS):
        dept = DEPARTAMENTOS_ACADEMICOS[i % len(DEPARTAMENTOS_ACADEMICOS)]
        ingreso = (datetime.now() - timedelta(days=random.randint(300, 2500))).strftime("%Y-%m-%d")
        all_users.append({"id": len(all_users) + 1, "nombre": nombre, "rol": "Maestro", "departamento": dept, "fecha_ingreso": ingreso})

    directivos = [u for u in all_users if u["rol"] == "Directivo"]
    administrativos = [u for u in all_users if u["rol"] == "Administrativo"]
    maestros = [u for u in all_users if u["rol"] == "Maestro"]

    user_profiles = {}
    for u in all_users:
        user_profiles[u["id"]] = {
            "base": random.choice([3.2, 3.6, 4.0, 4.3, 4.7]),
            "self_bias": random.choice([0.2, 0.4, 0.0, -0.2])
        }

    evaluaciones = []
    fecha_base = datetime.now() - timedelta(days=30)
    eval_id = 1

    def add_eval_set(evaluador, evaluado, tipo_relacion):
        nonlocal eval_id
        prof = user_profiles[evaluado["id"]]
        for comp in COMPETENCIAS:
            mean = prof["base"]
            if tipo_relacion == "Autoevaluación":
                mean += prof["self_bias"]
            elif tipo_relacion == "Jefe":
                mean += random.uniform(-0.1, 0.2)
            elif tipo_relacion == "Subordinado":
                mean += random.uniform(-0.2, 0.3)
            
            calif = int(round(random.gauss(mean, 0.6)))
            calif = max(1, min(5, calif))
            comentario = random.choice(COMENTARIOS_POR_CALIFICACION[calif])
            fecha = (fecha_base + timedelta(days=random.randint(0, 25), hours=random.randint(8, 17))).strftime("%Y-%m-%d %H:%M:%S")

            evaluaciones.append({
                "evaluacion_id": eval_id,
                "evaluador_id": evaluador["id"],
                "evaluador_nombre": evaluador["nombre"],
                "evaluador_rol": evaluador["rol"],
                "evaluado_id": evaluado["id"],
                "evaluado_nombre": evaluado["nombre"],
                "evaluado_rol": evaluado["rol"],
                "evaluado_departamento": evaluado["departamento"],
                "evaluado_fecha_ingreso": evaluado["fecha_ingreso"],
                "tipo_relacion": tipo_relacion,
                "competencia_id": comp["id"],
                "nombre_competencia": comp["nombre"],
                "descripcion_competencia": comp["descripcion"],
                "calificacion": calif,
                "comentario": comentario,
                "fecha_evaluacion": fecha
            })
            eval_id += 1

    # Generar matriz 360° para los 30 usuarios
    for target in all_users:
        # 1. Autoevaluación (5 registros)
        add_eval_set(target, target, "Autoevaluación")

        # 2. Evaluación por Jefe (5 registros)
        if target["rol"] in ["Maestro", "Administrativo"]:
            jefe = random.choice(directivos)
            add_eval_set(jefe, target, "Jefe")
        else:
            jefes_posibles = [d for d in directivos if d["id"] != target["id"]]
            if jefes_posibles:
                add_eval_set(jefes_posibles[0], target, "Jefe")

        # 3. Evaluación por Pares (2 pares = 10 registros)
        if target["rol"] == "Maestro":
            pares = [m for m in maestros if m["id"] != target["id"]]
        elif target["rol"] == "Administrativo":
            pares = [a for a in administrativos if a["id"] != target["id"]]
        else:
            pares = [d for d in directivos if d["id"] != target["id"]]
        
        sample_pares = random.sample(pares, min(2, len(pares)))
        for p in sample_pares:
            add_eval_set(p, target, "Par")

        # 4. Evaluación por Subordinados (1 o 2 = 5-10 registros)
        if target["rol"] == "Directivo":
            subs = random.sample(maestros + administrativos, 3)
            for s in subs:
                add_eval_set(s, target, "Subordinado")
        else:
            posibles_subs = [u for u in (maestros + administrativos) if u["id"] != target["id"]]
            subs = random.sample(posibles_subs, 1)
            for s in subs:
                add_eval_set(s, target, "Subordinado")

    df = pd.DataFrame(evaluaciones)
    df.to_csv(CSV_FILE, index=False, encoding="utf-8-sig")
    print(f"[OK] Archivo '{CSV_FILE}' generado exitosamente con {len(df)} registros de evaluación 360°.")

if __name__ == "__main__":
    generate_csv_data()
