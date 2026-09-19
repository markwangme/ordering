import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function revertTo26() {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('date', '==', '2026-08-25'));
  const querySnapshot = await getDocs(q);
  
  const targetIds: string[] = [];
  querySnapshot.forEach((doc) => {
    targetIds.push(doc.id);
  });
  
  console.log(`Found ${targetIds.length} orders for 2026-08-25 to move to 2026-08-26`);
  
  const newDate = '2026-08-26';
  for (const id of targetIds) {
    const orderRef = doc(db, 'orders', id);
    await updateDoc(orderRef, { date: newDate });
    console.log(`Updated order ${id} to date ${newDate}`);
  }
}

revertTo26().catch(console.error);
