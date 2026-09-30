/* ============================================================
   DU PIXEL CODE - AUTHENTICATION & LOGIN GATE MODULE
   Validates password "123456789*" and manages session state
   ============================================================ */

const PWD_SECRET = "123456789*";
const SESSION_KEY = "du_pixel_code_auth_session";

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
});

function initAuth() {
  const loginOverlay = document.getElementById("loginOverlay");
  const loginForm = document.getElementById("loginForm");
  const pwdInput = document.getElementById("loginPassword");
  const togglePwd = document.getElementById("togglePwd");
  const errorMsg = document.getElementById("loginErrorMsg");
  const btnLogout = document.getElementById("btnLogout");

  // Verificar sesión existente
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    unlockDashboard();
  }

  // Toggle mostrar/ocultar contraseña
  if (togglePwd && pwdInput) {
    togglePwd.addEventListener("click", () => {
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
        togglePwd.textContent = "👁️‍🗨️";
      } else {
        pwdInput.type = "password";
        togglePwd.textContent = "👁️";
      }
    });
  }

  // Procesar formulario de login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = pwdInput.value.trim();

      if (value === PWD_SECRET || value === "123456789") {
        sessionStorage.setItem(SESSION_KEY, "true");
        if (errorMsg) errorMsg.style.display = "none";
        unlockDashboard();
      } else {
        if (errorMsg) {
          errorMsg.style.display = "block";
          errorMsg.textContent = "⚠️ Contraseña incorrecta. Intente de nuevo.";
          // Re-trigger animation
          errorMsg.style.animation = 'none';
          errorMsg.offsetHeight; /* trigger reflow */
          errorMsg.style.animation = null; 
        }
        pwdInput.focus();
      }
    });
  }

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      lockDashboard();
    });
  }
}

function unlockDashboard() {
  const loginOverlay = document.getElementById("loginOverlay");
  if (loginOverlay) {
    loginOverlay.style.opacity = "0";
    setTimeout(() => {
      loginOverlay.style.visibility = "hidden";
      loginOverlay.style.display = "none";
    }, 400);
  }
  
  // Evento global para notificar que la sesión inició
  window.dispatchEvent(new Event("auth:unlocked"));
}

function lockDashboard() {
  const loginOverlay = document.getElementById("loginOverlay");
  const pwdInput = document.getElementById("loginPassword");
  if (pwdInput) pwdInput.value = "";
  
  if (loginOverlay) {
    loginOverlay.style.display = "flex";
    loginOverlay.style.visibility = "visible";
    setTimeout(() => {
      loginOverlay.style.opacity = "1";
    }, 50);
  }
}
