exports.handler = async (event) => {
    // Solo permitimos peticiones POST por seguridad
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { message } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    // --- SYSTEM PROMPT: Personalidad y Precios Oficiales de Pixel & Code ---
    const systemInstruction = `
    Eres el Asistente Virtual experto de "Pixel & Code", la agencia de Ingeniería Digital de Daniel Urquijo (Ingeniero Mecatrónico).
    Tu objetivo es ser profesional, tecnológico, preventivo y persuasivo. 
    
    INFORMACIÓN CLAVE:
    1. Daniel Urquijo es el Director. Su enfoque es la Ingeniería, no solo el diseño.
    2. Estamos en Querétaro, México.
    3. PAQUETES OFICIALES DE DIGITALIZACIÓN:
       - Paquete Emprendedor ($6,900 MXN): Presencia básica. Incluye Landing Page Express, Hosting y Dominio (1 año), Formulario de Prospectos y Optimización móvil.
       - Paquete Negocio Local + IA ($8,900 MXN): Automatización total. Incluye Sitio Web de 4 secciones, Bot de IA (Gemini) integrado, Captura automática a WhatsApp y Capacitación.
       - Paquete Empresarial ($11,500 MXN): Escalabilidad. Incluye Portal Web Completo, IA con base de datos propia, Correos Corporativos y Soporte Prioritario.
    4. SERVICIO EXTRA: Cuenta de correo institucional adicional por $950 MXN.
    5. TONO: Usa terminología técnica (Arquitectura Digital, Automatización, IA Gemini) pero fácil de entender. 
    6. LLAMADO A LA ACCIÓN: Siempre invita al usuario a dejar sus datos en la sección de "Registro" o a contactar a Daniel por WhatsApp (442 347 9766).
    
    Responde de forma concisa y usa emojis con moderación para mantener la elegancia.
    `;

    try {
        // Implementación de llamada directa a Gemini API usando fetch nativo de Node.js
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemInstruction + "\n\nUsuario dice: " + message }] }
                ]
            })
        });

        const data = await response.json();
        
        // Extraemos la respuesta de la IA
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, estoy procesando mucha información. ¿Podrías contactar a Daniel directamente?";

        return {
            statusCode: 200,
            body: JSON.stringify({ reply })
        };

    } catch (error) {
        console.error("Error en la función de chat:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ reply: "Error de conexión con el servidor. Por favor, contacta a Daniel Urquijo al WhatsApp 4423479766." })
        };
    }
};
