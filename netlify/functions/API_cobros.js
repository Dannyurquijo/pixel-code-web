const { MercadoPagoConfig, Preference } = require('mercadopago');

// Inicialización del cliente con el token de entorno
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { paquete } = JSON.parse(event.body);

        // Catálogo Maestro Unificado (Soporta TODAS las páginas de tu ecosistema)
        const listaCombos = {
            // --- COMBOS VIP (Curso + Paquete con Bono) para oferta-vip.html ---
            'combo_emprendedor': {
                title: 'Curso IA Peritajes + Web Emprendedor + Bono Peritaje',
                price: 6730
            },
            'combo_negocio': {
                title: 'Curso IA Peritajes + Web Negocio Local (Pixie) + Bono Peritaje',
                price: 11560
            },
            'combo_empresarial': {
                title: 'Curso IA Peritajes + Web Empresarial (RAG) + Bono Peritaje',
                price: 20400
            },
            
            // --- PAQUETES WEB NORMALES (Solo Web) para cobros.html ---
            'paquete_web_1': {
                title: 'Web Presencia Digital',
                price: 4830
            },
            'paquete_web_2': {
                title: 'Web Ecosistema Dinámico (Pixie)',
                price: 6230
            },
            'paquete_web_3': {
                title: 'Web Infraestructura Premium (RAG)',
                price: 8050
            },
            
            // --- ÚNICAMENTE EL CURSO (Modal de ambas páginas) ---
            'solo_curso': {
                title: 'Masterclass: Herramientas IA para Peritajes',
                price: 1900
            }
        };

        // Validación y asignación del paquete seleccionado
        const paqueteSeleccionado = listaCombos[paquete];
        
        if (!paqueteSeleccionado) {
            console.error(`Error: El paquete solicitado no existe en el catálogo: ${paquete}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: `El paquete solicitado '${paquete}' no es válido.` })
            };
        }

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [{
                    id: paquete,
                    title: paqueteSeleccionado.title,
                    quantity: 1,
                    unit_price: paqueteSeleccionado.price,
                    currency_id: 'MXN'
                }],
                back_urls: {
                    success: 'https://dupixelcode.com/pago-exitoso.html',
                    failure: 'https://dupixelcode.com/cobros.html',
                    pending: 'https://dupixelcode.com/cobros.html'
                },
                auto_return: 'approved'
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: response.id })
        };

    } catch (error) {
        console.error('Error MP:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falla al procesar la orden de pago.' }) };
    }
};
