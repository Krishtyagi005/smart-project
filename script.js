document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    let allClassrooms = [];
    let allClasses = [];

    // Navigation
    window.switchTab = (id) => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        document.querySelector(`[onclick="switchTab('${id}')"]`).classList.add('active');
        if(id === 'timetable') renderTimetable();
    };

    // Fetch Data
    async function loadData() {
        try {
            const [roomsRes, classesRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/classrooms`),
                fetch(`${API_BASE_URL}/classes`),
                fetch(`${API_BASE_URL}/dashboard-stats`)
            ]);
            
            allClassrooms = await roomsRes.json();
            allClasses = await classesRes.json();
            const stats = await statsRes.json();

            // Update Dashboard
            document.getElementById('total-classes').innerText = stats.totalClasses;
            document.getElementById('total-classrooms').innerText = stats.totalClassrooms;
            document.getElementById('active-slots').innerText = allClasses.length; // simplified

            // Populate Modals & Grids
            populateRoomSelect();
            renderClassrooms();
            renderTimetable();
            renderClassesTable();
            renderReports();
        } catch (e) { console.error("API Error. Is backend running?", e); }
    }

    function populateRoomSelect() {
        const select = document.getElementById('modal-room-select');
        select.innerHTML = '';
        allClassrooms.forEach(r => select.innerHTML += `<option value="${r.name}">${r.name}</option>`);
    }

    // Renderers
    window.renderTimetable = () => {
        const grid = document.getElementById('timetable-grid');
        grid.innerHTML = '';
        const filter = document.getElementById('timetable-filter-room').value;

        for(let h=7; h<=18; h++) {
            const row = document.createElement('div');
            row.className = 'time-row';
            row.innerHTML = `<div class="time-label">${h}:00</div>`;
            
            ['Monday','Tuesday','Wednesday','Thursday','Friday'].forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'time-slot';
                
                const cls = allClasses.find(c => {
                    const startH = parseInt(c.start_time.split(':')[0]);
                    return c.day === day && startH === h && (filter === 'all' || c.room_name === filter);
                });

                if(cls) {
                    cell.innerHTML = `<div class="class-entry"><b>${cls.name}</b><br>${cls.room_name}</div>`;
                    cell.onclick = () => deleteClass(cls.id);
                }
                row.appendChild(cell);
            });
            grid.appendChild(row);
        }
    };

    window.renderClassrooms = () => {
        const list = document.getElementById('classroom-list');
        list.innerHTML = allClassrooms.map(r => `
            <div class="classroom-card">
                <h3>${r.name}</h3>
                <p>Cap: ${r.capacity}</p>
                <p>Eq: ${r.equipment}</p>
            </div>`).join('');
    };

    window.renderClassesTable = () => {
        document.getElementById('classes-table-body').innerHTML = allClasses.map(c => `
            <tr>
                <td>${c.class_id}</td><td>${c.name}</td><td>${c.teacher}</td>
                <td>${c.room_name}</td><td>${c.day} ${c.start_time}</td>
                <td><button onclick="deleteClass(${c.id})" class="btn-primary" style="padding:5px; background:red;">Del</button></td>
            </tr>`).join('');
    };

    window.renderReports = () => {
        const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const container = document.getElementById('chart-classes-day');
        container.innerHTML = days.map(d => {
            const count = allClasses.filter(c => c.day === d).length;
            return `<div style="text-align:center"><div class="bar" style="height:${count*20}px"></div><small>${d.substr(0,3)}</small></div>`;
        }).join('');
    }

    // Actions
    document.getElementById('add-class-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await fetch(`${API_BASE_URL}/classes`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
        });
        closeModal('add-class-modal');
        loadData();
    });

    document.getElementById('add-classroom-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.equipment = data.equipment; // keep string
        await fetch(`${API_BASE_URL}/classrooms`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
        });
        closeModal('add-classroom-modal');
        loadData();
    });

    window.deleteClass = async (id) => {
        if(confirm('Delete class?')) {
            await fetch(`${API_BASE_URL}/classes/${id}`, { method: 'DELETE' });
            loadData();
        }
    };

    // Init
    document.getElementById('current-date').innerText = new Date().toDateString();
    loadData();

    // Modal Helpers
    window.openModal = (id) => document.getElementById(id).style.display = 'flex';
    window.closeModal = (id) => document.getElementById(id).style.display = 'none';
});
