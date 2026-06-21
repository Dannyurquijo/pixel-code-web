// Inyectamos el HTML del Modal en el body al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    const modalHTML = `
    <div id="privacy-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] hidden items-center justify-center p-4 opacity-0 transition-opacity duration-500">
        <div class="glass-panel rounded-[2rem] p-8 md:p-12 max-w-3xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl transform scale-95 transition-transform duration-500 border border-white/20" id="privacy-content" style="background: rgba(15, 15, 15, 0.6); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);">
            <button onclick="closePrivacyModal()" class="absolute top-6 right-6 text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            <h2 class="text-2xl sm:text-3xl font-bold text-white mb-4 italic uppercase tracking-tighter">Aviso de Privacidad Integral</h2>
            <div class="w-16 h-1 bg-gold mb-8" style="background-color: #C5A059;"></div>
            
            <div class="text-xs sm:text-sm text-gray-400 space-y-5 leading-relaxed font-light text-left">
                <p><strong>1. Identidad y Domicilio:</strong> El Ing. Daniel Urquijo (DU Pixel & Code), con domicilio en Cam. a Vanegas, 76910 Corregidora, Qro., es responsable de sus datos bajo la LFPDPPP.</p>
                <p><strong>2. Datos Recabados:</strong> Nombre, email, WhatsApp, proyecto y datos de navegación. <em>No recabamos datos sensibles ni almacenamos tarjetas bancarias.</em></p>
                <p><strong>3. Finalidades:</strong> Proveer servicios de arquitectura de software, gestión de la Academia, procesamiento de pagos y soporte técnico.</p>
                <p><strong>4. Uso de Inteligencia Artificial (CRÍTICO):</strong> Utilizamos modelos de lenguaje (API Gemini). Al interactuar con Pixie AI, sus textos son procesados algorítmicamente. <strong>Se prohíbe ingresar contraseñas, datos financieros o sensibles en los chats.</strong></p>
                <p><strong>5. Transferencia a Terceros:</strong> Compartimos datos estrictamente operativos con MercadoPago (pagos), FormSubmit (correos) y Google Cloud (IA).</p>
                <p><strong>6. Derechos ARCO:</strong> Puede acceder, rectificar, cancelar u oponerse al uso de sus datos enviando un correo a <strong>info@dupixelcode.com</strong>.</p>
                <p><strong>7. Cookies:</strong> Usamos tecnologías de rastreo para funcionalidad técnica y pasarelas de pago.</p>
                <p class="italic text-[10px] mt-6">Última actualización: Junio de 2026.</p>
            </div>
            
            <div class="mt-10 text-center">
                <button onclick="closePrivacyModal()" class="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-[#C5A059] transition-colors duration-300">Entendido</button>
            </div>
        </div>
    </div>
    `;

    // Inyectamos el HTML al final del documento
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Si Lucide Icons está cargado, renderizamos el icono de cerrar (X)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Lógica global para abrir y cerrar el modal desde cualquier botón
window.openPrivacyModal = function() {
    const modal = document.getElementById('privacy-modal');
    const content = document.getElementById('privacy-content');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
};

window.closePrivacyModal = function() {
    const modal = document.getElementById('privacy-modal');
    const content = document.getElementById('privacy-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};