-- ============================================================
-- CONSULTAS SQL OPTIMIZADAS: ANALÍTICA Y BACKEND EVALUACIÓN 360°
-- Compatible con SQLite y PostgreSQL
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROMEDIO GENERAL POR PERSONA EVALUADA
-- Muestra el desempeño global de cada colaborador y el total de evaluaciones recibidas.
-- ------------------------------------------------------------
SELECT 
    u.id AS evaluado_id,
    u.nombre,
    u.rol,
    u.departamento,
    ROUND(AVG(e.calificacion), 2) AS promedio_general,
    COUNT(e.id) AS total_evaluaciones_recibidas
FROM usuarios u
JOIN evaluaciones_360 e ON u.id = e.evaluado_id
GROUP BY u.id, u.nombre, u.rol, u.departamento
ORDER BY promedio_general DESC;


-- ------------------------------------------------------------
-- 2. PROMEDIO DESGLOSADO POR TIPO DE RELACIÓN (Jefe vs Par vs Subordinado vs Autoevaluación)
-- Permite comparar la percepción jerárquica cruzada para cada persona evaluada.
-- ------------------------------------------------------------
SELECT 
    u.id AS evaluado_id,
    u.nombre,
    u.rol,
    u.departamento,
    ROUND(AVG(CASE WHEN e.tipo_relacion = 'Autoevaluación' THEN e.calificacion END), 2) AS promedio_autoevaluacion,
    ROUND(AVG(CASE WHEN e.tipo_relacion = 'Jefe' THEN e.calificacion END), 2) AS promedio_jefe,
    ROUND(AVG(CASE WHEN e.tipo_relacion = 'Par' THEN e.calificacion END), 2) AS promedio_pares,
    ROUND(AVG(CASE WHEN e.tipo_relacion = 'Subordinado' THEN e.calificacion END), 2) AS promedio_subordinados,
    ROUND(AVG(CASE WHEN e.tipo_relacion != 'Autoevaluación' THEN e.calificacion END), 2) AS promedio_externo_360
FROM usuarios u
JOIN evaluaciones_360 e ON u.id = e.evaluado_id
GROUP BY u.id, u.nombre, u.rol, u.departamento
ORDER BY promedio_externo_360 DESC;


-- ------------------------------------------------------------
-- 3. PROMEDIO POR COMPETENCIA POR PERSONA (Para detectar áreas de mejora)
-- Detalla la calificación promedio obtenida por una persona en cada competencia clave.
-- ------------------------------------------------------------
SELECT 
    u.id AS evaluado_id,
    u.nombre,
    c.id AS competencia_id,
    c.nombre_competencia,
    ROUND(AVG(CASE WHEN e.tipo_relacion != 'Autoevaluación' THEN e.calificacion END), 2) AS promedio_externo,
    ROUND(AVG(CASE WHEN e.tipo_relacion = 'Autoevaluación' THEN e.calificacion END), 2) AS autoevaluacion,
    ROUND(AVG(e.calificacion), 2) AS promedio_global_competencia
FROM usuarios u
JOIN evaluaciones_360 e ON u.id = e.evaluado_id
JOIN competencias c ON e.competencia_id = c.id
GROUP BY u.id, u.nombre, c.id, c.nombre_competencia
ORDER BY u.nombre, c.nombre_competencia;


-- ------------------------------------------------------------
-- 4. RANKING DE DESEMPEÑO POR DEPARTAMENTO
-- Clasifica a los colaboradores dentro de su propio departamento utilizando funciones de ventana.
-- ------------------------------------------------------------
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
    GROUP BY u.id, u.nombre, u.rol, u.departamento
)
SELECT 
    departamento,
    RANK() OVER (PARTITION BY departamento ORDER BY promedio_externo DESC) AS ranking_departamental,
    nombre,
    rol,
    promedio_externo,
    promedio_general
FROM PromediosUsuarios
ORDER BY departamento, ranking_departamental;


-- ------------------------------------------------------------
-- 5. RESUMEN INSTITUCIONAL DE COMPETENCIAS (Top fortalezas vs Áreas de Mejora a nivel Global)
-- Agregación general por competencia a nivel toda la institución.
-- ------------------------------------------------------------
SELECT 
    c.nombre_competencia,
    ROUND(AVG(e.calificacion), 2) AS promedio_institucional,
    MIN(e.calificacion) AS calificacion_minima,
    MAX(e.calificacion) AS calificacion_maxima,
    COUNT(e.id) AS total_evaluaciones
FROM competencias c
JOIN evaluaciones_360 e ON c.id = e.competencia_id
GROUP BY c.id, c.nombre_competencia
ORDER BY promedio_institucional DESC;
