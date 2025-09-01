import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCLrfwpl_7SdPHtR2cskfsSYUB00K7ew08",
  authDomain: "property-manager-ng.firebaseapp.com",
  projectId: "property-manager-ng",
  storageBucket: "property-manager-ng.firebasestorage.app",
  messagingSenderId: "959445257448",
  appId: "1:959445257448:web:ca4b4e52946bcaa8504d5d",
  measurementId: "G-6YVS9TPHFJ"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export default db
