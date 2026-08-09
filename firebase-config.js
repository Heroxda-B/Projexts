// Paste the Firebase Web App config object here.
export const firebaseConfig = {
  apiKey: 'AIzaSyDQgFReyPefLWl8eS7defempElPMh0u9-w',
  authDomain: 'physiotherapisty-6867f.firebaseapp.com',
  projectId: 'physiotherapisty-6867f',
  storageBucket: 'physiotherapisty-6867f.firebasestorage.app',
  messagingSenderId: '224642607555',
  appId: '1:224642607555:web:789b85fc9e86091683f576'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) => value.includes('YOUR_'));
