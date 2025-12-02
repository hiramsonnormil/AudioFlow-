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

        // Setup mobile menu
        setupMobileMenu();

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

    // Mobile elements
    const mobileLoginBtn = document.getElementById('mobile-openLoginBtn');
    const mobileSignupBtn = document.getElementById('mobile-openSignupBtn');
    const mobileUserMenu = document.getElementById('mobile-nav-user-menu');
    const mobileRecentsLink = document.getElementById('mobile-nav-recents');

    if (token) {
        // Logged in - Desktop
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            const initial = getUserInitial();
            const initialEl = userMenu.querySelector('.user-initial');
            if (initialEl) initialEl.textContent = initial;
        }
        if (recentsLink) recentsLink.style.display = 'block';

        // Logged in - Mobile
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
        if (mobileSignupBtn) mobileSignupBtn.style.display = 'none';
        if (mobileUserMenu) {
            mobileUserMenu.style.display = 'block';
            const initial = getUserInitial();
            const mobileInitialEl = mobileUserMenu.querySelector('.mobile-user-initial');
            if (mobileInitialEl) mobileInitialEl.textContent = initial;
        }
        if (mobileRecentsLink) mobileRecentsLink.style.display = 'flex';
    } else {
        // Logged out - Desktop
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
        if (recentsLink) recentsLink.style.display = 'none';

        // Logged out - Mobile
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
        if (mobileSignupBtn) mobileSignupBtn.style.display = 'flex';
        if (mobileUserMenu) mobileUserMenu.style.display = 'none';
        if (mobileRecentsLink) mobileRecentsLink.style.display = 'none';
    }
}

function setupEventListeners() {
    // Desktop logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearSession();
            window.location.href = '/';
        });
    }

    // Mobile logout
    const mobileLogoutBtn = document.getElementById('mobile-logoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
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

function setupMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    if (!hamburgerBtn || !mobileMenu || !mobileMenuOverlay) return;

    // Toggle menu function
    function toggleMobileMenu() {
        const isActive = mobileMenu.classList.contains('active');

        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    function openMobileMenu() {
        hamburgerBtn.classList.add('active');
        mobileMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    function closeMobileMenu() {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = ''; // Restore body scroll
    }

    // Hamburger button click
    hamburgerBtn.addEventListener('click', toggleMobileMenu);

    // Overlay click to close
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);

    // Close menu when clicking on a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close menu on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Close menu on window resize to desktop size
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

// Export for manual init if needed
window.initNavbar = initNavbar;

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
} else {
    initNavbar();
}
