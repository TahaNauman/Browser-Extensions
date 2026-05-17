
let tasks         = [];
let hideCompleted = false;

let dragSrcId = null;

const taskInput     = document.getElementById('task-input');
const addBtn        = document.getElementById('add-btn');
const taskList      = document.getElementById('task-list');
const emptyMsg      = document.getElementById('empty-msg');
const progressText  = document.getElementById('progress-text');
const progressBar   = document.getElementById('progress-bar');
const toggleHideBtn = document.getElementById('toggle-hide-btn');
const currentDateEl = document.getElementById('current-date');

setDate();
loadTasks();

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
toggleHideBtn.addEventListener('click', () => {
  hideCompleted = !hideCompleted;
  toggleHideBtn.textContent = hideCompleted ? 'Show completed' : 'Hide completed';
  saveTasks();
  renderTasks();
});

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    taskInput.focus();
    taskInput.select();
  }
});

function setDate() {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString('en-US', opts).toUpperCase();
}

function loadTasks() {
  chrome.storage.local.get(['qt_tasks', 'qt_hide'], (result) => {
    tasks         = result.qt_tasks || [];
    hideCompleted = result.qt_hide  || false;
    toggleHideBtn.textContent = hideCompleted ? 'Show completed' : 'Hide completed';
    renderTasks();
  });
}

function saveTasks() {
  chrome.storage.local.set({ qt_tasks: tasks, qt_hide: hideCompleted });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) { taskInput.focus(); return; }
  tasks.push({ id: Date.now().toString(), text, completed: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function startEdit(id, labelEl, li) {
  const task = tasks.find(t => t.id === id);
  if (!task || task.completed) return;

  li.draggable = false;
  li.classList.add('editing');

  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'edit-input';
  input.value     = task.text;
  labelEl.replaceWith(input);
  input.focus();
  input.select();

  function commitEdit() {
    const newText = input.value.trim();
    if (newText && newText !== task.text) {
      task.text = newText;
      saveTasks();
    }
    renderTasks(); 
  }

  function cancelEdit() {
    renderTasks(); 
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });

  input.addEventListener('blur', function() {
    // small timeout so Escape key fires before blur
    setTimeout(commitEdit, 100);
  });
}

function getTask(id)  { return tasks.find(t => t.id === id); }
function getLi(id)    { return taskList.querySelector(`[data-id="${id}"]`); }
function clearStates() {
  taskList.querySelectorAll('.drag-over, .drag-blocked').forEach(el => {
    el.classList.remove('drag-over', 'drag-blocked');
  });
}

function isCrossGroup(srcId, targetId) {
  const src    = getTask(srcId);
  const target = getTask(targetId);
  if (!src || !target) return false;
  return src.completed && !target.completed;
}

function onDragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  setTimeout(() => {
    const el = getLi(id);
    if (el) el.classList.add('dragging');
  }, 0);
}

function onDragEnd(id) {
  dragSrcId = null;
  const el = getLi(id);
  if (el) el.classList.remove('dragging');
  clearStates();
}

function onDragOver(e, id) {
  e.preventDefault();
  if (id === dragSrcId) return;
  clearStates();
  if (isCrossGroup(dragSrcId, id)) {
    e.dataTransfer.dropEffect = 'none';
    const el = getLi(id);
    if (el) el.classList.add('drag-blocked');
  } else {
    e.dataTransfer.dropEffect = 'move';
    const el = getLi(id);
    if (el) el.classList.add('drag-over');
  }
}

function onDrop(e, targetId) {
  e.preventDefault();
  if (!dragSrcId || dragSrcId === targetId) return;
  if (isCrossGroup(dragSrcId, targetId)) return;

  const fromIdx = tasks.findIndex(t => t.id === dragSrcId);
  const toIdx   = tasks.findIndex(t => t.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  const [moved] = tasks.splice(fromIdx, 1);
  tasks.splice(toIdx, 0, moved);
  saveTasks();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';

  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  progressText.textContent = 'Completed: ' + done + ' / ' + total;
  progressBar.style.width  = pct + '%';

  if (total === 0) {
    emptyMsg.style.display = 'flex';
    taskList.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  taskList.style.display = 'flex';

  const sorted = [
    ...tasks.filter(t => !t.completed),
    ...tasks.filter(t =>  t.completed),
  ];

  sorted.forEach(function(task) {
    if (hideCompleted && task.completed) return;

    const li = document.createElement('li');
    li.className  = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;
    li.draggable  = !task.completed ? true : true;

    // Drag handle
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.title     = 'Drag to reorder';
    handle.innerHTML =
      '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="5.5" cy="4"  r="1.2"/><circle cx="10.5" cy="4"  r="1.2"/>' +
        '<circle cx="5.5" cy="8"  r="1.2"/><circle cx="10.5" cy="8"  r="1.2"/>' +
        '<circle cx="5.5" cy="12" r="1.2"/><circle cx="10.5" cy="12" r="1.2"/>' +
      '</svg>';

    const cb = document.createElement('input');
    cb.type      = 'checkbox';
    cb.className = 'task-checkbox';
    cb.checked   = task.completed;
    cb.addEventListener('change', function() { toggleTask(task.id); });

    const label = document.createElement('span');
    label.className   = 'task-label';
    label.textContent = task.text;

    if (!task.completed) {
      label.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        startEdit(task.id, label, li);
      });
      label.title = 'Double-click to edit';
    } else {
      label.title = 'Uncheck to restore';
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.title     = 'Edit task';
    editBtn.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M10 4l2 2" stroke="currentColor" stroke-width="1.4"/>' +
      '</svg>';

    if (!task.completed) {
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        startEdit(task.id, label, li);
      });
    } else {
      editBtn.style.display = 'none';
    }

    const del = document.createElement('button');
    del.className   = 'delete-btn';
    del.textContent = '×';
    del.title       = 'Delete';
    del.addEventListener('click', function() { deleteTask(task.id); });

    li.append(handle, cb, label, editBtn, del);

    li.addEventListener('dragstart', function(e) { onDragStart(e, task.id); });
    li.addEventListener('dragend',   function()  { onDragEnd(task.id); });
    li.addEventListener('dragover',  function(e) { onDragOver(e, task.id); });
    li.addEventListener('dragleave', function()  { clearStates(); });
    li.addEventListener('drop',      function(e) { onDrop(e, task.id); });

    taskList.appendChild(li);
  });
}