import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import queries

# Configuración de la página
st.set_page_config(
    page_title="Sistema de Evaluación 360° | Institución Educativa",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilo personalizado CSS para mejorar la interfaz visual
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        color: #1E3A8A;
        font-weight: 700;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #4B5563;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #F3F4F6;
        padding: 1.2rem;
        border-radius: 10px;
        border-left: 5px solid #2563EB;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-card h3 {
        margin: 0;
        font-size: 0.9rem;
        color: #6B7280;
        text-transform: uppercase;
    }
    .metric-card p {
        margin: 0.3rem 0 0 0;
        font-size: 1.8rem;
        font-weight: bold;
        color: #1F2937;
    }
    .badge-role {
        background-color: #DBEAFE;
        color: #1E40AF;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-weight: 600;
        font-size: 0.85rem;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_data(ttl=60)
def load_base_data():
    conn = sqlite3.connect("evaluacion360.db")
    df_users = pd.read_sql_query("SELECT id, nombre, rol, departamento, fecha_ingreso FROM usuarios ORDER BY nombre", conn)
    df_competencias = pd.read_sql_query("SELECT id, nombre_competencia, descripcion FROM competencias", conn)
    conn.close()
    return df_users, df_competencias


def main():
    # Encabezado Principal
    st.markdown('<div class="main-header">🎓 Sistema de Evaluación 360° de Maestros y Personal</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Plataforma de Analítica y Diagnóstico de Desempeño Institucional</div>', unsafe_allow_html=True)

    df_users, df_competencias = load_base_data()

    # Barra lateral de navegación y filtros
    st.sidebar.image("https://img.icons8.com/isometric/100/teacher.png", width=70)
    st.sidebar.title("Navegación y Filtros")
    
    modo_vista = st.sidebar.radio(
        "Seleccione Modo de Vista:",
        ["👤 Reporte 360° Individual", "🏛️ Analítica Institucional y Rankings"]
    )

    st.sidebar.markdown("---")

    if modo_vista == "👤 Reporte 360° Individual":
        st.sidebar.subheader("Selección de Colaborador")
        
        filtro_rol = st.sidebar.selectbox("Filtrar por Rol:", ["Todos", "Maestro", "Administrativo", "Directivo"])
        
        df_filtered_users = df_users.copy()
        if filtro_rol != "Todos":
            df_filtered_users = df_filtered_users[df_filtered_users["rol"] == filtro_rol]

        deptos_disponibles = ["Todos"] + sorted(list(df_filtered_users["departamento"].unique()))
        filtro_depto = st.sidebar.selectbox("Filtrar por Departamento:", deptos_disponibles)

        if filtro_depto != "Todos":
            df_filtered_users = df_filtered_users[df_filtered_users["departamento"] == filtro_depto]

        if df_filtered_users.empty:
            st.warning("No hay usuarios que coincidan con los filtros seleccionados.")
            return

        user_options = {f"{row['nombre']} ({row['rol']} - {row['departamento']})": row['id'] for _, row in df_filtered_users.iterrows()}
        selected_user_label = st.sidebar.selectbox("Seleccione Colaborador a Evaluar:", list(user_options.keys()))
        selected_user_id = user_options[selected_user_label]

        # Datos del usuario seleccionado
        user_info = df_users[df_users["id"] == selected_user_id].iloc[0]

        # SECCIÓN CABECERA DEL INDIVIDUO
        col1, col2, col3 = st.columns([2, 1, 1])
        with col1:
            st.subheader(f"👤 {user_info['nombre']}")
            st.markdown(f"**Rol:** <span class='badge-role'>{user_info['rol']}</span> &nbsp;&nbsp; | &nbsp;&nbsp; **Departamento:** {user_info['departamento']}", unsafe_allow_html=True)
            st.caption(f"Fecha de Ingreso: {user_info['fecha_ingreso']}")
        
        # Cargar métricas 360° del evaluado
        df_relacion = queries.get_promedio_por_tipo_relacion(selected_user_id)
        
        if not df_relacion.empty:
            row_rel = df_relacion.iloc[0]
            val_auto = row_rel.get('Autoevaluación', 0.0) or 0.0
            val_jefe = row_rel.get('Jefe', 0.0) or 0.0
            val_par = row_rel.get('Par', 0.0) or 0.0
            val_sub = row_rel.get('Subordinado', 0.0) or 0.0
            val_ext = row_rel.get('Promedio_Externo_360', 0.0) or 0.0

            st.markdown("<br>", unsafe_allow_html=True)
            # Tarjetas KPI de Desempeño
            kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
            kpi1.metric("Promedio Externo 360°", f"⭐ {val_ext:.2f} / 5.0")
            kpi2.metric("Autoevaluación", f"🎯 {val_auto:.2f}")
            kpi3.metric("Evaluación Jefe", f"👔 {val_jefe:.2f}" if val_jefe > 0 else "N/A")
            kpi4.metric("Evaluación Pares", f"👥 {val_par:.2f}" if val_par > 0 else "N/A")
            kpi5.metric("Subordinados", f"🌱 {val_sub:.2f}" if val_sub > 0 else "N/A")

        st.markdown("---")

        # Cargar promedios por competencia
        df_comp_user = queries.get_promedio_por_competencia(selected_user_id)

        if df_comp_user.empty:
            st.warning("No se encontraron evaluaciones para este usuario.")
            return

        # GRAFICOS PRINCIPALES: RADAR Y BARRAS COMPARATIVAS
        col_left, col_right = st.columns(2)

        with col_left:
            st.markdown("### 🕸️ Gráfico de Radar por Competencia")
            st.caption("Comparativa entre la Autoevaluación y la Promedio de Evaluadores Externos (360°)")

            # Preparar datos para radar
            df_radar_pivot = df_comp_user.pivot(index="nombre_competencia", columns="tipo_relacion", values="promedio_calificacion").fillna(0)
            
            competencias_list = list(df_radar_pivot.index)
            
            # Promedio externo (excluyendo autoevaluación)
            relaciones_ext = [c for c in df_radar_pivot.columns if c != "Autoevaluación"]
            if relaciones_ext:
                df_radar_pivot["Promedio Externo"] = df_radar_pivot[relaciones_ext].mean(axis=1)
            else:
                df_radar_pivot["Promedio Externo"] = 0.0

            auto_scores = df_radar_pivot["Autoevaluación"].tolist() if "Autoevaluación" in df_radar_pivot.columns else [0]*len(competencias_list)
            ext_scores = df_radar_pivot["Promedio Externo"].tolist()

            fig_radar = go.Figure()

            fig_radar.add_trace(go.Scatterpolar(
                r=ext_scores + [ext_scores[0]],
                theta=competencias_list + [competencias_list[0]],
                fill='toself',
                name='Promedio Externo 360°',
                line_color='#2563EB',
                fillcolor='rgba(37, 99, 235, 0.25)'
            ))

            fig_radar.add_trace(go.Scatterpolar(
                r=auto_scores + [auto_scores[0]],
                theta=competencias_list + [competencias_list[0]],
                fill='toself',
                name='Autoevaluación',
                line_color='#10B981',
                fillcolor='rgba(16, 185, 129, 0.25)'
            ))

            fig_radar.update_layout(
                polar=dict(
                    radialaxis=dict(visible=True, range=[0, 5])
                ),
                showlegend=True,
                margin=dict(l=40, r=40, t=30, b=30),
                legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5)
            )
            st.plotly_chart(fig_radar, use_container_width=True)

        with col_right:
            st.markdown("### 📊 Barras Comparativas por Tipo de Evaluador")
            st.caption("Calificación obtenida según la relación jerárquica")

            fig_bar = px.bar(
                df_comp_user,
                x="nombre_competencia",
                y="promedio_calificacion",
                color="tipo_relacion",
                barmode="group",
                text="promedio_calificacion",
                labels={
                    "nombre_competencia": "Competencia",
                    "promedio_calificacion": "Promedio",
                    "tipo_relacion": "Evaluador"
                },
                color_discrete_map={
                    "Autoevaluación": "#10B981",
                    "Jefe": "#1E3A8A",
                    "Par": "#3B82F6",
                    "Subordinado": "#F59E0B"
                }
            )
            fig_bar.update_yaxes(range=[0, 5.2])
            fig_bar.update_traces(textposition='outside')
            fig_bar.update_layout(
                margin=dict(l=20, r=20, t=30, b=30),
                legend=dict(orientation="h", yanchor="bottom", y=-0.3, xanchor="center", x=0.5)
            )
            st.plotly_chart(fig_bar, use_container_width=True)

        # TABLA DE ANÁLISIS DE BRECHAS (GAP ANALYSIS)
        st.markdown("---")
        st.markdown("### 🔍 Matriz de Análisis de Brecha de Autopercepción")
        st.caption("Diferencia entre cómo se evalúa el colaborador vs. cómo lo perciben sus evaluadores externos (Autoevaluación - Promedio Externo)")

        gap_df = df_radar_pivot[["Autoevaluación", "Promedio Externo"]].reset_index()
        gap_df["Brecha"] = (gap_df["Autoevaluación"] - gap_df["Promedio Externo"]).round(2)
        gap_df["Diagnóstico"] = gap_df["Brecha"].apply(
            lambda x: "⚠️ Sobrevaloración de desempeño" if x > 0.4 else (
                "💡 Subestimación (Fortaleza Oculta)" if x < -0.4 else "✅ Autopercepción Alineada"
            )
        )
        st.dataframe(
            gap_df.rename(columns={
                "nombre_competencia": "Competencia",
                "Autoevaluación": "Nota Autoevaluación",
                "Promedio Externo": "Nota 360° Externo"
            }),
            use_container_width=True,
            hide_index=True
        )

        # RETROALIMENTACIÓN CUALITATIVA
        st.markdown("---")
        st.markdown("### 💬 Comentarios Cualitativos y Retroalimentación Directa")
        
        df_comentarios = queries.get_comentarios_evaluado(selected_user_id)
        
        if not df_comentarios.empty:
            tab_jefe, tab_par, tab_sub, tab_auto = st.tabs(["👔 Comentarios de Jefes", "👥 Comentarios de Pares", "🌱 Comentarios de Subordinados", "🎯 Autoevaluación"])
            
            with tab_jefe:
                c_jefe = df_comentarios[df_comentarios["tipo_relacion"] == "Jefe"]
                if c_jefe.empty:
                    st.info("No hay comentarios registrados por Jefes.")
                else:
                    for _, row in c_jefe.iterrows():
                        st.markdown(f"**[{row['nombre_competencia']}] - Calificación: {row['calificacion']} / 5**")
                        st.info(f"\"{row['comentario']}\"")

            with tab_par:
                c_par = df_comentarios[df_comentarios["tipo_relacion"] == "Par"]
                if c_par.empty:
                    st.info("No hay comentarios registrados por Pares.")
                else:
                    for _, row in c_par.iterrows():
                        st.markdown(f"**[{row['nombre_competencia']}] - Calificación: {row['calificacion']} / 5**")
                        st.success(f"\"{row['comentario']}\"")

            with tab_sub:
                c_sub = df_comentarios[df_comentarios["tipo_relacion"] == "Subordinado"]
                if c_sub.empty:
                    st.info("No hay comentarios registrados por Subordinados.")
                else:
                    for _, row in c_sub.iterrows():
                        st.markdown(f"**[{row['nombre_competencia']}] - Calificación: {row['calificacion']} / 5**")
                        st.warning(f"\"{row['comentario']}\"")

            with tab_auto:
                c_auto = df_comentarios[df_comentarios["tipo_relacion"] == "Autoevaluación"]
                if c_auto.empty:
                    st.info("No hay comentarios registrados en Autoevaluación.")
                else:
                    for _, row in c_auto.iterrows():
                        st.markdown(f"**[{row['nombre_competencia']}] - Calificación: {row['calificacion']} / 5**")
                        st.caption(f"\"{row['comentario']}\"")

        # SECCIÓN DE DESCARGA DE REPORTES
        st.markdown("---")
        st.subheader("📥 Exportar Reporte de Evaluación 360°")
        
        # Generar CSV individual del evaluado
        df_export_user = df_comp_user.merge(
            pd.DataFrame([user_info]), left_on="evaluado_id", right_on="id"
        )
        csv_user = df_export_user.to_csv(index=False, encoding="utf-8-sig")

        st.download_button(
            label=f"📄 Descargar Reporte Individual de {user_info['nombre']} (CSV)",
            data=csv_user,
            file_name=f"reporte_360_{user_info['nombre'].replace(' ', '_').lower()}.csv",
            mime="text/csv",
            help="Haz clic para descargar un informe detallado con las puntuaciones de esta persona."
        )

    else:
        # VISTA INSTITUCIONAL Y RANKINGS DEPARTAMENTALES
        st.subheader("🏛️ Dashboard General Institucional y Ranking Departamental")
        st.caption("Visión macro del desempeño educativo de la institución")

        df_general = queries.get_promedio_general()
        df_ranking = queries.get_ranking_por_departamento()

        # Métricas Macro
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total de Colaboradores", f"{len(df_users)}")
        m2.metric("Promedio Institucional Global", f"⭐ {df_general['promedio_general'].mean():.2f} / 5.0")
        
        top_dept = df_ranking.groupby("departamento")["promedio_externo"].mean().idxmax()
        top_dept_score = df_ranking.groupby("departamento")["promedio_externo"].mean().max()
        m3.metric("Mejor Departamento", f"🏆 {top_dept}")
        m4.metric("Promedio Depto Top", f"⭐ {top_dept_score:.2f}")

        st.markdown("---")

        # TABLA DE RANKING DEPARTAMENTAL
        st.markdown("### 🏆 Ranking de Desempeño por Departamento (SQL Window Functions)")
        
        depto_filter = st.selectbox("Seleccione Departamento:", ["Todos"] + list(df_ranking["departamento"].unique()))
        
        if depto_filter != "Todos":
            df_display_ranking = df_ranking[df_ranking["departamento"] == depto_filter]
        else:
            df_display_ranking = df_ranking

        st.dataframe(
            df_display_ranking.rename(columns={
                "departamento": "Departamento",
                "ranking_dept": "Lugar en Depto",
                "nombre": "Nombre Colaborador",
                "rol": "Rol",
                "promedio_externo": "Promedio 360° Externo",
                "promedio_general": "Promedio Global"
            }),
            use_container_width=True,
            hide_index=True
        )

        st.markdown("---")
        
        # BOTÓN DE DESCARGA INSTITUCIONAL COMPLETA
        st.subheader("📥 Descargar Base de Datos Completa")
        try:
            with open("datos_evaluacion_360.csv", "r", encoding="utf-8-sig") as f:
                csv_full = f.read()

            st.download_button(
                label="📁 Descargar Conjunto Completo de Datos 360° (CSV)",
                data=csv_full,
                file_name="datos_evaluacion_360_completo.csv",
                mime="text/csv",
                help="Exporta la base de datos completa con más de 300 evaluadores y comentarios."
            )
        except Exception as e:
            st.error(f"No se pudo cargar el archivo CSV para descarga: {e}")

if __name__ == "__main__":
    main()
