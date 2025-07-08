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

    const streakData = JSON.parse(localStorage.getItem("streakData")) || { streakCount: 0 };
    document.getElementById("streak-count").innerText = streakData.streakCount;


    let circularChart;
    let insightChart;
    let habitBarChart;
    let isEditing = false;
    let editHabitId = null;


    habitForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = document.getElementById("habit-name").value;
        const icon = document.getElementById("habit-icon").value || "✅";

        if (isEditing) {
            // Update existing habit
            habits = habits.map(habit => {
                if (habit.id === editHabitId) {
                    return { ...habit, name, icon };
                }
                return habit;
            });
            isEditing = false;
            editHabitId = null;
            habitForm.querySelector("button").textContent = "Add";
        } else {
            // Create new habit
            const newHabit = {
                id: Date.now(),
                name,
                icon,
                done: false,
                createdAt: new Date().toISOString()
            };
            habits.push(newHabit);
        }

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

    function startEditHabit(habit) {
        document.getElementById("habit-name").value = habit.name;
        document.getElementById("habit-icon").value = habit.icon;
        isEditing = true;
        editHabitId = habit.id;
        habitForm.querySelector("button").textContent = "Update";
    }

    function updateAchievements(doneCount, streak) {
        const unlocked = JSON.parse(localStorage.getItem("achievements")) || [];
        const newlyUnlocked = [];

        if (!unlocked.includes("first_habit") && habits.length >= 1) {
            newlyUnlocked.push("first_habit");
        }

        if (!unlocked.includes("streak_3") && streak >= 3) {
            newlyUnlocked.push("streak_3");
        }

        if (!unlocked.includes("complete_10") && doneCount >= 10) {
            newlyUnlocked.push("complete_10");
        }

        const updated = [...new Set([...unlocked, ...newlyUnlocked])];
        localStorage.setItem("achievements", JSON.stringify(updated));
        renderAchievements(updated);

        // 🎉 Show toast for each newly unlocked achievement
        newlyUnlocked.forEach(id => {
            switch (id) {
                case "first_habit":
                    showToast("🎉 Unlocked: First Habit!");
                    break;
                case "streak_3":
                    showToast("🔥 Unlocked: 3-Day Streak!");
                    break;
                case "complete_10":
                    showToast("🏆 Unlocked: Completed 10 Habits!");
                    break;
            }
        });

        renderAchievements(updated);
    }

    function renderAchievements(achievements) {
        
        const container = document.getElementById("achievement-badges");

        if (!container) {
            console.error("Missing #achievement-badges in DOM");
            return;
        }

        if (!achievements.length) {
            container.innerText = "None Yet 😢";
            return;
        }

        container.innerHTML = achievements.map(id => {
            switch (id) {
                case "first_habit": return "🥇";
                case "streak_3": return "🔥";
                case "complete_10": return "✅";
                default: return "";
            }
        }).join(" ");
    }



    function saveAndRenderHabits() {
        const today = new Date().toISOString().split("T")[0];
        let streakLog = JSON.parse(localStorage.getItem("streakLog")) || [];

        const doneToday = habits.some(h => h.done);

        if (doneToday) {
            if (!streakLog.includes(today)) {
                streakLog.push(today);
            }
        } else {
            // If no habit is done, remove today from streak log
            streakLog = streakLog.filter(date => date !== today);
        }

        localStorage.setItem("streakLog", JSON.stringify(streakLog));
        localStorage.setItem("habits", JSON.stringify(habits));

        renderHabits();
        updateProgress();
        updateStreak();
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

            const created = document.createElement("span");
            created.className = "habit-created";

            if (habit.createdAt) {
                const date = new Date(habit.createdAt);
                created.textContent = `🕒 Created: ${date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            } else {
                created.textContent = "🕒 Created: N/A"; // fallback for old habits
            }
            ;

            if (habit.done) name.classList.add("done");

            infoDiv.appendChild(checkbox);
            infoDiv.appendChild(icon);
            infoDiv.appendChild(name);
            infoDiv.appendChild(created);


            const actionsDiv = document.createElement("div");
            actionsDiv.className = "habit-actions";

            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.textContent = "✏️";
            editBtn.onclick = () => startEditHabit(habit);

            actionsDiv.appendChild(editBtn);

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

    function updateStreak() {
        const streakLog = JSON.parse(localStorage.getItem("streakLog")) || [];
        const sortedDates = streakLog.sort().reverse(); // Latest first

        let streak = 0;
        let currentDate = new Date();

        for (let i = 0; i < sortedDates.length; i++) {
            const date = new Date(sortedDates[i]);
            const diff = Math.floor((currentDate - date) / (1000 * 60 * 60 * 24));

            if (diff === 0 || diff === 1) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1); // Go to previous day
            } else {
                break;
            }
        }

        document.getElementById("streak-count").innerText = streak;
    }


    function updateProgress() {
        const total = habits.length;
        const done = habits.filter(h => h.done).length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        // Count total done habits across all time
        const totalCompleted = habits.filter(h => h.done).length;



        goalCount.innerText = `${done}/${total} Habits`;
        completionText.innerText = `${percent}%`;

        // 🆕 Streak Logic
        const today = new Date().toDateString(); // only date part
        let streakData = JSON.parse(localStorage.getItem("streakData")) || {
            streakCount: 0,
            lastUpdatedDate: null
        };

        if (streakData.lastUpdatedDate !== today) {
            if (done > 0) {
                // continued streak
                streakData.streakCount += 1;
            } else {
                // broke streak
                streakData.streakCount = 0;
            }
            streakData.lastUpdatedDate = today;
            localStorage.setItem("streakData", JSON.stringify(streakData));
        }

        document.getElementById("streak-count").innerText = streakData.streakCount;

        updateAchievements(totalCompleted, streakData.streakCount);

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
    const initialAchievements = JSON.parse(localStorage.getItem("achievements")) || [];
    renderAchievements(initialAchievements);
    updateStreak();
});


function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);

    // Auto-remove toast after animation
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
