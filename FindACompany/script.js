document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded');

    const signupBtn = document.getElementById('mainsignup');

    const firebaseConfig = {
        apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
        authDomain: "zharim-5eb40.firebaseapp.com",
        projectId: "zharim-5eb40",
        storageBucket: "zharim-5eb40.firebasestorage.app",
        messagingSenderId: "205812595210",
        appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
    };

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized');
        }

        const db = firebase.firestore();

        
        const userId = localStorage.getItem('userId');
        console.log('User logged in:', !!userId);

        if (userId) {
            try {
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();

                if (doc.exists) {
                    const userData = doc.data();
                    updateProfileButton(userData);
                } else {
                    console.warn('User document not found');
                    resetSignupButton();
                }
            } catch (error) {
                console.error('Firestore error:', error);
                resetSignupButton();
            }
        } else {
            console.log('No userId in localStorage');
            resetSignupButton();
        }

        function updateProfileButton(userData) {
            const profileImg = document.createElement('img');
            profileImg.alt = 'Profile Picture';
            profileImg.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                cursor: pointer;
                border: 2px solid #fff;
                background-color: #f0f0f0;
            `;

            const profilePicture = userData.profilePicture || 
                'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            profileImg.src = `${profilePicture}?${Date.now()}`;

            signupBtn.innerHTML = '';
            signupBtn.appendChild(profileImg);
            signupBtn.href = 'profile.html';
        }

        function resetSignupButton() {
            signupBtn.innerHTML = '<button>Sign up</button>';
            signupBtn.href = 'signup.html';
        }

    } catch (error) {
        console.error('Firebase initialization failed:', error);
        resetSignupButton();
    }
});
