import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import { db, initFirebase } from './client';
import { Journal, Message, PersonaId, HabitItem } from '../types/journal';

function getActiveDb(): Firestore | null {
  if (db) return db;
  const res = initFirebase();
  return res.db;
}

function isDemoUser(userId: string): boolean {
  return !userId || userId === 'demo-user-local' || userId.startsWith('demo-') || userId.startsWith('local-');
}

const LOCAL_STORAGE_KEY_JOURNALS = 'gemini_journal_demo_journals';
const LOCAL_STORAGE_KEY_MESSAGES_PREFIX = 'gemini_journal_demo_messages_';
const LOCAL_STORAGE_KEY_HABITS = 'gemini_journal_demo_habits';

const DEFAULT_SEED_HABITS: Omit<HabitItem, 'id' | 'userId'>[] = [
  {
    title: 'Morning 5-minute mindful reflection & breathwork',
    category: 'mindfulness',
    completed: true,
    streakDays: 4,
    lastCompletedDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now(),
  },
  {
    title: 'Review stoic evening dichotomy of control journal',
    category: 'growth',
    completed: false,
    streakDays: 2,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
  },
  {
    title: 'Drink 500ml water and stretch before deep work sprint',
    category: 'wellness',
    completed: true,
    streakDays: 7,
    lastCompletedDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now(),
  },
  {
    title: 'Log 3 gratitude moments and daily wins with Gemini Muse',
    category: 'productivity',
    completed: false,
    streakDays: 1,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
];

// Local storage fallback helpers for demo/offline mode
function getLocalJournals(): Journal[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_JOURNALS);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalJournals(journals: Journal[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY_JOURNALS, JSON.stringify(journals));
}

function getLocalHabits(userId: string): HabitItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_HABITS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  // Initialize with seed habits if empty
  const initialHabits: HabitItem[] = DEFAULT_SEED_HABITS.map((h, i) => ({
    ...h,
    id: `habit-seed-${i + 1}`,
    userId,
  }));
  localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(initialHabits));
  return initialHabits;
}

function saveLocalHabits(habits: HabitItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(habits));
}

function getLocalMessages(journalId: string): Message[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY_MESSAGES_PREFIX}${journalId}`);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalMessages(journalId: string, messages: Message[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${LOCAL_STORAGE_KEY_MESSAGES_PREFIX}${journalId}`, JSON.stringify(messages));
}

/**
 * Subscribes to journals belonging to a specific user.
 * Path: /users/{uid}/journals
 */
export function subscribeToJournals(
  userId: string,
  onUpdate: (journals: Journal[]) => void,
  onError?: (err: Error) => void
): () => void {
  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const local = getLocalJournals();
    onUpdate(local);
    // Return dummy unsubscribe
    return () => {};
  }

  const journalsRef = collection(activeDb, 'users', userId, 'journals');
  const q = query(journalsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const journals: Journal[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Journal, 'id'>),
      }));
      onUpdate(journals);
    },
    (err) => {
      console.error('[Firestore] subscribeToJournals error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Creates a new journal for the user.
 */
export async function createJournal(
  userId: string,
  data: {
    title: string;
    personaId: PersonaId;
    initialMessage?: string;
  }
): Promise<Journal> {
  const now = Date.now();
  const journalData: Omit<Journal, 'id'> = {
    userId,
    title: data.title || 'Untitled Reflection',
    personaId: data.personaId || 'mindful-guide',
    createdAt: now,
    updatedAt: now,
    previewText: data.initialMessage ? data.initialMessage.slice(0, 100) : '',
    messageCount: data.initialMessage ? 1 : 0,
    tags: [],
    isFavorite: false,
  };

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const newId = 'local-' + Math.random().toString(36).substring(2, 9);
    const newJournal: Journal = { id: newId, ...journalData };
    const list = getLocalJournals();
    saveLocalJournals([newJournal, ...list]);

    if (data.initialMessage) {
      const msg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        role: 'user',
        content: data.initialMessage,
        timestamp: now,
      };
      saveLocalMessages(newId, [msg]);
    }

    return newJournal;
  }

  const journalsRef = collection(activeDb, 'users', userId, 'journals');
  const docRef = await addDoc(journalsRef, journalData);

  if (data.initialMessage) {
    const messagesRef = collection(activeDb, 'users', userId, 'journals', docRef.id, 'messages');
    await addDoc(messagesRef, {
      role: 'user',
      content: data.initialMessage,
      timestamp: now,
    });
  }

  return {
    id: docRef.id,
    ...journalData,
  };
}

/**
 * Updates a journal entry.
 */
export async function updateJournal(
  userId: string,
  journalId: string,
  data: Partial<Journal>
): Promise<void> {
  const updatePayload = {
    ...data,
    updatedAt: Date.now(),
  };

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const list = getLocalJournals();
    const updated = list.map((j) => (j.id === journalId ? { ...j, ...updatePayload } : j));
    saveLocalJournals(updated);
    return;
  }

  const journalDoc = doc(activeDb, 'users', userId, 'journals', journalId);
  await updateDoc(journalDoc, updatePayload);
}

