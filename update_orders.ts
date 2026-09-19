import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function updateOrderDates() {
  const orderIds = ['order_1787644860652_b0pjmwa3l', 'order_1787644860653_dummy']; // I need the second ID
  const newDate = '2026-08-26';

  for (const id of orderIds) {
    const orderRef = doc(db, 'orders', id);
    await updateDoc(orderRef, { date: newDate });
    console.log(`Updated order ${id} to date ${newDate}`);
  }
}

updateOrderDates().catch(console.error);
