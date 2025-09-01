import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDvIpDJf8QaYe-V0vE7S1GLT8tJSxUCIh4",
  authDomain: "property-manager-ng.firebaseapp.com",
  projectId: "property-manager-ng",
  storageBucket: "property-manager-ng.appspot.com",
  messagingSenderId: "1018285433569",
  appId: "1:1018285433569:web:5c4c8f7b9e8f3d2a4b5c6d"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
