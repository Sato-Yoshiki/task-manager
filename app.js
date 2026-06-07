const STORAGE_KEY = "tasks";

let tasks = [];
let currentEditId = null;
let currentDetailId = null;
let confirmCallback = null;
let fileHandle = null;

initializeFileSystem();

document.getElementById("loadTasksJsonInput")
  .onchange = async (e) => {

  const file = e.target.files[0];

  if(!file){
    return;
  }

  try{

    const text = await file.text();

    const json = JSON.parse(text);

    if(!Array.isArray(json)){
      throw new Error("JSON配列ではありません");
    }

    tasks = json;

    // localStorageへ保存
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks)
    );

    renderAll();

    alert("tasks.json を読み込みました");

  }catch(err){

    console.error(err);

    alert(
      "JSON読込失敗\n" +
      err.message
    );
  }
};

loadTasks();

function loadTasks(){

  const data = localStorage.getItem(STORAGE_KEY);

  if(data){

    try{
      tasks = JSON.parse(data);
    }catch{
      tasks = [];
    }
  }

  renderAll();
}

async function saveTasks(){

  const json = JSON.stringify(tasks, null, 2);

  localStorage.setItem(
    STORAGE_KEY,
    json
  );

  await saveTasksToFile(json);

  renderAll();
}

function renderAll(){
  renderDeadlineTasks();
  renderNoDeadlineTasks();
  renderCompleteTasks();
  renderCalendar();
}

function generateId(){
  return crypto.randomUUID();
}

function openModal(id){
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id){
  document.getElementById(id).classList.add("hidden");
}

document.getElementById("addTaskBtn").onclick = () => {
  currentEditId = null;

  document.getElementById("modalTitle").innerText = "タスク追加";

  clearTaskForm();

  openModal("taskModal");
};

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

function renderDeadlineTasks(){

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

function renderNoDeadlineTasks(){

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

function renderCompleteTasks(){

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
            ? "#999"
            : task.important
              ? "#ff7b7b"
              : task.status === 1
                ? "#f5d742"
                : "#4aa3ff"
      }))
  });

  calendar.render();
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

document.getElementById("jsonFileInput")
  .onchange = async (e) => {

  const file = e.target.files[0];

  if(!file) return;

  const text = await file.text();

  document.getElementById("codeInputArea").value = text;
};

async function initializeFileSystem(){

  try{

    const saved = localStorage.getItem("taskFileHandle");

    if(saved){

      // 復元不可なので再選択方式
      console.log("以前のファイル情報あり");
    }

  }catch(e){

    console.error(e);
  }
}

async function saveTasksToFile(json){

  try{

    if(!fileHandle){

      fileHandle = await window.showSaveFilePicker({

        suggestedName: "tasks.json",

        types: [
          {
            description: "JSON Files",
            accept: {
              "application/json": [".json"]
            }
          }
        ]
      });
    }

    const writable =
      await fileHandle.createWritable();

    await writable.write(json);

    await writable.close();

  }catch(e){

    console.error("保存失敗", e);
  }
}

document.getElementById("jsonFileInput")
  .onchange = async (e) => {

  const file = e.target.files[0];

  if(!file) return;

  const text = await file.text();

  document.getElementById("codeInputArea").value = text;
};