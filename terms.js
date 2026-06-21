// Inyectamos el HTML del Modal de Términos en el body al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    const termsModalHTML = `
    <div id="terms-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] hidden items-center justify-center p-4 opacity-0 transition-opacity duration-500">
        <div class="glass-panel rounded-[2rem] p-8 md:p-12 max-w-3xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl transform scale-95 transition-transform duration-500 border border-white/20" id="terms-content" style="background: rgba(15, 15, 15, 0.6); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);">
            <button onclick="closeTermsModal()" class="absolute top-6 right-6 text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            <h2 class="text-2xl sm:text-3xl font-bold text-white mb-4 italic uppercase tracking-tighter">Términos y Condiciones</h2>
            <div class="w-16 h-1 bg-gold mb-8" style="background-color: #C5A059;"></div>
            
            <div class="text-xs sm:text-sm text-gray-400 space-y-5 leading-relaxed font-light text-left">
                <p><strong>1. Objeto y Aceptación:</strong> El presente documento regula el uso de los servicios web y programas de capacitación de la marca <strong>DU Pixel & Code</strong>, propiedad del Ing. Daniel Urquijo. Al navegar, adquirir un servicio o inscribirse a la Academia, el usuario acepta irrevocablemente estos términos.</p>
                
                <p><strong>2. Propiedad Intelectual:</strong> Todo el contenido (códigos, metodologías de cursos, prompts de IA, logotipos y diseños) son propiedad exclusiva de DU Pixel & Code. Queda estrictamente prohibida su reproducción, reventa o distribución no autorizada.</p>
                
                <p><strong>3. Pagos y Precios:</strong> Los precios están expresados en MXN y se procesan de manera segura a través de <strong>MercadoPago</strong>. Los servicios de desarrollo web se rigen bajo cotizaciones específicas y anticipos, mientras que el acceso a la Academia es inmediato tras la confirmación de pago.</p>
                
                <p><strong>4. Política de No Reembolso (CRÍTICO):</strong> Dada la naturaleza digital y de entrega inmediata de los cursos e integraciones IA, <strong>no se admiten devoluciones, cancelaciones ni reembolsos</strong> una vez otorgado el acceso. Cualquier intento de contracargo infundado será disputado utilizando este documento como evidencia de aceptación del servicio.</p>
                
                <p><strong>5. Exclusión de Responsabilidad por APIs:</strong> DU Pixel & Code integra inteligencia artificial de vanguardia; sin embargo, la continuidad de los asistentes (ej. Pixie AI) depende de la estabilidad de plataformas externas (Google Gemini, Netlify, etc.). No nos hacemos responsables por caídas de servidores de estos terceros que afecten su operatividad.</p>
                
                <p><strong>6. Uso Aceptable:</strong> El usuario se obliga a no utilizar nuestra plataforma, chats o formularios para introducir software malicioso, realizar ataques DoS o intentar vulnerar la seguridad de la infraestructura.</p>
                
                <p><strong>7. Jurisdicción:</strong> Para la interpretación y cumplimiento de estos términos, las partes se someten a las leyes federales de los Estados Unidos Mexicanos y a los tribunales de la Ciudad de Querétaro, renunciando a cualquier otro fuero.</p>
                
                <p class="italic text-[10px] mt-6">Última actualización: Junio de 2026.</p>
            </div>
            
            <div class="mt-10 text-center">
                <button onclick="closeTermsModal()" class="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-[#C5A059] transition-colors duration-300">Acepto los Términos</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', termsModalHTML);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Funciones globales para abrir y cerrar el modal
window.openTermsModal = function() {
    const modal = document.getElementById('terms-modal');
    const content = document.getElementById('terms-content');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
};

window.closeTermsModal = function() {
    const modal = document.getElementById('terms-modal');
    const content = document.getElementById('terms-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};