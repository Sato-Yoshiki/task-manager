let tasks = [];
let currentEditId = null;
let currentDetailId = null;
let confirmCallback = null;
let fileHandle = null;
let hasPermission = false;

initializeFileSystem();
loadTasks();

function loadTasks(){
  tasks = window.DEFAULT_TASKS || [];
  renderAll();
}

async function saveTasks(){
  openModal("NowSavingModal");
  await saveTasksToFile(tasks);
  closeModal("NowSavingModal");
  renderAll();
}

function renderAll(){
  renderDeadlineTasks();
  renderNoDeadlineTasks();
  renderCompleteTasks();
  renderCalendar();
}

async function initializeFileSystem() {

  fileHandle = await loadHandle();

  if (!fileHandle) {
    console.log("初回起動");
    return;
  }

  const options = {
    mode: "readwrite"
  };

  const query_permission = await fileHandle.queryPermission(options);

  console.log("permission:", query_permission);
}

async function saveTasksToFile(json){
  try{
    if(!fileHandle){

      fileHandle = await window.showSaveFilePicker({

        suggestedName: "tasks.js",

        types: [
          {
            description: "JavaScript Files",
            accept: {
              "application/javascript": [".js"]
            }
          }
        ]
      });
      await saveHandle(fileHandle);
    }

    const writable = await fileHandle.createWritable();
    const content =
      `window.DEFAULT_TASKS = ${JSON.stringify(json, null, 2)};`;

    await writable.write(content);

    await writable.close();

  }catch(e){
    console.error("保存失敗", e);
  }
}


// モーダル制御
function openModal(id){
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id){
  document.getElementById(id).classList.add("hidden");
}


// タスク編集
document.getElementById("addTaskBtn").onclick = () => {
  currentEditId = null;

  document.getElementById("modalTitle").innerText = "タスク追加";

  clearTaskForm();

  openModal("taskModal");
};

function generateId(){
  return crypto.randomUUID();
}

function clearTaskForm(){
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDeadline").value = "";
  document.getElementById("taskTime").value = "";
  document.getElementById("taskExplain").innerHTML = "";
  document.getElementById("taskImportant").checked = false;
  document.getElementById("taskStatus").value = "1";
}

document.getElementById("clearDateBtn").onclick = () => {
  document.getElementById("taskDeadline").value = "";
};

document.getElementById("clearTimeBtn").onclick = () => {
  document.getElementById("taskTime").value = "";
};

document.getElementById("cancelTaskBtn").onclick = () => {
  closeModal("taskModal");
};

document.getElementById("saveTaskBtn").onclick = () => {

  const title = document.getElementById("taskTitle").value.trim();

  if(!title){
    alert("タイトルは必須です");
    return;
  }

  const task = {
    id: currentEditId || generateId(),
    title,
    deadline: document.getElementById("taskDeadline").value,
    time: document.getElementById("taskTime").value,
    explain: document.getElementById("taskExplain").innerHTML,
    important: document.getElementById("taskImportant").checked,
    status: Number(document.getElementById("taskStatus").value),
    complete: Number(document.getElementById("taskStatus").value) === 3,
    completedAt: Number(document.getElementById("taskStatus").value) === 3
      ? new Date().toISOString()
      : null
  };

  if(currentEditId){
    const idx = tasks.findIndex(t => t.id === currentEditId);

    tasks[idx] = task;
  }else{
    tasks.push(task);
  }

  saveTasks();

  closeModal("taskModal");
};

// タスク表示
function renderDeadlineTasks(){ // 期限ありタスクの表示

  const area = document.getElementById("deadlineTaskList");

  const range = document.getElementById("deadlineRange").value;

  let list = tasks.filter(t =>
    t.deadline &&
    !t.complete
  );

  const now = new Date();

  if(range !== "all"){
    list = list.filter(task => {

    const d = new Date(task.deadline);

    if(range === "week"){
      return (d - now) <= 7 * 24 * 60 * 60 * 1000;
    }

    if(range === "month"){
      return (d - now) <= 30 * 24 * 60 * 60 * 1000;
    }

      return (d - now) <= 90 * 24 * 60 * 60 * 1000;
    });
  }

  list.sort((a,b)=>{

    if(a.important && !b.important) return -1;
    if(!a.important && b.important) return 1;

    return new Date(a.deadline) - new Date(b.deadline);
  });

  if(list.length === 0){
    area.innerHTML = "表示するタスクがありません";
    return;
  }

  area.innerHTML = "";

  list.forEach(task => {

    area.innerHTML += createTaskCard(task, true);
  });

  bindTaskEvents();
}

function renderNoDeadlineTasks(){ // 期限なしタスクの表示

  const area = document.getElementById("noDeadlineTaskList");

  const list = tasks.filter(t =>
    !t.deadline &&
    !t.complete
  );

  if(list.length === 0){
    area.innerHTML = "表示するタスクがありません";
    return;
  }

  area.innerHTML = "";

  list
    .sort((a,b)=>{

      if(a.important && !b.important) return -1;
      if(!a.important && b.important) return 1;

      return 0;
    })
    .forEach(task => {

      area.innerHTML += createTaskCard(task, false);
    });

  bindTaskEvents();
}