/**
 * Deletes a journal and all its subcollection messages.
 */
export async function deleteJournal(userId: string, journalId: string): Promise<void> {
  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const list = getLocalJournals().filter((j) => j.id !== journalId);
    saveLocalJournals(list);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_MESSAGES_PREFIX}${journalId}`);
    }
    return;
  }

  const journalDoc = doc(activeDb, 'users', userId, 'journals', journalId);
  const messagesRef = collection(activeDb, 'users', userId, 'journals', journalId, 'messages');

  // Delete all nested messages first
  const messagesSnapshot = await getDocs(messagesRef);
  const batch = writeBatch(activeDb);
  messagesSnapshot.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });
  batch.delete(journalDoc);

  await batch.commit();
}


/**
 * Clears user data based on time scope: 'past-week', 'past-month', or 'all'.
 */
export async function clearUserDataByScope(
  userId: string,
  scope: 'past-week' | 'past-month' | 'all'
): Promise<void> {
  const now = Date.now();
  const cutoffTimestamp =
    scope === 'past-week'
      ? now - 7 * 24 * 60 * 60 * 1000
      : scope === 'past-month'
      ? now - 30 * 24 * 60 * 60 * 1000
      : 0;

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    if (typeof window !== 'undefined') {
      const journals = getLocalJournals();
      const keptJournals: Journal[] = [];
      journals.forEach((j) => {
        const time = j.createdAt || j.updatedAt;
        if (scope !== 'all' && time < cutoffTimestamp) {
          keptJournals.push(j);
        } else {
          localStorage.removeItem(`${LOCAL_STORAGE_KEY_MESSAGES_PREFIX}${j.id}`);
        }
      });
      saveLocalJournals(keptJournals);

      if (scope === 'all') {
        localStorage.removeItem(LOCAL_STORAGE_KEY_HABITS);
      }
      localStorage.setItem('has_dismissed_welcome_seed', 'true');
    }
    return;
  }

  try {
    const journalsRef = collection(activeDb, 'users', userId, 'journals');
    const journalsSnap = await getDocs(journalsRef);

    for (const jDoc of journalsSnap.docs) {
      const data = jDoc.data();
      const time = data.createdAt || data.updatedAt || 0;

      if (scope === 'all' || time >= cutoffTimestamp) {
        const messagesRef = collection(activeDb, 'users', userId, 'journals', jDoc.id, 'messages');
        const messagesSnap = await getDocs(messagesRef);
        const batch = writeBatch(activeDb);
        messagesSnap.forEach((m) => batch.delete(m.ref));
        batch.delete(jDoc.ref);
        await batch.commit();
      }
    }

    if (scope === 'all') {
      const habitsRef = collection(activeDb, 'users', userId, 'habits');
      const habitsSnap = await getDocs(habitsRef);
      if (!habitsSnap.empty) {
        const habitBatch = writeBatch(activeDb);
        habitsSnap.forEach((h) => habitBatch.delete(h.ref));
        await habitBatch.commit();
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('has_dismissed_welcome_seed', 'true');
    }
  } catch (err) {
    console.error('[Firestore] Failed to clear user data by scope:', err);
    throw err;
  }
}

export async function clearAllUserData(userId: string): Promise<void> {
  return clearUserDataByScope(userId, 'all');
}

/**
 * Subscribes to messages within a specific journal entry.
 * Path: /users/{uid}/journals/{journalId}/messages
 */
export function subscribeToMessages(
  userId: string,
  journalId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: Error) => void
): () => void {
  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const local = getLocalMessages(journalId);
    onUpdate(local);
    return () => {};
  }

  const messagesRef = collection(activeDb, 'users', userId, 'journals', journalId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Message, 'id'>),
      }));
      onUpdate(messages);
    },
    (err) => {
      console.error('[Firestore] subscribeToMessages error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Appends a message to a journal entry.
 */
export async function addJournalMessage(
  userId: string,
  journalId: string,
  message: Omit<Message, 'id'>
): Promise<Message> {
  const timestamp = message.timestamp || Date.now();
  const payload = {
    ...message,
    timestamp,
  };

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const msgId = 'msg-' + Math.random().toString(36).substring(2, 9);
    const newMsg: Message = { id: msgId, ...payload };
    const list = getLocalMessages(journalId);
    const updatedMessages = [...list, newMsg];
    saveLocalMessages(journalId, updatedMessages);

    // Update journal preview & message count
    const journals = getLocalJournals();
    const updatedJournals = journals.map((j) => {
      if (j.id === journalId) {
        return {
          ...j,
          updatedAt: timestamp,
          messageCount: updatedMessages.length,
          previewText: message.content.slice(0, 100),
        };
      }
      return j;
    });
    saveLocalJournals(updatedJournals);

    return newMsg;
  }

  const messagesRef = collection(activeDb, 'users', userId, 'journals', journalId, 'messages');
  const docRef = await addDoc(messagesRef, payload);

  // Update parent journal
  const journalDoc = doc(activeDb, 'users', userId, 'journals', journalId);
  const snap = await getDoc(journalDoc);
  if (snap.exists()) {
    const curCount = snap.data().messageCount || 0;
    await updateDoc(journalDoc, {
      updatedAt: timestamp,
      messageCount: curCount + 1,
      previewText: message.content.slice(0, 100),
    });
  }

  return {
    id: docRef.id,
    ...payload,
  };
}


/**
 * Subscribes to user habits.
 * Path: /users/{uid}/habits
 */
export function subscribeToHabits(
  userId: string,
  onUpdate: (habits: HabitItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const local = getLocalHabits(userId);
    onUpdate(local);
    return () => {};
  }

  const habitsRef = collection(activeDb, 'users', userId, 'habits');
  const q = query(habitsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback to local or seed if first time in cloud
        const local = getLocalHabits(userId);
        if (local.length > 0) {
          onUpdate(local);
          return;
        }
      }
      const habits: HabitItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<HabitItem, 'id'>),
      }));
      onUpdate(habits);
    },
    (err) => {
      console.warn('[Firestore] subscribeToHabits falling back to local:', err);
      // Fallback to local on permission or offline
      const local = getLocalHabits(userId);
      onUpdate(local);
      if (onError) onError(err);
    }
  );
}

/**
 * Creates a new habit for user.
 */
export async function createHabit(
  userId: string,
  data: {
    title: string;
    category?: HabitItem['category'];
    sourceJournalId?: string;
    sourceJournalTitle?: string;
    completed?: boolean;
  }
): Promise<HabitItem> {
  const now = Date.now();
  const habitData: Omit<HabitItem, 'id'> = {
    userId,
    title: data.title.trim(),
    category: data.category || 'growth',
    sourceJournalId: data.sourceJournalId || '',
    sourceJournalTitle: data.sourceJournalTitle || '',
    completed: !!data.completed,
    streakDays: data.completed ? 1 : 0,
    lastCompletedDate: data.completed ? new Date().toISOString().split('T')[0] : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    const newId = 'habit-' + Math.random().toString(36).substring(2, 9);
    const newHabit: HabitItem = { id: newId, ...habitData };
    const list = getLocalHabits(userId);
    saveLocalHabits([newHabit, ...list]);
    return newHabit;
  }

  try {
    const habitsRef = collection(activeDb, 'users', userId, 'habits');
    const docRef = await addDoc(habitsRef, habitData);
    return {
      id: docRef.id,
      ...habitData,
    };
  } catch (err) {
    console.warn('[Firestore] createHabit error, saving locally:', err);
    const newId = 'habit-local-' + Math.random().toString(36).substring(2, 9);
    const newHabit: HabitItem = { id: newId, ...habitData };
    const list = getLocalHabits(userId);
    saveLocalHabits([newHabit, ...list]);
    return newHabit;
  }
}

/**
 * Updates a habit.
 */
export async function updateHabit(
  userId: string,
  habitId: string,
  data: Partial<HabitItem>
): Promise<void> {
  const updatePayload = {
    ...data,
    updatedAt: Date.now(),
  };

  const localList = getLocalHabits(userId);
  const exists = localList.some((h) => h.id === habitId);
  const updatedLocal = exists
    ? localList.map((h) => (h.id === habitId ? { ...h, ...updatePayload } : h))
    : [{ id: habitId, userId, ...updatePayload } as HabitItem, ...localList];
  saveLocalHabits(updatedLocal);

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    return;
  }

  try {
    const habitDoc = doc(activeDb, 'users', userId, 'habits', habitId);
    await updateDoc(habitDoc, updatePayload);
  } catch (err) {
    console.warn('[Firestore] updateHabit error, updated locally only:', err);
  }
}

/**
 * Deletes a habit.
 */
export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const localList = getLocalHabits(userId).filter((h) => h.id !== habitId);
  saveLocalHabits(localList);

  const activeDb = getActiveDb();
  if (!activeDb || isDemoUser(userId)) {
    return;
  }

  try {
    const habitDoc = doc(activeDb, 'users', userId, 'habits', habitId);
    await deleteDoc(habitDoc);
  } catch (err) {
    console.warn('[Firestore] deleteHabit error:', err);
  }
}


/**
 * Toggles habit completion status and updates streak.
 */
export async function toggleHabitCompletion(
  userId: string,
  habitId: string,
  fallbackTarget?: HabitItem
): Promise<HabitItem | undefined> {
  const list = getLocalHabits(userId);
  const target = list.find((h) => h.id === habitId) || fallbackTarget;
  if (!target) return undefined;

  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const willBeCompleted = !target.completed;

  let newStreak = target.streakDays || 0;
  if (willBeCompleted) {
    if (target.lastCompletedDate !== today) {
      newStreak += 1;
    }
  } else {
    newStreak = Math.max(0, newStreak - 1);
  }

  const updated: HabitItem = {
    ...target,
    completed: willBeCompleted,
    streakDays: newStreak,
    lastCompletedDate: willBeCompleted ? today : target.lastCompletedDate,
    updatedAt: now,
  };

  await updateHabit(userId, habitId, updated);
  return updated;
}
