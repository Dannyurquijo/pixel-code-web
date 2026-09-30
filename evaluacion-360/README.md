# 🌐 Sistema de Evaluación 360° Escolar | DU Pixel Code

Una aplicación web de **Evaluación 360° para instituciones educativas** (maestros, personal administrativo y directivos), diseñada para funcionar **100% en el cliente desde el navegador** sin necesidad de servidor backend, completamente compatible con **GitHub Pages**.

---

## 🎨 Identidad de Marca & Sistema de Diseño (DU Pixel Code)

- **Estética**: *Dark-Mode Luxury*, *Luminous Geometry*, *High-Tech Precision*, *Cybernetic Elegance*.
- **Paleta de Colores**:
  - Fondos Oscuros: `#0A0A0A`, `#0F172A`, `#050505` con efectos de cristal (*glassmorphism*).
  - Texto: `#FFFFFF` / `#E2E8F0`.
  - Neón y Acentos: `#00D2FF` (Cian Neón), `#FFD700` (Dorado/Neón), `#10B981` (Esmeralda).
- **Tipografías**:
  - `Montserrat` (Campaña & Logos)
  - `Poppins` (Encabezados & Títulos)
  - `Lato` (Cuerpo de texto)

---

## 🔐 1. Seguridad y Acceso (Login Gate)

La aplicación cuenta con una pantalla de bloqueo de alta seguridad visual antes de cargar la base de datos o el dashboard:

- **Contraseña Obligatoria**: `123456789*`
- **Características**:
  - Botón de alternar ver/ocultar contraseña (ojo neón).
  - Alerta estilizada en rojo neón con animación de sacudida (*shake*) en caso de error.
  - Control de sesión en `sessionStorage`.
  - Botón "Cerrar Sesión" en la barra superior del dashboard.

---

## ⚡ 2. Arquitectura de Base de Datos SQL en Navegador (`SQL.js` + `PapaParse`)

- **WebAssembly Engine**: Utiliza **SQL.js** (compilación de SQLite a WebAssembly) para crear una base de datos relacional en memoria dentro del navegador del usuario.
- **Dataset Automático**: Carga automáticamente el archivo [`evaluacion_360_escuela.csv`](file:///c:/Users/durquijo/Documents/01%20Proyectos/60.%20Mini%20SQL/evaluacion_360_escuela.csv) con **más de 700 registros** simulados.
- **Consultas SQL Reales**: Soporta sintaxis SQL ANSI completa (`SELECT`, `AVG`, `GROUP BY`, `JOIN`, `RANK() OVER`).
- **Carga de Datos Personalizados**: Zona Drag & Drop para subir archivos `.csv` o `.db` (SQLite) y analizarlos al instante.

---

## 📊 3. Módulos y Pestañas del Dashboard

1. **👤 Reporte 360° Individual**:
   - Selector por Rol (Maestro, Admin, Directivo), Departamento y Colaborador.
   - Tarjeta de información personal con insignias neón.
   - 5 Tarjetas KPI (Promedio Externo 360°, Autoevaluación, Jefe, Pares, Subordinados).
   - **Gráfico de Radar Interactivo (Chart.js)**: Comparativa entre Autoevaluación y Promedio 360° Externo.
   - **Gráfico de Barras Comparativo (Chart.js)**: Desglose por evaluador.
   - **Matriz de Análisis de Brecha**: Diagnóstico de autopercepción.
   - **Comentarios Cualitativos**: Tarjetas de retroalimentación directa.
   - **Exportación**: Descarga en PDF (mediante `html2pdf.js`) y CSV.

2. **🏛️ Analítica Institucional y Rankings**:
   - KPIs globales institucionales.
   - Tabla interactiva con el **Ranking de Desempeño Departamental** calculado con SQL `RANK() OVER`.
   - Gráfico de barras horizontal por competencia.

3. **💻 Consola / Editor SQL Interactivo**:
   - Editor de texto libre para escribir y ejecutar **consultas SQL personalizadas** contra la base de datos SQLite en memoria.
   - Accesos directos a consultas preconstruidas.
   - Tabla interactiva de resultados.

4. **📁 Carga de Datos (.CSV / .DB)**:
   - Zona interactiva Drag & Drop.

---

## 🚀 4. Despliegue en GitHub Pages (`dupixelcode`)

Para subir esta aplicación a tu repositorio de GitHub y visualizarla en línea:

1. **Crear repositorio en GitHub**:
   - Nombre recomendado: `evaluacion-360-dupixelcode` o en tu repositorio de usuario `dupixelcode.github.io`.

2. **Inicializar y Subir Código**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Sistema Evaluación 360° DU Pixel Code"
   git branch -M main
   git remote add origin https://github.com/dupixelcode/evaluacion-360.git
   git push -u origin main
   ```

3. **Activar GitHub Pages**:
   - En tu repositorio de GitHub, ve a **Settings** -> **Pages**.
   - En **Source**, selecciona `Deploy from a branch` y elige la rama `main` / folder `/ (root)`.
   - Haz clic en **Save**.
   - ¡Tu aplicación estará en línea en pocos segundos en `https://dupixelcode.github.io/evaluacion-360/`!

---

## 💻 Ejecución Local

Para probarlo localmente en tu equipo:
```bash
py -m http.server 8000
```
Y abre [http://localhost:8000](http://localhost:8000) en tu navegador.
Contraseña: `123456789*`