function renderCompleteTasks(){ // 完了タスクの表示

  const area = document.getElementById("completeTaskList");

  const keyword = document
    .getElementById("completeSearch")
    .value
    .toLowerCase();

  let list = tasks.filter(t => t.complete);

  list = list.filter(t => {

    return (
  (t.title || "").toLowerCase().includes(keyword) ||
  (t.explain || "").toLowerCase().includes(keyword) ||
  (t.deadline || "").toLowerCase().includes(keyword) ||
  (t.time || "").toLowerCase().includes(keyword)
);
  });

  list.sort((a,b)=>
    new Date(b.completedAt) - new Date(a.completedAt)
  );

  if(list.length === 0){
    area.innerHTML = "表示するタスクがありません";
    return;
  }

  area.innerHTML = "";

  list.forEach(task => {

    area.innerHTML += createTaskCard(task, !!task.deadline, true);
  });

  bindTaskEvents();
}

document.getElementById("clearCompleteBtn").onclick = () => {
  document.getElementById("completeSearch").value = "";
  renderCompleteTasks();
};

function createTaskCard(task, hasDeadline, completed=false){

  let statusText = "";
  let statusClass = "";

  if(task.status === 1){
    statusText = "着手する";
    statusClass = "todo";
  }

  if(task.status === 2){
    statusText = "完了する";
    statusClass = "doing";
  }

  return `
    <div class="task-card
      ${task.important ? "important" : ""}
      ${completed ? "complete-task" : ""}
    ">

      <div class="task-row">

        <div class="task-main"
             data-id="${task.id}">

          ${task.important ? "【重要】" : ""}
          ${task.title}

          ${
            hasDeadline
              ? `（${task.deadline} ${task.time || ""}）`
              : ""
          }

        </div>

        ${
          !completed && task.status !== 3
            ? `
              <button
                class="status-btn ${statusClass}"
                data-status-id="${task.id}">
                ${statusText}
              </button>
            `
            : ""
        }

      </div>
    </div>
  `;
}

// タスクステータス変更
function bindTaskEvents(){

  document.querySelectorAll(".task-main").forEach(el => {

    el.onclick = () => {
      showTaskDetail(el.dataset.id);
    };
  });

  document.querySelectorAll("[data-status-id]").forEach(btn => {

    btn.onclick = (e) => {

      e.stopPropagation();

      const task = tasks.find(t =>
        t.id === btn.dataset.statusId
      );

      if(task.status === 1){
        task.status = 2;
        saveTasks();
        return;
      }

      showConfirm(
        `${task.title} を完了済みにしますか？`,
        () => {
          task.status = 3;
          task.complete = true;
          task.completedAt = new Date().toISOString();

          saveTasks();
        }
      );
    };
  });
}

// タスク詳細表示
function showTaskDetail(id){

  currentDetailId = id;

  const task = tasks.find(t => t.id === id);

  document.getElementById("taskDetailContent").innerHTML = `
    <h2>${task.title}</h2>

    <p>期限：${task.deadline || "なし"} ${task.time || ""}</p>

    <p>重要：
      ${task.important ? "重要" : "普通"}
    </p>

    <p>状況：
      ${
        task.status === 1
          ? "未着手"
          : task.status === 2
            ? "着手中"
            : "完了"
      }
    </p>

    <div>${task.explain}</div>
  `;

  openModal("detailModal");
}

// タスク詳細モーダルの制御
// モーダルの背景クリックで閉じる（保存処理がこれだけないため）
const detailModal = document.getElementById("detailModal");

detailModal.addEventListener("click", (event) => {

  if (event.target === detailModal) {
    closeModal("detailModal");
  }

});

document.getElementById("closeDetailBtn").onclick = () => {
  closeModal("detailModal");
};

document.getElementById("editTaskBtn").onclick = () => {

  const task = tasks.find(t =>
    t.id === currentDetailId
  );

  currentEditId = task.id;

  document.getElementById("modalTitle").innerText = "タスク編集";

  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDeadline").value = task.deadline;
  document.getElementById("taskTime").value = task.time;
  document.getElementById("taskExplain").innerHTML = task.explain;
  document.getElementById("taskImportant").checked = task.important;
  document.getElementById("taskStatus").value = task.status;

  closeModal("detailModal");

  openModal("taskModal");
};

document.getElementById("deleteTaskBtn").onclick = () => {

  const task = tasks.find(t =>
    t.id === currentDetailId
  );

  showConfirm(
    `${task.title} を削除していいですか？`,
    () => {

      tasks = tasks.filter(t =>
        t.id !== task.id
      );

      saveTasks();

      closeModal("detailModal");
    }
  );
};

// 確認ダイアログ
function showConfirm(message, callback){

  confirmCallback = callback;

  document.getElementById("confirmMessage").innerText = message;

  openModal("confirmModal");
}

document.getElementById("confirmOkBtn").onclick = () => {

  if(confirmCallback){
    confirmCallback();
  }

  closeModal("confirmModal");
};

document.getElementById("confirmCancelBtn").onclick = () => {
  closeModal("confirmModal");
};

