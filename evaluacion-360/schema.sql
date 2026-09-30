-- ============================================================
-- ESQUEMA DE BASE DE DATOS: Sistema de Evaluación 360°
-- Compatible con SQLite y PostgreSQL
-- ============================================================

-- Habilitar claves foráneas (para SQLite)
PRAGMA foreign_keys = ON;

-- Limpieza preventiva de tablas (en orden inverso a las dependencias)
DROP TABLE IF EXISTS evaluaciones_360;
DROP TABLE IF EXISTS competencias;
DROP TABLE IF EXISTS usuarios;

-- 1. TABLA: usuarios
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('Maestro', 'Administrativo', 'Directivo')),
    departamento VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL
);

-- 2. TABLA: competencias
CREATE TABLE competencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_competencia VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- 3. TABLA: evaluaciones_360
CREATE TABLE evaluaciones_360 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluador_id INTEGER NOT NULL,
    evaluado_id INTEGER NOT NULL,
    tipo_relacion VARCHAR(30) NOT NULL CHECK (tipo_relacion IN ('Jefe', 'Par', 'Subordinado', 'Autoevaluación')),
    competencia_id INTEGER NOT NULL,
    calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha_evaluacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (competencia_id) REFERENCES competencias(id) ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES OPTIMIZADOS PARA CONSULTAS ANALÍTICAS 360°
-- ============================================================

-- Búsquedas y agrupaciones por persona evaluada
CREATE INDEX idx_evaluaciones_evaluado ON evaluaciones_360(evaluado_id);

-- Búsquedas por evaluador
CREATE INDEX idx_evaluaciones_evaluador ON evaluaciones_360(evaluador_id);

-- Agregaciones por competencia
CREATE INDEX idx_evaluaciones_competencia ON evaluaciones_360(competencia_id);

-- Filtros por tipo de relación (Jefe, Par, Subordinado, Autoevaluación)
CREATE INDEX idx_evaluaciones_tipo_relacion ON evaluaciones_360(tipo_relacion);

-- Índice compuesto para consultas combinadas por evaluado y tipo de relación
CREATE INDEX idx_evaluaciones_evaluado_relacion ON evaluaciones_360(evaluado_id, tipo_relacion);
