/**
 * Backend de Pixel & Code para Gemini AI - Versión Final
 * Modelo optimizado: gemini-2.5-flash
 */

exports.handler = async (event) => {
    // Seguridad: Solo aceptamos peticiones POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        // Verificamos que Netlify esté leyendo la llave
        if (!apiKey) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ reply: "Error Interno: Netlify no está leyendo la GEMINI_API_KEY." }) 
            };
        }

        // --- CEREBRO DE LA IA ---
        const systemPrompt = `
        Eres el Asistente Virtual de "Pixel & Code", agencia liderada por el Ing. Daniel Urquijo (Mecatrónico).
        UBICACIÓN: Querétaro, MX.
        
        CATÁLOGO DE PAQUETES (Precios + IVA):
        1. Emprendedor ($6,900 MXN): Presencia básica. Landing Page Express, Dominio/Hosting 1 año.
        2. Negocio Local + IA ($8,900 MXN): Automatización total. Sitio web y Chatbot de IA.
        3. Empresarial ($11,500 MXN): Escalabilidad. Portal completo, correos e IA con base de datos.
        
        TÉRMINOS: Entrega en 3 semanas. 2 rondas de ajustes. Correo extra: $950 MXN.
        OBJETIVO: Ser muy amable, profesional y buscar que el cliente deje sus datos o escriba al WhatsApp 4423479766.
        `;

        const requestBody = {
            contents: [{
                parts: [{ text: systemPrompt + "\n\nCliente pregunta: " + message }]
            }]
        };

        // LLAMADA OFICIAL A GEMINI 2.5 FLASH
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();

        // Si hay algún problema con la cuenta de Google, lo reportamos suavemente
        if (data.error) {
            return {
                statusCode: 200,
                body: JSON.stringify({ reply: "⚠️ Error de Google API: " + data.error.message })
            };
        }

        // Extraemos la respuesta inteligente de Gemini
        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiReply) {
             return {
                statusCode: 200,
                body: JSON.stringify({ reply: "⚠️ El servidor de IA está ocupado. Intenta en unos segundos." })
            };
        }

        // Enviamos la respuesta de vuelta a tu página web
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        // Si hay un error de conexión general
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: "⚠️ Error de conexión: " + error.message })
        };
    }
};
