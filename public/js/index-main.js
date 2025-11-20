/**
 * Landing Page Controller
 * Manages authentication modal, user state, and processor integration
 */

import authModal from './auth/authModal.js';
import { isAuthenticated, getUser, clearSession } from './auth/session.js';
import { getUserInitial } from './utils/dom.js';

class LandingController {
  constructor() {
    this.authModal = authModal;
    this.navLoginBtn = null;
    this.navSignupBtn = null;
    this.navAuthButtons = null;
    this.navUserMenu = null;
    this.navUserAvatar = null;
    this.navUserName = null;
    this.navLogoutBtn = null;
  }

  /**
   * Initialize landing page controller
   */
  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.updateAuthUI();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.navLoginBtn = document.getElementById('navLoginBtn');
    this.navSignupBtn = document.getElementById('navSignupBtn');
    this.navAuthButtons = document.querySelector('.nav-auth-buttons');
    this.navUserMenu = document.getElementById('navUserMenu');
    this.navUserAvatar = document.getElementById('navUserAvatar');
    this.navUserName = document.getElementById('navUserName');
    this.navLogoutBtn = document.getElementById('navLogoutBtn');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Login button
    if (this.navLoginBtn) {
      this.navLoginBtn.addEventListener('click', () => {
        this.openLoginModal();
      });
    }

    // Signup button
    if (this.navSignupBtn) {
      this.navSignupBtn.addEventListener('click', () => {
        this.openSignupModal();
      });
    }

    // Logout button
    if (this.navLogoutBtn) {
      this.navLogoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
  }

  /**
   * Open login modal
   */
  openLoginModal() {
    this.authModal.open('login', (user) => {
      console.log('Login successful:', user);
      this.updateAuthUI();
      this.onAuthSuccess(user);
    });
  }

  /**
   * Open signup modal
   */
  openSignupModal() {
    this.authModal.open('signup', (user) => {
      console.log('Signup successful:', user);
      this.updateAuthUI();
      this.onAuthSuccess(user);
    });
  }

  /**
   * Handle logout
   */
  handleLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
      clearSession();
      this.updateAuthUI();
      
      // Show success message
      this.showNotification('Logout realizado com sucesso!', 'success');
    }
  }

  /**
   * Update UI based on authentication state
   */
  updateAuthUI() {
    const authenticated = isAuthenticated();
    
    if (authenticated) {
      const user = getUser();
      
      // Hide auth buttons
      if (this.navAuthButtons) {
        this.navAuthButtons.style.display = 'none';
      }
      
      // Show user menu
      if (this.navUserMenu) {
        this.navUserMenu.style.display = 'flex';
      }
      
      // Update user avatar
      if (this.navUserAvatar) {
        const initial = getUserInitial(user.name);
        this.navUserAvatar.textContent = initial;
      }
      
      // Update user name
      if (this.navUserName) {
        this.navUserName.textContent = user.name;
      }
    } else {
      // Show auth buttons
      if (this.navAuthButtons) {
        this.navAuthButtons.style.display = 'flex';
      }
      
      // Hide user menu
      if (this.navUserMenu) {
        this.navUserMenu.style.display = 'none';
      }
    }
  }

  /**
   * Called after successful authentication
   * @param {Object} user - User data
   */
  onAuthSuccess(user) {
    // Can be extended to handle post-auth actions
    // For example: scroll to processor section, show welcome message, etc.
    this.showNotification(`Bem-vindo(a), ${user.name}!`, 'success');
  }

  /**
   * Show notification message
   * @param {string} message - Message to display
   * @param {string} type - Type of notification (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 24px',
      borderRadius: '12px',
      backgroundColor: type === 'success' ? 'var(--copper)' : 
                        type === 'error' ? '#d32f2f' : 
                        'var(--charcoal)',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '10000',
      animation: 'slideInRight 0.3s ease-out',
      maxWidth: '300px'
    });
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// Add notification animations to document
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const landingController = new LandingController();
    landingController.init();
  });
} else {
  const landingController = new LandingController();
  landingController.init();
}

export { LandingController };
