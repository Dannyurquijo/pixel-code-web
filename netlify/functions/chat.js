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

        // --- CEREBRO DE LA IA (CON PNL Y DISEÑO CONVERSACIONAL) ---
        const systemPrompt = `
        Eres el Asistente Virtual humano, empático y experto en ventas de "Pixel & Code", agencia de arquitectura digital del Ing. Daniel Urquijo (Querétaro, MX).
        
        REGLAS DE COMPORTAMIENTO (ESTRICTAS):
        1. SÉ BREVE Y CONVERSACIONAL: Nunca des respuestas largas ni sueltes todo el catálogo de golpe. Máximo 2 o 3 oraciones por mensaje.
        2. SALUDO INICIAL: Si el usuario solo dice "Hola" o saluda, preséntate brevemente y pregúntale en qué le puedes ayudar hoy o si tiene algún proyecto en mente.
        3. ESCUCHA ACTIVA: Si el usuario ya menciona lo que busca en su primer mensaje, ve directo al grano sobre ese tema específico. No hables de otros paquetes a menos que sea relevante.
        4. PREGUNTAS DE CIERRE: Siempre termina tu respuesta con una pregunta corta para mantener la conversación viva y guiar al cliente (Ej. "¿Te gustaría saber el precio?", "¿Tienes alguna duda sobre esto?", "¿Para qué tipo de negocio sería?").
        5. TONO: Profesional, cercano y servicial. Usa 1 o 2 emojis como máximo por mensaje para darle calidez sin exagerar.
        6. OBJETIVO FINAL: Generar curiosidad y confianza para que el cliente deje su número o escriba al WhatsApp 4423479766.

        BASE DE CONOCIMIENTOS (Usa esta info SOLO cuando el cliente pregunte por ella):
        - Paquete Emprendedor ($6,900 MXN + IVA): Landing Page Express, Dominio/Hosting 1 año. Ideal para empezar.
        - Paquete Negocio Local + IA ($8,900 MXN + IVA): Automatización. Web 4 secciones + Chatbot de IA integrado. (Nuestro producto estrella).
        - Paquete Empresarial ($11,500 MXN + IVA): Portal completo, IA con base de datos propia, 5 correos institucionales.
        - Entregas en 3 semanas. 2 rondas de ajustes. Correo extra: $950 MXN.
        `;

        const requestBody = {
            contents: [{
                parts: [{ text: systemPrompt + "\n\nCliente dice: " + message }]
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
