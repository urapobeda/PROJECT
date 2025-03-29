const firebaseConfig = {
    apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
    authDomain: "zharim-5eb40.firebaseapp.com",
    projectId: "zharim-5eb40",
    storageBucket: "zharim-5eb40.firebasestorage.app",
    messagingSenderId: "205812595210",
    appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.color = 'red';
    }
    console.error(message);
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('form');

    if (signupForm && window.location.pathname.includes('signup.html')) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email-input').value.trim();
            const password = document.getElementById('password-input').value.trim();
            const repeatPassword = document.getElementById('repeat-password-input').value.trim();
            const name = document.getElementById('firstname-input').value.trim();

            showError('');

            try {
                if (!name || !email || !password || !repeatPassword) {
                    throw new Error('All fields are required');
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    throw new Error('Invalid email format');
                }

                if (password !== repeatPassword) {
                    throw new Error('Passwords do not match');
                }

                if (password.length < 8) {
                    throw new Error('Password must be at least 8 characters long');
                }

                const usersRef = db.collection('users');
                const snapshot = await usersRef.where('email', '==', email).get();

                if (!snapshot.empty) {
                    throw new Error('Email already registered');
                }

                const docRef = await usersRef.add({
                    name,
                    email,
                    password,
                    gender: '',
                    age: '',
                    participatedEvents: [],
                    friends: [],
                    admin: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log('Document written with ID:', docRef.id);
                alert('Registration successful! Redirecting to login...');
                window.location.href = 'login.html';
            } catch (error) {
                showError(error.message);
                console.error('Firestore error:', error);
            }
        });
    }

    if (window.location.pathname.includes('login.html')) {
        const loginForm = document.getElementById('form');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('email-input').value.trim();
                const password = document.getElementById('password-input').value.trim();

                showError('');

                try {
                    if (!email || !password) {
                        throw new Error('All fields are required');
                    }

                    const usersRef = db.collection('users');
                    const snapshot = await usersRef.where('email', '==', email).get();

                    if (snapshot.empty) {
                        throw new Error('Invalid email or password');
                    }

                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();

                    if (userData.password !== password) {
                        throw new Error('Invalid email or password');
                    }

                    localStorage.setItem('userId', userDoc.id);
                    localStorage.setItem('isAdmin', userData.admin ? 'true' : 'false');

                    alert('Login successful!');
                    window.location.href = 'index.html';
                } catch (error) {
                    showError(error.message);
                    console.error('Login error:', error);
                }
            });
        }
    }
});
