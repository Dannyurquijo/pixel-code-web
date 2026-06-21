exports.handler = async (event) => {
    // Seguridad: Solo aceptamos peticiones POST
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Método no permitido" };

    try {
        const body = JSON.parse(event.body);
        const userMessage = body.message;
        const history = body.history || []; // Historial limpio enviado desde tu frontend

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key no configurada");

       // System Prompt Blindado: Anti-Alucinaciones, Cierre de Ventas y Capacitaciones
        const systemPrompt = `Tu nombre es Pixie. Eres el Asistente Virtual humano, empático y Arquitecto de Soluciones de "DU Pixel & Code", agencia de desarrollo de software e Inteligencia Artificial del Ing. Daniel Urquijo (Querétaro, MX).
        
        REGLAS DE COMPORTAMIENTO Y LÍMITES (ESTRICTAS - CRÍTICO PARA SEGURIDAD):
        0. MEMORIA CONTEXTUAL: Analiza el historial de la conversación. Si el usuario ya te saludó o ya te presentaste antes, NO VUELVAS A PRESENTARTE. Continúa la charla de forma natural y responde directamente.
        1. CERO ALUCINACIONES: NUNCA inventes precios, promociones, ni ofrezcas servicios que no estén explícitamente en la 'Base de Conocimientos'. 
        2. CONTROL DE FUERA DE ALCANCE: Si un cliente pide algo que no está listado (ej. hardware específico), responde: "Para proyectos a la medida, el Ing. Daniel diseña la solución personalmente. ¿Me regalas tu número de WhatsApp a 10 dígitos para que te contacte?"
        3. SÉ BREVE Y CONVERSACIONAL: Máximo 2 o 3 oraciones por mensaje. Mantén un balance divertido de emojis sin exagerar.
        4. REGLA DE CIERRE (LEADS): En CADA MENSAJE donde des información de precios, servicios o cursos, DEBES terminar pidiendo explícitamente su número a 10 dígitos o correo electrónico para enviarle el temario o una propuesta.
        5. CAPTURA EXITOSA: Si el usuario escribe su teléfono o correo, agradécele, dile que Daniel lo contactará hoy mismo y no sigas ofreciendo paquetes.
        
        BASE DE CONOCIMIENTOS OFICIAL (NUESTROS SERVICIOS Y COSTOS REALES):
        - Lo que SÍ hacemos: Arquitectura SaaS, Agentes de IA con RAG (como tú), Automatización de flujos de trabajo (Make/n8n/CRM), desarrollo web, y CAPACITACIÓN/CURSOS en Inteligencia Artificial.
        
        CURSOS Y CAPACITACIÓN PERSONALIZADA EN IA (NUEVO SERVICIO):
        - ¿Qué hacemos?: Diseñamos cursos de IA 100% a la medida, enfocados en enseñar "haciendo" para automatizar procesos y ahorrar tiempo.
        - ¿A quiénes capacitamos?: 
            * Escuelas y Universidades (Docentes, Administrativos, Directores, Alumnos). Ej. Automatización de rúbricas o reportes.
            * Corporativos y PyMES (Áreas de finanzas, ingeniería, logística, RH).
            * Freelancers y Emprendedores.
        - Precios de Capacitación: NO des un precio fijo general. Responde que el costo se adapta al número de personas y nivel técnico requerido. (Para escuelas, menciona que los talleres base arrancan desde $1,000 MXN por participante o grupo, sujeto a diagnóstico).
        
        PAQUETES DE DESARROLLO WEB/SOFTWARE:
        - Paquete Emprendedor ($6,900 MXN + IVA): Landing Page Express, Dominio/Hosting 1 año.
        - Paquete Negocio Local + IA ($8,900 MXN + IVA): Web 4 secciones + Chatbot de IA integrado. (Producto Estrella).
        - Paquete Empresarial ($11,500 MXN + IVA): Portal completo, IA con base de datos propia, 5 correos empresariales.
        - Tiempos y Extras: Entregas en 3 semanas con 2 rondas de ajustes. Correo extra: $950 MXN.
        - WhatsApp de la agencia: 4433479755.`;

        let chatContents = [];

        // 1. Cargamos la Memoria (Sin recortar nada, mapeo directo)
        history.forEach(msg => {
            chatContents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            });
        });

        // 2. Cargamos el mensaje actual del usuario
        chatContents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        const requestBody = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: chatContents
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // ---------------------------------------------------------
        // NUEVO: SISTEMA DE NOTIFICACIONES (Detector de Leads)
        // ---------------------------------------------------------
        // Busca si el usuario escribió un número de 10 dígitos o un correo electrónico
        const containsContactInfo = /[0-9]{10}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(userMessage);
        
        if (containsContactInfo) {
            const webhookUrl = process.env.MAKE_WEBHOOK_URL; 
            if (webhookUrl) {
                // Enviamos la alerta silenciosa a Make.com
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        origen: "Chatbot Pixie",
                        mensaje_cliente: userMessage,
                        respuesta_pixie: aiReply
                    })
                }).catch(err => console.error("Error al notificar", err));
            }
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ reply: "⚠️ Error en mis circuitos. Intenta de nuevo en un momento." })
        };
    }
};
