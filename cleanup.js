const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBPtU0YcR9-zMOQ5arD0rfFqWGqvSC0rDs",
  authDomain: "property-tracker-ng-df7fe.firebaseapp.com",
  projectId: "property-tracker-ng-df7fe",
  storageBucket: "property-tracker-ng-df7fe.firebasestorage.app",
  messagingSenderId: "390598613101",
  appId: "1:390598613101:web:9fb3f2c4c46f88e4f72c31"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
  // Delete ALL projects
  const projects = await getDocs(collection(db, 'projects'));
  for (const doc of projects.docs) {
    await deleteDoc(doc.ref);
    console.log('Deleted:', doc.data().name);
  }
  console.log('Cleanup complete! Refresh the page to get fresh projects.');
}

cleanup();
