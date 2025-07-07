// Register center text plugin once
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
        const { width, height } = chart;
        const ctx = chart.ctx;
        const [done, remaining] = chart.config.data.datasets[0].data;
        const total = done + remaining;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        ctx.restore();
        const fontSize = (height / 5).toFixed(2);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#3b82f6";
        const text = `${percent}%`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        ctx.fillText(text, textX, textY);
        ctx.save();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const habitForm = document.getElementById("habit-form");
    const habitList = document.getElementById("habit-list");
    const goalCount = document.getElementById("goal-count");
    const completionText = document.getElementById("completion-percent");

    let habits = JSON.parse(localStorage.getItem("habits")) || [];
    let activityLog = JSON.parse(localStorage.getItem("habitLog")) || {}; // ✅ Daily log

    let circularChart;
    let insightChart;
    let habitBarChart;

    habitForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = document.getElementById("habit-name").value;
        const icon = document.getElementById("habit-icon").value || "✅";

        const newHabit = {
            id: Date.now(),
            name,
            icon,
            done: false
        };

        habits.push(newHabit);
        saveAndRenderHabits();
        habitForm.reset();
    });

    function toggleHabit(id) {
        const today = new Date().toISOString().split("T")[0];

        habits = habits.map(habit => {
            if (habit.id === id) habit.done = !habit.done;
            return habit;
        });

        // ✅ Log done habits for today
        const doneCount = habits.filter(h => h.done).length;
        activityLog[today] = doneCount;
        localStorage.setItem("habitLog", JSON.stringify(activityLog));

        saveAndRenderHabits();
    }

    function deleteHabit(id) {
        habits = habits.filter(habit => habit.id !== id);
        saveAndRenderHabits();
    }

    function saveAndRenderHabits() {
        localStorage.setItem("habits", JSON.stringify(habits));
        renderHabits();
        updateProgress();
    }

    function renderHabits() {
        habitList.innerHTML = "";

        habits.forEach(habit => {
            const div = document.createElement("div");
            div.className = "habit-card";

            const infoDiv = document.createElement("div");
            infoDiv.className = "habit-info";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "custom-checkbox";
            checkbox.checked = habit.done;
            checkbox.onchange = () => toggleHabit(habit.id);

            const icon = document.createElement("span");
            icon.className = "habit-icon";
            icon.textContent = habit.icon;

            const name = document.createElement("span");
            name.className = "habit-name";
            name.textContent = habit.name;

            if (habit.done) name.classList.add("done");

            infoDiv.appendChild(checkbox);
            infoDiv.appendChild(name);
            infoDiv.appendChild(icon);

            const actionsDiv = document.createElement("div");
            actionsDiv.className = "habit-actions";

            const delBtn = document.createElement("button");
            delBtn.className = "delete-btn";
            delBtn.textContent = "🗑️";
            delBtn.onclick = () => deleteHabit(habit.id);

            actionsDiv.appendChild(delBtn);

            div.appendChild(infoDiv);
            div.appendChild(actionsDiv);
            habitList.appendChild(div);
        });
    }

    function updateProgress() {
        const total = habits.length;
        const done = habits.filter(h => h.done).length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        goalCount.innerText = `${done}/${total} Habits`;
        completionText.innerText = `${percent}%`;

        // --- Today Circular Chart ---
        if (circularChart) circularChart.destroy();

        circularChart = new Chart(document.getElementById("circularProgress"), {
            type: "doughnut",
            data: {
                labels: ["Completed", "Remaining"],
                datasets: [{
                    data: [done, total - done],
                    backgroundColor: ["#3b82f6", "#e5e7eb"],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: "70%",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [centerTextPlugin]
        });

        // --- Weekly Circular Insight Chart ---
        if (insightChart) insightChart.destroy();

        const weekDays = getLast7Days(); // ["2025-07-01", ..., today]
        const weeklyData = weekDays.map(day => activityLog[day] || 0);
        const totalWeek = weeklyData.reduce((a, b) => a + b, 0);
        const goalWeek = 7 * habits.length;
        const remaining = Math.max(goalWeek - totalWeek, 0);

        insightChart = new Chart(document.getElementById("insightCircularChart"), {
            type: "doughnut",
            data: {
                labels: ["Completed", "Remaining"],
                datasets: [{
                    data: [totalWeek, remaining],
                    backgroundColor: ["#10b981", "#f3f4f6"],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: "70%",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [centerTextPlugin]
        });

        // --- Update Bar Chart ---
        if (habitBarChart) habitBarChart.destroy();

        habitBarChart = new Chart(document.getElementById("habitChart").getContext("2d"), {
            type: "bar",
            data: {
                labels: getWeekDayNames(),
                datasets: [{
                    label: "Habits Completed",
                    data: weeklyData,
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }

    // ✅ Get last 7 days in YYYY-MM-DD
    function getLast7Days() {
        const dates = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(d.toISOString().split("T")[0]);
        }
        return dates;
    }

    // ✅ Get week day names from last 7 days
    function getWeekDayNames() {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return getLast7Days().map(d => {
            const date = new Date(d);
            return days[date.getDay()];
        });
    }

    // Initial render
    saveAndRenderHabits();
});