document.getElementById("deadlineRange").onchange = renderDeadlineTasks;

document.getElementById("completeSearch").oninput = renderCompleteTasks;

// カレンダー表示
function renderCalendar(){

  const calendarEl = document.getElementById("calendar");

  calendarEl.innerHTML = "";

  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: "dayGridMonth",

    locale: "ja",

    events: tasks
      .filter(t => t.deadline)
      .map(task => ({

        title: task.title,

        start: task.deadline,

        backgroundColor:
          task.complete
            ? "var(--complete-color)"
            : task.important
              ? "var(--important-color)"
              : task.status === 1
                ? "var(--todo-color)"
                : "var(--doing-color)"
      }))
  });

  calendar.render();
}

// IndexedDBを使用してファイルハンドルを保存
async function saveHandle(handle) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("files", "readwrite");

    tx.objectStore("files")
      .put(handle, "tasksFile");

    tx.oncomplete = () => resolve();

    tx.onerror = () => reject(tx.error);

    tx.onabort = () => reject(tx.error);
  });
}

async function loadHandle() {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("files", "readonly");

    const request =
      tx.objectStore("files").get("tasksFile");

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function openDB() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open("TaskDB", 1);

    request.onupgradeneeded = () => {

      const db = request.result;

      if (!db.objectStoreNames.contains("files")) {

        db.createObjectStore("files");
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);
  });
}


/* コード入力 */
document.getElementById("codeInputBtn").onclick = () => {
  openModal("codeInputModal");
};

document.getElementById("codeInputCancelBtn").onclick = () => {
  closeModal("codeInputModal");
};

document.getElementById("codeRegisterBtn").onclick = async () => {

  try{

    const input = JSON.parse(
      document.getElementById("codeInputArea").value
    );

    if(!Array.isArray(input)){
      throw new Error("配列形式で入力してください");
    }

    let addedCount = 0;
    let duplicateCount = 0;

    input.forEach(t => {

      if(!t.title){
        throw new Error("title が不足しています");
      }

      if(!t.id){
        t.id = crypto.randomUUID();
      }

      const exists = tasks.some(existing => {

        return existing.id === t.id;
      });

      if(exists){
        duplicateCount++;
        return;
      }

      tasks.push(t);

      addedCount++;
    });

    saveTasks();

    closeModal("codeInputModal");

    alert(
      `登録完了\n` +
      `追加: ${addedCount}件\n` +
      `重複スキップ: ${duplicateCount}件`
    );

  }catch(e){

    alert(`コード不備：${e.message}`);
  }
};

document.getElementById("jsonFileInput")
  .onchange = async (e) => {
  document.getElementById("codeInputArea").value = "";

  const file = e.target.files[0];

  if(!file) return;

  const text = await file.text();

  document.getElementById("codeInputArea").value = text;
};

/* コード抽出 */
document.getElementById("codeExportBtn").onclick = () => {

  openModal("codeExportModal");

  renderExportList();
};

function renderExportList(){

  const area = document.getElementById("exportTaskList");

  const keyword = document
    .getElementById("exportSearch")
    .value
    .toLowerCase();

  let list = [...tasks];

    list = list.filter(t => {

    return (
        (t.title || "").toLowerCase().includes(keyword) ||
        (t.explain || "").toLowerCase().includes(keyword) ||
        (t.deadline || "").toLowerCase().includes(keyword) ||
        (t.time || "").toLowerCase().includes(keyword)
    );
    });

  list.sort((a,b)=>{

    if(a.important && !b.important) return -1;
    if(!a.important && b.important) return 1;

    if(a.deadline && b.deadline){
      return new Date(a.deadline)
        - new Date(b.deadline);
    }

    if(a.deadline) return -1;
    if(b.deadline) return 1;

    return 0;
  });

  area.innerHTML = "";

  list.forEach(task => {

    area.innerHTML += `
      <label>
        <input type="checkbox"
               class="export-check"
               value="${task.id}">
        ${task.title}
      </label>
      <br>
    `;
  });

  document.querySelectorAll(".export-check").forEach(c => {

    c.onchange = updateExportCode;
  });
}

function updateExportCode(){

  const checked = [
    ...document.querySelectorAll(".export-check:checked")
  ].map(c => c.value);

  const selected = tasks.filter(t =>
    checked.includes(t.id)
  );

  document.getElementById("exportCodeArea").value =
    JSON.stringify(selected, null, 2);
}

document.getElementById("exportSearch").oninput =
  renderExportList;

document.getElementById("copyCodeBtn").onclick = async () => {

  await navigator.clipboard.writeText(
    document.getElementById("exportCodeArea").value
  );

  alert("コピーしました");
};

document.getElementById("closeExportBtn").onclick = () => {

  const ok = confirm("画面を閉じていいですか？");

  if(ok){
    closeModal("codeExportModal");
  }
};

document.getElementById("downloadCodeBtn").onclick = () => {

  const content =
    document.getElementById("exportCodeArea").value;

  const blob = new Blob(
    [content],
    { type:"application/json" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = "tasks.json";

  a.click();

  URL.revokeObjectURL(url);
};