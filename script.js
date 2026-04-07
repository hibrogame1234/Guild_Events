// Cấu hình thời gian sự kiện: Thứ 7 (Ngày 6), từ 20:00 đến 21:00
const EVENT_CONFIG = {
    dayOfWeek: 6,      // 0: Chủ nhật, 6: Thứ 7
    startHour: 20,     // 20h
    startMinute: 0,
    endHour: 21,       // 21h khóa
    endMinute: 0
};

// Hàm kiểm tra trạng thái mở cửa
function isEventOpen() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Kiểm tra đúng ngày Thứ 7
    if (currentDay !== EVENT_CONFIG.dayOfWeek) return false;

    // Kiểm tra trong khoảng giờ
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = EVENT_CONFIG.startHour * 60 + EVENT_CONFIG.startMinute;
    const endTimeInMinutes = EVENT_CONFIG.endHour * 60 + EVENT_CONFIG.endMinute;

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
}

//============================================================
//============================================================
const ADMIN_PIN = "171102"; 
const cubes = [document.getElementById('cube1'), document.getElementById('cube2'), document.getElementById('cube3')];
const rollBtn = document.getElementById('roll-btn');

// --- 1. LẮNG NGHE DỮ LIỆU TỪ FIREBASE ĐỂ VẼ BẢNG ---
window.dbOnValue(window.dbRef(window.db, 'leaderboard'), (snapshot) => {
    const data = snapshot.val();
    const scoreBody = document.getElementById('score-body');
    scoreBody.innerHTML = ""; 

    if (data) {
        // Chuyển object thành mảng và sắp xếp điểm cao xuống thấp
        const list = Object.values(data).sort((a, b) => b.score - a.score);
        
        list.slice(0, 20).forEach((item, index) => { // Chỉ lấy Top 10
            scoreBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.username}</td>
                    <td>${item.score}đ</td>
                </tr>
            `;
        });
    } else {
        scoreBody.innerHTML = "<tr><td colspan='3'>Chưa có cao thủ nào!</td></tr>";
    }
});

// --- 2. LOGIC QUAY XÚC XẮC ---
rollBtn.addEventListener('click', () => {
    if (!isEventOpen()) {
        alert(`Sự kiện đã kết thúc! Vui lòng quay lại vào ${EVENT_CONFIG.startHour}:00 Thứ 7 hàng tuần.`);
        return;
    }

    const name = document.getElementById('username').value.trim();
    if (!name) return alert("Nhập tên Ingame!");
    
    // Kiểm tra tên này đã quay chưa (Chống quay lại)
    window.dbOnValue(window.dbRef(window.db, 'leaderboard'), (snapshot) => {
        const data = snapshot.val();
        let hasPlayed = false;
        if (data) {
            hasPlayed = Object.values(data).some(item => item.username.toLowerCase() === name.toLowerCase());
        }

        if (hasPlayed) {
            alert("Nhân vật này đã tham gia rồi!");
        } else {
            processRoll(name);
        }
    }, { onlyOnce: true });
});

function processRoll(name) {
    rollBtn.disabled = true;
    let total = 0;
    
    cubes.forEach((cube, i) => {
        const res = Math.floor(Math.random() * 6) + 1;
        total += res;
        const rots = {1:[0,0], 2:[-90,0], 3:[0,-90], 4:[0,90], 5:[90,0], 6:[180,0]};
        setTimeout(() => {
            cube.style.transform = `rotateX(${rots[res][0] + 1800}deg) rotateY(${rots[res][1] + 1800}deg)`;
        }, i * 100);
    });

    setTimeout(() => {
        document.getElementById('total-score').innerText = `Điểm: ${total}`;
        
        // GỬI LÊN FIREBASE (Thay thế hàm cũ)
        const scoresRef = window.dbRef(window.db, 'leaderboard');
        const newScoreRef = window.dbPush(scoresRef);
        window.dbSet(newScoreRef, {
            username: name,
            score: total,
            time: new Date().toLocaleString()
        });
        
        rollBtn.disabled = false; // Mở lại nút sau khi quay xong
    }, 1800);
}

// --- 3. QUẢN TRỊ ADMIN ---
window.addEventListener('keydown', (e) => {
    // Phím tắt mở Admin (ví dụ: nhấn phím 'q')
    if (e.key.toLowerCase() === '?') {
        if (prompt("PIN Admin:") === ADMIN_PIN) 
            document.getElementById('admin-panel').classList.toggle('hidden');
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm("Reset sạch bảng xếp hạng trên Internet?")) {
        window.dbRemove(window.dbRef(window.db, 'leaderboard')).then(() => {
            alert("Đã reset!");
            location.reload();
        });
    }
});

//
function updateStatusUI() {
    const statusEl = document.getElementById('timer-status');
    if (!statusEl) return;

    if (isEventOpen()) {
        statusEl.innerText = "🟢 SỰ KIỆN ĐANG DIỄN RA - QUAY NGAY!";
        statusEl.style.background = "#2ecc71";
    } else {
        statusEl.innerText = `🔴 SỰ KIỆN ĐANG KHÓA (Mở vào ${EVENT_CONFIG.startHour}:00 Thứ 7)`;
        statusEl.style.background = "#eb4d4b";
    }
}

// Chạy cập nhật mỗi phút
setInterval(updateStatusUI, 60000);
updateStatusUI();