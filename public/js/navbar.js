import { getToken, getUserInitial, clearSession } from './auth/session.js';

async function initNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    try {
        // Load navbar HTML
        const response = await fetch('/html/navbar.html');
        if (!response.ok) throw new Error('Failed to load navbar');
        const html = await response.text();
        placeholder.innerHTML = html;

        // Setup active state
        setupActiveState();

        // Setup auth state
        setupAuthState();

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Error initializing navbar:', error);
    }
}

function setupActiveState() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const links = document.querySelectorAll('.nav-link');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Simple active check
        if (path === '/' && href.startsWith('/#')) {
            // On home page, check hash
            if (href === '/' + hash) {
                // link.classList.add('active'); // Optional: add active class style if exists
            }
        } else if (href === path) {
            // link.classList.add('active'); // Optional: add active class style if exists
            link.style.color = 'var(--copper-light)'; // Inline style for now as per design system
        }
    });
}

function setupAuthState() {
    const token = getToken();
    const loginBtn = document.getElementById('openLoginBtn');
    const signupBtn = document.getElementById('openSignupBtn');
    const userMenu = document.getElementById('nav-user-menu');
    const recentsLink = document.getElementById('nav-recents');

    if (token) {
        // Logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            const initial = getUserInitial();
            const initialEl = userMenu.querySelector('.user-initial');
            if (initialEl) initialEl.textContent = initial;
        }
        if (recentsLink) recentsLink.style.display = 'block';
    } else {
        // Logged out
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
        if (recentsLink) recentsLink.style.display = 'none';
    }
}

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearSession();
            window.location.href = '/';
        });
    }

    // Re-attach modal listeners if they exist on the page
    // Note: This assumes the modal logic is global or attached to these IDs
    // Since we replaced the DOM, we might need to re-trigger modal setup if it was done on DOMContentLoaded
    // For now, we assume the page's main script handles modal opening if it finds the elements, 
    // but since we inject async, we might need to dispatch an event.

    // Dispatch event that navbar is ready
    window.dispatchEvent(new CustomEvent('navbar-loaded'));
}

// Export for manual init if needed
window.initNavbar = initNavbar;

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
} else {
    initNavbar();
}
