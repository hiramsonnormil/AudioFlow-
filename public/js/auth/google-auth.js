// Google OAuth handler for login and password recovery

import { restoreSessionFromCookie } from './session.js';

export function initGoogleAuth(buttonId, context = 'login') {
    const button = document.getElementById(buttonId);

    if (!button) {
        console.error(`Google auth button not found: ${buttonId}`);
        return;
    }

    button.addEventListener('click', () => {
        // Redirect to Google OAuth endpoint
        window.location.href = '/api/auth/google';
    });
}

// Handle token from URL or cookie (after Google OAuth callback)
export async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        showError(error);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Check if we just came back from Google OAuth (has 'code' or 'token' param)
    const hasOAuthParams = urlParams.has('code') || urlParams.has('token') || urlParams.has('scope') || urlParams.get('oauth') === 'google';

    if (hasOAuthParams) {
        try {
            const restored = await restoreSessionFromCookie();

            if (!restored) {
                console.warn('Failed to restore session via OAuth callback');
            }
        } catch (err) {
            console.error('Erro ao restaurar sessão via OAuth:', err);
        }

        // Clean URL and reload to ensure UI updates with new session data
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
    }
}

function showError(errorCode) {
    const errorMessage = document.getElementById('errorMessage');
    if (!errorMessage) return;

    let message = '';

    switch (errorCode) {
        case 'account_not_found':
            message = 'Nenhuma conta encontrada com este e-mail do Google. Por favor, crie uma conta primeiro.';
            break;
        case 'google_auth_failed':
            message = 'Falha na autenticação com Google. Tente novamente.';
            break;
        default:
            message = 'Erro ao fazer login com Google. Tente novamente.';
    }

    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}
