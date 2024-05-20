// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1-dypgliqHs2NOIcOkN6cYdkJuhBLGbo",
  authDomain: "doctors-portal-146ab.firebaseapp.com",
  projectId: "doctors-portal-146ab",
  storageBucket: "doctors-portal-146ab.appspot.com",
  messagingSenderId: "267427590185",
  appId: "1:267427590185:web:85befc8a8bb9f8db4e2c38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export default auth;