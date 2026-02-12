/* Data Service - Mocking Backend via LocalStorage */

const DataService = {
    init() {
        if (!localStorage.getItem('lifeline_users')) {
            localStorage.setItem('lifeline_users', JSON.stringify([]));
        }
        if (!localStorage.getItem('lifeline_requests')) {
            localStorage.setItem('lifeline_requests', JSON.stringify([]));
        }
    },

    // User Management
    registerUser(userData) {
        const users = JSON.parse(localStorage.getItem('lifeline_users'));
        if (users.find(u => u.phone === userData.phone)) {
            throw new Error('User already exists with this phone number.');
        }
        const newUser = { ...userData, id: Date.now().toString(), createdAt: new Date().toISOString() };
        users.push(newUser);
        localStorage.setItem('lifeline_users', JSON.stringify(users));
        this.setCurrentUser(newUser);
        return newUser;
    },

    loginUser(phone, otp) {
        // Mock OTP check: Any 4 digit OTP works for demo, or match specific logic
        if (otp.length !== 4) throw new Error('Invalid OTP');

        const users = JSON.parse(localStorage.getItem('lifeline_users'));
        const user = users.find(u => u.phone === phone);

        if (user) {
            this.setCurrentUser(user);
            return user;
        } else {
            throw new Error('User not found. Please register.');
        }
    },

    getCurrentUser() {
        const user = localStorage.getItem('lifeline_current_user');
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser(user) {
        localStorage.setItem('lifeline_current_user', JSON.stringify(user));
    },

    updateUser(updates) {
        let user = this.getCurrentUser();
        if (!user) return;
        user = { ...user, ...updates };

        // Update in main DB
        const users = JSON.parse(localStorage.getItem('lifeline_users'));
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            localStorage.setItem('lifeline_users', JSON.stringify(users));
            this.setCurrentUser(user);
        }
    },

    logout() {
        localStorage.removeItem('lifeline_current_user');
    },

    // Request Management
    createRequest(requestData) {
        const requests = JSON.parse(localStorage.getItem('lifeline_requests'));
        const newRequest = {
            ...requestData,
            id: 'REQ-' + Date.now(),
            status: 'PENDING', // PENDING, ACCEPTED, COMPLETED
            timestamp: new Date().toISOString()
        };
        requests.push(newRequest);
        localStorage.setItem('lifeline_requests', JSON.stringify(requests));
        return newRequest;
    },

    getRequests() {
        return JSON.parse(localStorage.getItem('lifeline_requests')).reverse(); // Newest first
    },

    updateRequestStatus(requestId, status, donorId = null) {
        const requests = JSON.parse(localStorage.getItem('lifeline_requests'));
        const index = requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
            requests[index].status = status;
            if (donorId) requests[index].donorId = donorId;
            localStorage.setItem('lifeline_requests', JSON.stringify(requests));
            return requests[index];
        }
        return null;
    }
};

DataService.init();
