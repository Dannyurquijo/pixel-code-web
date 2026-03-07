exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ reply: "Error Interno: Netlify no está leyendo la GEMINI_API_KEY." }) 
            };
        }

        const systemPrompt = `
        Eres el Asistente Virtual de "Pixel & Code", liderada por el Ing. Daniel Urquijo (Mecatrónico).
        UBICACIÓN: Querétaro, MX.
        
        CATÁLOGO DE PAQUETES (Precios + IVA):
        1. Emprendedor ($6,900 MXN): Presencia básica.
        2. Negocio Local + IA ($8,900 MXN): Automatización total y Chatbot.
        3. Empresarial ($11,500 MXN): Portal completo.
        
        TÉRMINOS: Entrega en 3 semanas. 2 rondas de ajustes. Correo extra: $950 MXN.
        OBJETIVO: Que el cliente deje sus datos o escriba al WhatsApp 4423479766.
        `;

        // Usamos el modelo público ultra-estable (gemini-1.5-flash)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt + "\n\nCliente pregunta: " + message }]
                }]
            })
        });

        const data = await response.json();

        // MODO DIAGNÓSTICO: Si Google nos bloquea, el bot nos dirá el porqué
        if (data.error) {
            return {
                statusCode: 200,
                body: JSON.stringify({ reply: "⚠️ Error de Google API: " + data.error.message })
            };
        }

        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Si Google no manda texto ni error
        if (!aiReply) {
             return {
                statusCode: 200,
                body: JSON.stringify({ reply: "⚠️ Google no respondió correctamente. Data: " + JSON.stringify(data) })
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: "⚠️ Error en el servidor Node: " + error.message })
        };
    }
};
