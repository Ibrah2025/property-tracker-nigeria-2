import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyC_MBvDlGBQVhWwWda0lJNHsms5YQ2bJf8",
  authDomain: "property-tracker-fd245.firebaseapp.com",
  projectId: "property-tracker-fd245",
  storageBucket: "property-tracker-fd245.firebasestorage.app",
  messagingSenderId: "804921866782",
  appId: "1:804921866782:web:fcbbd79d65da55b10a9e65"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
