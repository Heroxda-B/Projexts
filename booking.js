import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, query, where, onSnapshot, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const dateInput = document.getElementById('appointment-date');
const slotGrid = document.getElementById('slot-grid');
const selectedSlotInput = document.getElementById('selected-slot');
const bookingForm = document.getElementById('booking-form');
const bookingStatus = document.getElementById('booking-status');
const dateNote = document.getElementById('date-note');
const bookButton = document.getElementById('book-button');
const slots = [];
for (let minutes = 9 * 60; minutes < 18 * 60; minutes += 30) {
  if (minutes < 13 * 60 || minutes >= 14 * 60) {
    const hour = Math.floor(minutes / 60);
    slots.push(`${hour > 12 ? hour - 12 : hour}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`);
  }
}
let unsubscribe = null;
let bookedSlots = new Set();
let selectedDate = '';
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function nextWeekday() { const date = new Date(); while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1); return date; }
function status(message, type = '') { bookingStatus.textContent = message; bookingStatus.className = `status ${type}`; }
function renderSlots() {
  slotGrid.innerHTML = '';
  if (!selectedDate) { slotGrid.innerHTML = '<p class="availability-note">Choose a weekday to see available times.</p>'; return; }
  slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `slot${bookedSlots.has(slot) ? ' booked' : ''}`; button.textContent = slot; button.disabled = bookedSlots.has(slot);
    button.setAttribute('aria-label', button.disabled ? `${slot}, already booked` : `Choose ${slot}`);
    if (!button.disabled) button.addEventListener('click', () => { document.querySelectorAll('.slot.selected').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); selectedSlotInput.value = slot; status(''); });
    slotGrid.appendChild(button);
  });
}
function listenForAvailability(key) {
  if (unsubscribe) unsubscribe();
  bookedSlots = new Set(); renderSlots();
  if (!isFirebaseConfigured) { dateNote.textContent = 'Demo availability shown. Add your Firebase config to sync bookings in real time.'; return; }
  unsubscribe = onSnapshot(query(collection(db, 'bookings'), where('dateKey', '==', key)), (snapshot) => { bookedSlots = new Set(snapshot.docs.map((item) => item.data().slot)); renderSlots(); dateNote.textContent = 'Availability updates live as appointments are booked.'; }, () => status('We could not load live availability. Please try again.', 'error'));
}
function updateDate() {
  selectedDate = dateInput.value; selectedSlotInput.value = '';
  if (!selectedDate) { renderSlots(); return; }
  const chosenDate = new Date(`${selectedDate}T12:00:00`);
  if (chosenDate.getDay() === 0 || chosenDate.getDay() === 6) { dateNote.textContent = 'Please choose a weekday. The clinic is closed on weekends.'; selectedDate = ''; dateInput.value = ''; renderSlots(); return; }
  listenForAvailability(selectedDate);
}
dateInput.min = dateKey(new Date()); dateInput.value = dateKey(nextWeekday()); dateInput.addEventListener('change', updateDate); updateDate();
bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedDate || !selectedSlotInput.value) { status('Choose a date and available time first.', 'error'); return; }
  if (!isFirebaseConfigured) { status('Add your Firebase project config in firebase-config.js before accepting bookings.', 'error'); return; }
  bookButton.disabled = true; status('Checking availability...');
  const slot = selectedSlotInput.value;
  const bookingRef = doc(db, 'bookings', `${selectedDate}_${slot.replace(/[^a-z0-9]/gi, '')}`);
  try {
    await runTransaction(db, async (transaction) => {
      if ((await transaction.get(bookingRef)).exists()) throw new Error('SLOT_TAKEN');
      transaction.set(bookingRef, { dateKey: selectedDate, slot, name: document.getElementById('patient-name').value.trim(), phone: document.getElementById('patient-phone').value.trim(), reason: document.getElementById('visit-reason').value.trim(), createdAt: new Date().toISOString() });
    });
    status('Your appointment is booked. I look forward to meeting you.', 'success'); bookingForm.reset(); dateInput.value = selectedDate; selectedSlotInput.value = ''; listenForAvailability(selectedDate);
  } catch (error) { status(error.message === 'SLOT_TAKEN' ? 'That time was just booked by someone else. Please choose another.' : 'We could not complete the booking. Please try again.', 'error'); if (error.message === 'SLOT_TAKEN') listenForAvailability(selectedDate); } finally { bookButton.disabled = false; }
});
