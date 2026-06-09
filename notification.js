renderNotifications();

function renderNotifications(){
    const area = document.getElementById("notificationTaskList");
    const task = JSON.parse(
        localStorage.getItem("notificationTask")
    );
    if(task.length === 0){
        area.innerHTML = "表示するタスクがありません";
        return;
    }else{
        area.innerHTML = "";
        task.forEach(t => {
            area.innerHTML += createTaskCard(t);
        });
    }
}

function createTaskCard(task){
  return `
    <div class="task-card
      ${task.important ? "important" : ""}
      ${task.completed ? "complete-task" : ""}
    ">

      <div class="task-row">
        <div class="task-main"
             data-id="${task.id}">

          ${task.important ? "【重要】" : ""}
          ${task.title}

          ${
            task.deadline
              ? `（${task.deadline} ${task.time || ""}）`
              : ""
          }

        </div>
      </div>
    </div>
  `;
}