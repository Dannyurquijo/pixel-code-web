import sqlite3
import pandas as pd

DB_NAME = "evaluacion360.db"

def get_db_connection():
    return sqlite3.connect(DB_NAME)

def get_promedio_general():
    """Retorna el promedio general de desempeño por cada persona evaluada."""
    sql = """
    SELECT 
        u.id AS evaluado_id,
        u.nombre,
        u.rol,
        u.departamento,
        ROUND(AVG(e.calificacion), 2) AS promedio_general,
        COUNT(e.id) AS total_evaluaciones
    FROM usuarios u
    JOIN evaluaciones_360 e ON u.id = e.evaluado_id
    GROUP BY u.id, u.nombre, u.rol, u.departamento
    ORDER BY promedio_general DESC;
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(sql, conn)

def get_promedio_por_tipo_relacion(evaluado_id=None):
    """Retorna el promedio desglosado por tipo de relación (Jefe, Par, Subordinado, Autoevaluación)."""
    where_clause = "WHERE u.id = ?" if evaluado_id else ""
    params = (evaluado_id,) if evaluado_id else ()
    
    sql = f"""
    SELECT 
        u.id AS evaluado_id,
        u.nombre,
        u.rol,
        u.departamento,
        ROUND(AVG(CASE WHEN e.tipo_relacion = 'Autoevaluación' THEN e.calificacion END), 2) AS Autoevaluación,
        ROUND(AVG(CASE WHEN e.tipo_relacion = 'Jefe' THEN e.calificacion END), 2) AS Jefe,
        ROUND(AVG(CASE WHEN e.tipo_relacion = 'Par' THEN e.calificacion END), 2) AS Par,
        ROUND(AVG(CASE WHEN e.tipo_relacion = 'Subordinado' THEN e.calificacion END), 2) AS Subordinado,
        ROUND(AVG(CASE WHEN e.tipo_relacion != 'Autoevaluación' THEN e.calificacion END), 2) AS Promedio_Externo_360
    FROM usuarios u
    JOIN evaluaciones_360 e ON u.id = e.evaluado_id
    {where_clause}
    GROUP BY u.id, u.nombre, u.rol, u.departamento
    ORDER BY Promedio_Externo_360 DESC;
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(sql, conn, params=params)

def get_promedio_por_competencia(evaluado_id=None):
    """Retorna el promedio por competencia para una persona específica o para todos."""
    where_clause = "WHERE u.id = ?" if evaluado_id else ""
    params = (evaluado_id,) if evaluado_id else ()

    sql = f"""
    SELECT 
        u.id AS evaluado_id,
        u.nombre,
        c.id AS competencia_id,
        c.nombre_competencia,
        e.tipo_relacion,
        ROUND(AVG(e.calificacion), 2) AS promedio_calificacion
    FROM usuarios u
    JOIN evaluaciones_360 e ON u.id = e.evaluado_id
    JOIN competencias c ON e.competencia_id = c.id
    {where_clause}
    GROUP BY u.id, u.nombre, c.id, c.nombre_competencia, e.tipo_relacion
    ORDER BY c.nombre_competencia, e.tipo_relacion;
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(sql, conn, params=params)

def get_ranking_por_departamento(departamento=None):
    """Retorna el ranking de desempeño por departamento utilizando funciones de ventana."""
    where_clause = "WHERE u.departamento = ?" if departamento else ""
    params = (departamento,) if departamento else ()

    sql = f"""
    WITH PromediosUsuarios AS (
        SELECT 
            u.id AS evaluado_id,
            u.nombre,
            u.rol,
            u.departamento,
            ROUND(AVG(CASE WHEN e.tipo_relacion != 'Autoevaluación' THEN e.calificacion END), 2) AS promedio_externo,
            ROUND(AVG(e.calificacion), 2) AS promedio_general
        FROM usuarios u
        JOIN evaluaciones_360 e ON u.id = e.evaluado_id
        {where_clause}
        GROUP BY u.id, u.nombre, u.rol, u.departamento
    )
    SELECT 
        departamento,
        DENSE_RANK() OVER (PARTITION BY departamento ORDER BY promedio_externo DESC) AS ranking_dept,
        nombre,
        rol,
        promedio_externo,
        promedio_general
    FROM PromediosUsuarios
    ORDER BY departamento, ranking_dept;
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(sql, conn, params=params)

def get_comentarios_evaluado(evaluado_id):
    """Retorna todos los comentarios cualitativos recibidos por una persona agrupados por tipo de evaluador."""
    sql = """
    SELECT 
        e.tipo_relacion,
        c.nombre_competencia,
        e.calificacion,
        e.comentario,
        e.fecha_evaluacion
    FROM evaluaciones_360 e
    JOIN competencias c ON e.competencia_id = c.id
    WHERE e.evaluado_id = ?
    ORDER BY e.tipo_relacion, c.nombre_competencia;
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(sql, conn, params=(evaluado_id,))

if __name__ == "__main__":
    print("=== PROMEDIO GENERAL (TOP 5) ===")
    print(get_promedio_general().head())
    print("\n=== RANKING DEPARTAMENTAL (TOP 5) ===")
    print(get_ranking_por_departamento().head())
