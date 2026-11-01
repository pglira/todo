export interface Task {
  id: string;
  text: string;
  // Time in milliseconds since the epoch when the task was marked as done, or
  // null for an open task.
  doneAt: number | null;
}

const STORAGE_KEY = 'todo.v1';

// The id of the app in backup files.
export const APP_ID = 'todo';

// The storage keys that a backup holds: all keys of the app except the theme.
export const isDataKey = (key: string) => key.startsWith('todo.') && key !== 'todo.theme';

// All tasks in the order of creation, oldest first.
export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage is full or blocked; the tasks stay in memory only.
  }
}

// The open tasks, oldest first.
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.doneAt === null);
}

// The done tasks, most recently done first.
export function doneTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.doneAt !== null).sort((a, b) => b.doneAt! - a.doneAt!);
}

export function addTask(tasks: Task[], text: string): Task[] {
  return [...tasks, { id: crypto.randomUUID(), text, doneAt: null }];
}

export function updateTask(tasks: Task[], id: string, text: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, text } : t));
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, doneAt: t.doneAt === null ? Date.now() : null } : t));
}

export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id);
}

export function clearDone(tasks: Task[]): Task[] {
  return openTasks(tasks);
}
