/* Main App Logic */

const App = {
    state: {
        currentView: 'splash',
        user: null
    },

    init() {
        this.state.user = DataService.getCurrentUser();

        // Initial Routing
        setTimeout(() => {
            this.removeSplashScreen();
            if (this.state.user) {
                this.router('home');
            } else {
                this.router('login');
            }
        }, 2000);

        // Bind Global Events
        this.bindEvents();
    },

    removeSplashScreen() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    },

    bindEvents() {
        // Bottom Nav Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');

                // Update active state
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                this.router(page);
            });
        });

        // Global Event Delegation for buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) {
                const btn = e.target.closest('[data-action]');
                const action = btn.getAttribute('data-action');
                this.handleAction(action, btn);
            }
        });
    },

    router(view) {
        const appContent = document.getElementById('app-content');
        const bottomNav = document.getElementById('bottom-nav');

        this.state.currentView = view;
        console.log(`Navigating to: ${view}`);

        // Show/Hide Bottom Nav
        if (['login', 'register', 'role-selection'].includes(view)) {
            bottomNav.classList.add('hidden');
        } else {
            bottomNav.classList.remove('hidden');
        }

        switch (view) {
            case 'login':
                appContent.innerHTML = Views.login();
                break;
            case 'register':
                appContent.innerHTML = Views.register();
                break;
            case 'role-selection':
                appContent.innerHTML = Views.roleSelection();
                break;
            case 'home':
                appContent.innerHTML = Views.home(this.state.user);
                this.initMap(); // Initialize map after rendering
                break;
            case 'requests': // Added requests view
                appContent.innerHTML = Views.requests(this.state.user);
                break;
            case 'profile':
                appContent.innerHTML = Views.profile(this.state.user);
                break;
            default:
                appContent.innerHTML = Views.home(this.state.user);
        }

        // Re-initialize icons for new content
        lucide.createIcons();
    },

    handleAction(action, target) {
        if (action === 'goto-register') this.router('register');
        if (action === 'goto-login') this.router('login');

        if (action === 'submit-login') {
            const phone = document.getElementById('phone').value;
            const otp = document.getElementById('otp').value;
            try {
                const user = DataService.loginUser(phone, otp);
                this.state.user = user;
                this.router('home');
                this.showToast(`Welcome back, ${user.name}!`, 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        }

        if (action === 'submit-register') {
            const name = document.getElementById('reg-name').value;
            const phone = document.getElementById('reg-phone').value;
            const bloodGroup = document.getElementById('reg-blood').value;

            if (!name || !phone) return this.showToast("Please fill all fields", "error");

            try {
                const newUser = DataService.registerUser({ name, phone, bloodGroup, role: 'donor' }); // Default role temporarily
                this.state.user = newUser;
                this.router('role-selection');
                this.showToast('Registration successful!', 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        }

        if (action === 'select-role') {
            const role = target.getAttribute('data-role');
            DataService.updateUser({ role });
            this.state.user.role = role;
            this.router('home');
        }

        if (action === 'logout') {
            DataService.logout();
            this.state.user = null;
            this.router('login');
            this.showToast('Logged out successfully');
        }

        if (action === 'raise-request') {
            // For now, just a prompt or modal. Let's start with a simple interaction
            const hospital = prompt("Enter Hospital Name:");
            const units = prompt("Enter Units Required:", "1");
            if (hospital && units) {
                const req = DataService.createRequest({
                    seekerName: this.state.user.name,
                    seekerPhone: this.state.user.phone,
                    bloodGroup: this.state.user.bloodGroup,
                    hospital: hospital,
                    units: units,
                    location: "Current Location"
                });
                this.showToast("Emergency Request Raised! Notifying Donors...", "success");
                // Simulate notification
                setTimeout(() => this.showToast("3 Donors found nearby!", "success"), 2000);
            }
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        if (type === 'error') toast.style.borderLeftColor = 'var(--color-danger)';
        if (type === 'success') toast.style.borderLeftColor = 'var(--color-success)';

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    initMap() {
        // Only init if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Cleanup existing map if re-rendering
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Default: Center of India or user location
        const defaultCoords = [17.3850, 78.4867]; // Hyderabad
        this.map = L.map('map').setView(defaultCoords, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Try getting user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                this.map.setView([latitude, longitude], 14);

                // User Marker
                L.marker([latitude, longitude]).addTo(this.map)
                    .bindPopup("You are here")
                    .openPopup();

                // Add some dummy donors nearby
                this.addDummyMarkers(latitude, longitude);

            }, () => {
                this.showToast("Location access denied. Showing default view.", "error");
                this.addDummyMarkers(defaultCoords[0], defaultCoords[1]);
            });
        } else {
            this.addDummyMarkers(defaultCoords[0], defaultCoords[1]);
        }
    },

    addDummyMarkers(lat, lng) {
        // Mock Donors
        const donors = [
            { lat: lat + 0.002, lng: lng + 0.002, bg: 'A+' },
            { lat: lat - 0.002, lng: lng - 0.001, bg: 'O+' },
            { lat: lat + 0.001, lng: lng - 0.003, bg: 'B-' }
        ];

        const donorIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#EF4444; width:30px; height:30px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);'>D</div>",
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        donors.forEach(d => {
            L.marker([d.lat, d.lng], { icon: donorIcon }).addTo(this.map)
                .bindPopup(`Donor (${d.bg}) Available`);
        });
    }
};

/* View Templates */
const Views = {
    login: () => `
        <div class="flex flex-col h-full justify-center p-8 animate-fade-in">
            <div class="text-center mb-8">
                <i data-lucide="droplet" class="text-red-500 mx-auto mb-4" style="width: 48px; height: 48px; display: block; margin: 0 auto;"></i>
                <h2 class="text-2xl font-bold mb-2">Welcome Back</h2>
                <p class="text-gray-500">Sign in to continue saving lives</p>
            </div>
            
            <div class="input-group">
                <input type="tel" id="phone" class="input-field" placeholder="Phone Number" value="9876543210">
            </div>
            <div class="input-group">
                <input type="number" id="otp" class="input-field" placeholder="Enter OTP (Any 4 digits)" value="1234">
            </div>
            
            <button class="btn btn-primary btn-block mb-4" data-action="submit-login">
                Login
                <i data-lucide="arrow-right" size="18"></i>
            </button>
            
            <p class="text-center text-sm text-gray-500">
                Don't have an account? <a href="#" class="text-red-500 font-semibold" data-action="goto-register">Register</a>
            </p>
        </div>
    `,

    register: () => `
        <div class="flex flex-col h-full justify-center p-8 animate-fade-in">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold">New Registration</h2>
                <p class="text-gray-500">Join our community of heroes</p>
            </div>
            
            <div class="input-group">
                <input type="text" id="reg-name" class="input-field" placeholder="Full Name">
            </div>
            <div class="input-group">
                <input type="tel" id="reg-phone" class="input-field" placeholder="Phone Number">
            </div>
            <div class="input-group">
                <select id="reg-blood" class="input-field">
                    <option value="" disabled selected>Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                </select>
            </div>
            
            <button class="btn btn-primary btn-block mb-4" data-action="submit-register">
                Create Account
            </button>
            
            <p class="text-center text-sm text-gray-500">
                Already have an account? <a href="#" class="text-red-500 font-semibold" data-action="goto-login">Login</a>
            </p>
        </div>
    `,

    roleSelection: () => `
        <div class="flex flex-col h-full justify-center p-8 animate-fade-in">
            <h2 class="text-2xl font-bold text-center mb-8">Choose your Role</h2>
            
            <div class="card mb-4 cursor-pointer hover:border-red-500 transition" data-action="select-role" data-role="donor">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-red-100 rounded-full text-red-600">
                        <i data-lucide="heart-handshake" size="32"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg">Blood Donor</h3>
                        <p class="text-sm text-gray-500">I want to donate blood and save lives.</p>
                    </div>
                </div>
            </div>

            <div class="card cursor-pointer hover:border-red-500 transition" data-action="select-role" data-role="seeker">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-blue-100 rounded-full text-blue-600">
                        <i data-lucide="search" size="32"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg">Blood Seeker</h3>
                        <p class="text-sm text-gray-500">I am looking for blood for an emergency.</p>
                    </div>
                </div>
            </div>
        </div>
    `,

    home: (user) => `
        <div class="flex flex-col h-full relative">
            <!-- Header -->
            <div class="absolute top-4 left-4 right-4 z-[999] flex justify-between items-center pointer-events-none">
                <div class="bg-white p-2 px-4 rounded-full shadow-lg pointer-events-auto flex items-center gap-2">
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 font-bold text-xs">
                        ${user.bloodGroup || 'O+'}
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Hello,</p>
                        <p class="font-bold text-sm leading-tight">${user.name}</p>
                    </div>
                </div>
                <!-- SOS Button Top Right if needed, or notification bell -->
                <button class="bg-white p-2 rounded-full shadow-lg pointer-events-auto text-gray-600">
                    <i data-lucide="bell"></i>
                </button>
            </div>

            <!-- Map Container -->
            <div id="map" class="w-full h-full z-0"></div>

            <!-- Floating Action Button for Emergency -->
            <div class="absolute bottom-24 right-4 z-[999]">
                <button class="btn btn-primary btn-pulse rounded-full w-14 h-14 p-0 shadow-lg flex items-center justify-center" data-action="raise-request" style="width: 3.5rem; height: 3.5rem; border-radius: 9999px; margin-bottom: 20px;">
                    <i data-lucide="siren" size="24"></i>
                </button>
            </div>
        </div>
    `,

    requests: (user) => {
        const requests = DataService.getRequests();
        const listHTML = requests.length ? requests.map(req => `
            <div class="card mb-4 border-l-4 border-red-500 animate-slide-in-down">
                <div class="flex justify-between items-start mb-2">
                        <div>
                        <span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">URGENT</span>
                        <h3 class="font-bold mt-1 text-lg">${req.bloodGroup} Blood Needed</h3>
                        </div>
                        <span class="text-xs text-gray-500">${new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="flex items-center gap-2 mb-2 text-gray-700">
                    <i data-lucide="map-pin" size="16"></i>
                    <span class="text-sm font-medium">${req.hospital}</span>
                </div>
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <div class="flex flex-col">
                        <span class="text-xs text-gray-500">Requested by</span>
                        <span class="font-bold text-sm">${req.seekerName}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-sm bg-gray-100 px-2 py-1 rounded">${req.units} Units</span>
                        <button class="btn btn-primary px-4 py-2 text-sm" data-action="accept-request">Donate</button>
                    </div>
                </div>
            </div>
        `).join('') : `
            <div class="text-center text-gray-500 mt-10 flex flex-col items-center">
                <div class="bg-gray-100 p-4 rounded-full mb-4"><i data-lucide="check-circle" size="32"></i></div>
                <p>No active emergency requests nearby.</p>
                <p class="text-sm mt-2">You are all caught up!</p>
            </div>
        `;

        return `
        <div class="p-6 pt-12 animate-fade-in h-full overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Active Requests</h2>
            <div id="request-list">
                ${listHTML}
            </div>
        </div>
        `;
    },

    profile: (user) => `
        <div class="p-6 pt-12 animate-fade-in">
            <div class="text-center mb-6">
                <div class="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-gray-500">
                    ${user.name.charAt(0)}
                </div>
                <h2 class="text-xl font-bold">${user.name}</h2>
                <p class="text-gray-500 capitalize">${user.role}</p>
            </div>

            <div class="card mb-4">
                <div class="flex justify-between items-center border-b pb-3 mb-3">
                    <span class="text-gray-600">Blood Group</span>
                    <span class="font-bold text-red-500">${user.bloodGroup || 'N/A'}</span>
                </div>
                <div class="flex justify-between items-center border-b pb-3 mb-3">
                    <span class="text-gray-600">Phone</span>
                    <span class="font-bold">${user.phone}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-600">Location</span>
                    <span class="text-sm text-green-600">Active</span>
                </div>
            </div>

            <button class="btn btn-outline btn-block text-red-500 border-red-500" data-action="logout">
                Logout
            </button>
        </div>
    `,

    requestModal: (user) => `
        <div class="modal-overlay" id="request-modal">
            <div class="modal-content">
                <button class="modal-close" data-action="close-modal">&times;</button>
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center text-red-500 animate-pulse">
                        <i data-lucide="siren" size="32"></i>
                    </div>
                    <h2 class="text-xl font-bold text-red-600">Emergency Request</h2>
                    <p class="text-sm text-gray-500">Alert nearby donors immediately</p>
                </div>

                <div class="input-group">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Blood Group Needed</label>
                    <select id="req-blood" class="input-field">
                        <option value="${user.bloodGroup}" selected>${user.bloodGroup} (My Group)</option>
                        <option value="A+">A+</option>
                        <option value="O+">O+</option>
                        <option value="B+">B+</option>
                        <option value="AB+">AB+</option>
                        <option value="A-">A-</option>
                        <option value="O-">O-</option>
                        <option value="B-">B-</option>
                        <option value="AB-">AB-</option>
                    </select>
                </div>

                <div class="input-group">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Hospital Name</label>
                    <input type="text" id="req-hospital" class="input-field" placeholder="e.g. City Hospital">
                </div>

                <div class="input-group">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Units Required</label>
                    <div class="flex gap-2">
                        <button class="btn btn-outline flex-1" onclick="document.getElementById('req-units').value=1">1</button>
                        <button class="btn btn-outline flex-1" onclick="document.getElementById('req-units').value=2">2</button>
                        <button class="btn btn-outline flex-1" onclick="document.getElementById('req-units').value=3">3+</button>
                        <input type="hidden" id="req-units" value="1">
                    </div>
                </div>

                <button class="btn btn-primary btn-block mt-4" data-action="submit-request">
                    BROADCAST ALERT
                </button>
            </div>
        </div>
    `
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
