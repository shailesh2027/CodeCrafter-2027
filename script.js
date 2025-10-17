class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('users')) || {};
        this.init();
    }

    init() {
        this.checkAuthState();
        this.loadPage('login');
        this.setupEventListeners();
    }

    // Hash function for passwords (simple implementation)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Validate password strength
    validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };

        const strength = Object.values(requirements).filter(Boolean).length;
        let message = '';

        if (strength <= 2) {
            message = 'Weak password';
        } else if (strength <= 4) {
            message = 'Medium password';
        } else {
            message = 'Strong password';
        }

        return {
            isValid: strength >= 3,
            strength: strength,
            message: message,
            requirements: requirements
        };
    }

    // Update password strength indicator
    updatePasswordStrength(password) {
        const validation = this.validatePassword(password);
        const strengthBar = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('passwordStrengthText');

        if (strengthBar && strengthText) {
            strengthBar.className = 'strength-bar';
            strengthBar.classList.add(`strength-${validation.strength <= 2 ? 'weak' : validation.strength <= 4 ? 'medium' : 'strong'}`);
            strengthText.textContent = validation.message;
            strengthText.className = `strength-text ${validation.strength <= 2 ? 'text-danger' : validation.strength <= 4 ? 'text-warning' : 'text-success'}`;
        }
    }

    // Register new user
    register(username, password, confirmPassword) {
        if (!username || !password) {
            this.showModal('Error', 'Please fill in all fields');
            return false;
        }

        if (password !== confirmPassword) {
            this.showModal('Error', 'Passwords do not match');
            return false;
        }

        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.isValid) {
            this.showModal('Error', 'Password does not meet requirements. Please ensure it has at least 8 characters with uppercase, lowercase, number, and special character.');
            return false;
        }

        if (this.users[username]) {
            this.showModal('Error', 'Username already exists');
            return false;
        }

        // Store user with hashed password
        this.users[username] = {
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        localStorage.setItem('users', JSON.stringify(this.users));
        this.showModal('Success', 'Registration successful! Please login.');
        this.loadPage('login');
        return true;
    }

    // Login user
    login(username, password) {
        if (!username || !password) {
            this.showModal('Error', 'Please fill in all fields');
            return false;
        }

        const user = this.users[username];
        if (!user || user.password !== this.hashPassword(password)) {
            this.showModal('Error', 'Invalid username or password');
            return false;
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('users', JSON.stringify(this.users));

        // Set current user
        this.currentUser = {
            username: username,
            ...user
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.showModal('Success', `Welcome back, ${username}!`);
        this.loadPage('dashboard');
        return true;
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showModal('Success', 'You have been logged out successfully');
        this.loadPage('login');
    }

    // Change password
    changePassword(currentPassword, newPassword, confirmPassword) {
        if (!this.currentUser) return false;

        const user = this.users[this.currentUser.username];
        if (user.password !== this.hashPassword(currentPassword)) {
            this.showModal('Error', 'Current password is incorrect');
            return false;
        }

        if (newPassword !== confirmPassword) {
            this.showModal('Error', 'New passwords do not match');
            return false;
        }

        const passwordValidation = this.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            this.showModal('Error', 'New password does not meet requirements');
            return false;
        }

        user.password = this.hashPassword(newPassword);
        localStorage.setItem('users', JSON.stringify(this.users));
        this.showModal('Success', 'Password changed successfully');
        return true;
    }

    // Check authentication state
    checkAuthState() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    }

    // Load different pages
    loadPage(page) {
        const container = document.getElementById('mainContainer');
        
        switch (page) {
            case 'login':
                container.innerHTML = this.getLoginHTML();
                break;
            case 'register':
                container.innerHTML = this.getRegisterHTML();
                break;
            case 'dashboard':
                if (!this.currentUser) {
                    this.loadPage('login');
                    return;
                }
                container.innerHTML = this.getDashboardHTML();
                break;
            case 'change-password':
                if (!this.currentUser) {
                    this.loadPage('login');
                    return;
                }
                container.innerHTML = this.getChangePasswordHTML();
                break;
        }

        this.updateNavigation();
        this.setupPageEventListeners();
    }

    // Update navigation based on auth state
    updateNavigation() {
        const navLinks = document.getElementById('navLinks');
        
        if (this.currentUser) {
            navLinks.innerHTML = `
                <span class="nav-link">Welcome, ${this.currentUser.username}</span>
                <a href="#" class="nav-link" onclick="auth.loadPage('change-password')">
                    <i class="fas fa-key"></i> Change Password
                </a>
                <a href="#" class="nav-link logout" onclick="auth.logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="#" class="nav-link" onclick="auth.loadPage('login')">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="#" class="nav-link" onclick="auth.loadPage('register')">
                    <i class="fas fa-user-plus"></i> Register
                </a>
            `;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Modal close functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    setupPageEventListeners() {
        // Password toggle functionality
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group').querySelector('input');
                const icon = e.target.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });

        // Password strength indicator
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;
                this.login(username, password);
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('registerUsername').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                this.register(username, password, confirmPassword);
            });
        }

        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmNewPassword').value;
                this.changePassword(currentPassword, newPassword, confirmPassword);
            });
        }
    }

    // Modal functionality
    showModal(title, message) {
        const modal = document.getElementById('modal');
        const modalMessage = document.getElementById('modalMessage');
        
        modalMessage.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
        `;
        
        modal.style.display = 'block';
        
        // Auto-hide success messages after 3 seconds
        if (title === 'Success') {
            setTimeout(() => {
                this.hideModal();
            }, 3000);
        }
    }

    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // HTML Templates
    getLoginHTML() {
        return `
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-icon">
                        <i class="fas fa-sign-in-alt"></i>
                    </div>
                    <h1 class="auth-title">Welcome Back</h1>
                    <p class="auth-subtitle">Sign in to your account</p>
                </div>

                <form id="loginForm">
                    <div class="form-group">
                        <label for="loginUsername" class="form-label">Username</label>
                        <div class="input-group">
                            <input type="text" id="loginUsername" class="form-input" placeholder="Enter your username" required>
                            <span class="input-icon"><i class="fas fa-user"></i></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="loginPassword" class="form-label">Password</label>
                        <div class="input-group">
                            <input type="password" id="loginPassword" class="form-input" placeholder="Enter your password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </form>

                <div class="text-center mt-3">
                    <p>Don't have an account? <a href="#" onclick="auth.loadPage('register')" class="text-link">Register here</a></p>
                </div>
            </div>
        `;
    }

    getRegisterHTML() {
        return `
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <h1 class="auth-title">Create Account</h1>
                    <p class="auth-subtitle">Join us today</p>
                </div>

                <form id="registerForm">
                    <div class="form-group">
                        <label for="registerUsername" class="form-label">Username</label>
                        <div class="input-group">
                            <input type="text" id="registerUsername" class="form-input" placeholder="Choose a username" required>
                            <span class="input-icon"><i class="fas fa-user"></i></span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="registerPassword" class="form-label">Password</label>
                        <div class="input-group">
                            <input type="password" id="registerPassword" class="form-input" placeholder="Create a password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="password-strength">
                            <div class="strength-bar" id="passwordStrength"></div>
                            <div class="strength-text" id="passwordStrengthText">Enter a password</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword" class="form-label">Confirm Password</label>
                        <div class="input-group">
                            <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm your password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>
                </form>

                <div class="text-center mt-3">
                    <p>Already have an account? <a href="#" onclick="auth.loadPage('login')" class="text-link">Login here</a></p>
                </div>
            </div>
        `;
    }

    getDashboardHTML() {
        const user = this.currentUser;
        const createdDate = new Date(user.createdAt).toLocaleDateString();
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'First login';

        return `
            <div class="dashboard">
                <div class="dashboard-card">
                    <div class="dashboard-header">
                        <h1 class="dashboard-title">Dashboard</h1>
                        <div class="user-actions">
                            <button class="btn btn-secondary" onclick="auth.loadPage('change-password')">
                                <i class="fas fa-key"></i> Change Password
                            </button>
                        </div>
                    </div>

                    <div class="user-info-grid">
                        <div class="info-card">
                            <i class="fas fa-user"></i>
                            <h3>Username</h3>
                            <p>${user.username}</p>
                        </div>
                        <div class="info-card">
                            <i class="fas fa-calendar-plus"></i>
                            <h3>Account Created</h3>
                            <p>${createdDate}</p>
                        </div>
                        <div class="info-card">
                            <i class="fas fa-sign-in-alt"></i>
                            <h3>Last Login</h3>
                            <p>${lastLogin}</p>
                        </div>
                        <div class="info-card">
                            <i class="fas fa-shield-alt"></i>
                            <h3>Status</h3>
                            <p>Verified</p>
                        </div>
                    </div>

                    <div class="welcome-message">
                        <h2>Welcome, ${user.username}!</h2>
                        <p>You have successfully logged into the SecureAuth system. Your account is secure and protected.</p>
                    </div>
                </div>
            </div>
        `;
    }

    getChangePasswordHTML() {
        return `
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-icon">
                        <i class="fas fa-key"></i>
                    </div>
                    <h1 class="auth-title">Change Password</h1>
                    <p class="auth-subtitle">Update your security settings</p>
                </div>

                <form id="changePasswordForm">
                    <div class="form-group">
                        <label for="currentPassword" class="form-label">Current Password</label>
                        <div class="input-group">
                            <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="newPassword" class="form-label">New Password</label>
                        <div class="input-group">
                            <input type="password" id="newPassword" class="form-input" placeholder="Enter new password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="password-strength">
                            <div class="strength-bar" id="passwordStrength"></div>
                            <div class="strength-text" id="passwordStrengthText">Enter a new password</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="confirmNewPassword" class="form-label">Confirm New Password</label>
                        <div class="input-group">
                            <input type="password" id="confirmNewPassword" class="form-input" placeholder="Confirm new password" required>
                            <button type="button" class="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-sync-alt"></i> Update Password
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="auth.loadPage('dashboard')">
                            <i class="fas fa-arrow-left"></i> Back to Dashboard
                        </button>
                    </div>
                </form>
            </div>
        `;
    }
}

// Add some CSS for text links
const additionalCSS = `
.text-link {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
}

.text-link:hover {
    text-decoration: underline;
}

.form-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.form-actions .btn {
    flex: 1;
    min-width: 120px;
}

.input-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray-color);
}

.input-group {
    position: relative;
}

.input-group .form-input {
    padding-left: 3rem;
}

.text-danger { color: var(--danger-color); }
.text-warning { color: var(--warning-color); }
.text-success { color: var(--success-color); }

.mt-3 { margin-top: 1rem; }
.text-center { text-align: center; }
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Initialize the authentication system
const auth = new AuthSystem();