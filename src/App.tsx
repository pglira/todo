import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';
import {
  type Task,
  addTask,
  clearDone,
  doneTasks,
  loadTasks,
  openTasks,
  removeTask,
  saveTasks,
  toggleTask,
  updateTask,
} from './tasks';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The open sheet: a task form, with id null for a new task.
type Sheet = { id: string | null } | null;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the task whose row shows the swipe actions.
  const [swiped, setSwiped] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveTasks(tasks), [tasks]);

  const open = openTasks(tasks);
  const done = doneTasks(tasks);
  const close = () => setSheet(null);
  const sheetTask = sheet?.id ? tasks.find((t) => t.id === sheet.id) : undefined;

  const row = (task: Task) => (
    <SwipeRow
      key={task.id}
      className={task.doneAt === null ? 'task' : 'task done'}
      open={swiped === task.id}
      onOpen={() => setSwiped(task.id)}
      onClose={() => setSwiped(null)}
      onEdit={() => {
        setSwiped(null);
        setSheet({ id: task.id });
      }}
      onDelete={() => {
        setSwiped(null);
        setTasks((t) => removeTask(t, task.id));
      }}
    >
      <button
        className="toggle"
        role="checkbox"
        aria-checked={task.doneAt !== null}
        onClick={() => setTasks((t) => toggleTask(t, task.id))}
      >
        <span className="box">{task.doneAt !== null && <Icon name="check" size={18} />}</span>
        <span className="text">{task.text}</span>
      </button>
    </SwipeRow>
  );

  return (
    <main>
      <header>
        <h1>Todo</h1>
        <div className="header-buttons">
          <button
            className="icon"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            <Icon name={THEME_ICONS[theme]} />
          </button>
          <button className="add" onClick={() => setSheet({ id: null })} aria-label="Add task" title="Add task">
            <Icon name="plus" size={24} />
          </button>
        </div>
      </header>

      {tasks.length === 0 ? (
        <p className="empty">No tasks. Tap + to add a task.</p>
      ) : (
        <div className="toolbar">
          <span>{open.length === 1 ? '1 open task' : `${open.length} open tasks`}</span>
        </div>
      )}

      {tasks.length > 0 && open.length === 0 && <p className="empty">All tasks are done.</p>}
      <ul>{open.map(row)}</ul>

      {done.length > 0 && (
        <>
          <div className="section">
            <h2>Done ({done.length})</h2>
            <ClearButton onConfirm={() => setTasks(clearDone)} />
          </div>
          <ul>{done.map(row)}</ul>
        </>
      )}

      {sheet && (
        <TaskForm
          key={sheet.id ?? 'new'}
          text={sheetTask?.text ?? ''}
          onCancel={close}
          onSave={(text) => {
            setTasks((t) => (sheetTask ? updateTask(t, sheetTask.id, text) : addTask(t, text)));
            close();
          }}
          onDelete={
            sheetTask
              ? () => {
                  setTasks((t) => removeTask(t, sheetTask.id));
                  close();
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

// Width of the swipe actions in pixels, and the distance a pointer must move
// before a row starts to follow it.
const SWIPE_WIDTH = 160;
const SWIPE_SLOP = 10;

interface SwipeRowProps {
  className: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}

// A list row that shows the Edit and Delete actions when the user swipes it
// to the left. Delete asks for a second tap. A swipe to the right, a tap on
// the row or a tap outside the row hides the actions. A tap that ends a swipe
// does not reach the row content.
function SwipeRow({ className, open, onOpen, onClose, onEdit, onDelete, children }: SwipeRowProps) {
  const row = useRef<HTMLLIElement>(null);
  const gesture = useRef<{ x: number; y: number; swiping: boolean } | null>(null);
  const swiped = useRef(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const base = open ? -SWIPE_WIDTH : 0;
  const offset = drag ?? base;

  useEffect(() => {
    if (!open) {
      setArmed(false);
      return;
    }
    const onDown = (e: globalThis.PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose]);

  const position = (e: PointerEvent) => Math.min(0, Math.max(-SWIPE_WIDTH, base + e.clientX - gesture.current!.x));

  const onPointerDown = (e: PointerEvent) => {
    gesture.current = { x: e.clientX, y: e.clientY, swiping: false };
    swiped.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.swiping) {
      const dx = Math.abs(e.clientX - g.x);
      const dy = Math.abs(e.clientY - g.y);
      if (dy > SWIPE_SLOP && dy > dx) gesture.current = null;
      if (dx <= SWIPE_SLOP || dx <= dy) return;
      g.swiping = true;
      swiped.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(position(e));
  };

  const onPointerUp = (e: PointerEvent) => {
    if (gesture.current?.swiping) {
      if (position(e) < -SWIPE_WIDTH / 2) onOpen();
      else onClose();
    }
    gesture.current = null;
    setDrag(null);
  };

  return (
    <li ref={row} className="swipe">
      <div className="swipe-actions" style={{ width: SWIPE_WIDTH }} aria-hidden={!open}>
        <button className="swipe-edit" tabIndex={open ? 0 : -1} onClick={onEdit}>
          <Icon name="edit" />
          Edit
        </button>
        <button
          className="swipe-delete"
          tabIndex={open ? 0 : -1}
          onClick={() => (armed ? onDelete() : setArmed(true))}
        >
          <Icon name="trash" />
          {armed ? 'Confirm' : 'Delete'}
        </button>
      </div>
      <div
        className={drag === null ? `${className} settle` : className}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (!swiped.current && !open) return;
          e.preventDefault();
          e.stopPropagation();
          if (!swiped.current) onClose();
          swiped.current = false;
        }}
      >
        {children}
      </div>
    </li>
  );
}

const CONFIRM_MS = 3000;

// Remove all done tasks after a second tap. The button returns to its first
// state when the second tap does not come within CONFIRM_MS.
function ClearButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      className={armed ? 'clear armed' : 'clear'}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      <Icon name="trash" size={18} />
      {armed ? 'Tap to confirm' : 'Clear'}
    </button>
  );
}

interface TaskFormProps {
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function TaskForm(props: TaskFormProps) {
  const [text, setText] = useState(props.text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const value = text.trim();

  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (value) props.onSave(value);
        }}
      >
        <h2>{props.onDelete ? 'Edit task' : 'New task'}</h2>
        <label>
          Task
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && props.onCancel()}
            placeholder="For example: buy milk"
            enterKeyHint="done"
          />
        </label>
        <div className="buttons">
          {props.onDelete && (
            <button
              type="button"
              className="delete"
              onClick={() => (confirmDelete ? props.onDelete?.() : setConfirmDelete(true))}
            >
              {confirmDelete ? 'Tap to delete' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={props.onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!value}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
