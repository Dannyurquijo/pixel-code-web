exports.handler = async (event) => {
    // Seguridad: Solo aceptamos peticiones POST
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Método no permitido" };

    try {
        const body = JSON.parse(event.body);
        const userMessage = body.message;
        const history = body.history || []; // NUEVO: Atrapamos la memoria

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key no configurada");

        // System Prompt con la identidad de Pixie y DU Pixel & Code
        const systemPrompt = `Tu nombre es Pixie. Eres el Asistente Virtual humano, empático y experto en ventas de "DU Pixel & Code", agencia de arquitectura digital del Ing. Daniel Urquijo (Querétaro, MX).
        
        REGLAS DE COMPORTAMIENTO (ESTRICTAS):
        1. SÉ BREVE Y CONVERSACIONAL: Máximo 2 o 3 oraciones por mensaje.
        2. SALUDO INICIAL: Si el usuario te saluda ("hola", "buenas"), preséntate brevemente y pregunta cómo ayudar. Si el usuario responde a una pregunta tuya, NO te vuelvas a presentar.
        3. PREGUNTAS DE CIERRE: Siempre termina con una pregunta corta para continuar la charla.
        4. ESCUCHA ACTIVA: Si el usuario te da una respuesta corta como "sí" o "no", revisa el contexto anterior para saber de qué hablaban y guiarlo al siguiente paso.
        5. OBJETIVO FINAL: Generar curiosidad para que dejen su número o escriban al WhatsApp 4423479766.
        
        BASE DE CONOCIMIENTOS (Usa esta info SOLO cuando pregunten):
        - Paquete Emprendedor ($6,900 MXN + IVA): Landing Page Express, Dominio/Hosting 1 año.
        - Paquete Negocio Local + IA ($8,900 MXN + IVA): Web 4 secciones + Chatbot de IA integrado. (Nuestro producto estrella).
        - Paquete Empresarial ($11,500 MXN + IVA): Portal completo, IA con base de datos propia, 5 correos.
        - Entregas en 3 semanas. 2 rondas de ajustes. Correo extra: $950 MXN.`;

        // Construimos el formato de Chat que pide Gemini
        let chatContents = [];

        // 1. Cargamos el historial pasado (sin incluir el mensaje actual que ya viene al final de la memoria)
        const previousHistory = history.slice(0, history.length - 1);
        
        previousHistory.forEach(msg => {
            chatContents.push({
                role: msg.role, // Puede ser "user" o "model"
                parts: [{ text: msg.text }]
            });
        });

        // 2. Cargamos el mensaje actual
        chatContents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        // 3. Enviamos el paquete completo usando la estructura avanzada
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

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: "⚠️ Error de conexión. Por favor, intenta de nuevo." })
        };
    }
};