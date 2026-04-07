// ============================================================
// 1. CẤU HÌNH & LẮNG NGHE THỜI GIAN (DICE - HÀNG TUẦN)
// ============================================================
let DICE_CONFIG = { dayOfWeek: 6, startHour: 20, startMinute: 0, endHour: 21, endMinute: 0 };

if (window.db) {
    window.dbOnValue(window.dbRef(window.db, 'eventConfig/dice'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            DICE_CONFIG = data;
            
            // Tự động điền lại vào ô input trong Admin nếu có
            if(document.getElementById('edit-day')) {
                document.getElementById('edit-day').value = data.dayOfWeek;
                document.getElementById('edit-start').value = data.startHour;
                document.getElementById('edit-end').value = data.endHour;
            }
            // Cập nhật giao diện đồng hồ ngay lập tức
            updateStatusUI();
        }
    });
}

// Hàm kiểm tra trạng thái mở cửa game Xúc xắc
function isDiceOpen() {
    if (!DICE_CONFIG) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 1. Kiểm tra đúng ngày
    if (currentDay !== DICE_CONFIG.dayOfWeek) return false;

    // 2. Kiểm tra khung giờ (Quy đổi ra phút)
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = (DICE_CONFIG.startHour || 0) * 60 + (DICE_CONFIG.startMinute || 0);
    const endTimeInMinutes = (DICE_CONFIG.endHour || 0) * 60 + (DICE_CONFIG.endMinute || 0);

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
}

// ============================================================
// 2. LOGIC GAME & BẢNG XẾP HẠNG
// ============================================================
const ADMIN_PIN = "171102"; 
const cubes = [document.getElementById('cube1'), document.getElementById('cube2'), document.getElementById('cube3')];
const rollBtn = document.getElementById('roll-btn');

// Lắng nghe dữ liệu bảng xếp hạng
window.dbOnValue(window.dbRef(window.db, 'leaderboard'), (snapshot) => {
    const data = snapshot.val();
    const scoreBody = document.getElementById('score-body');
    if (!scoreBody) return;
    scoreBody.innerHTML = ""; 

    if (data) {
        const list = Object.values(data).sort((a, b) => b.score - a.score);
        list.slice(0, 20).forEach((item, index) => {
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

// Sự kiện bấm nút Quay
rollBtn.addEventListener('click', () => {
    // Kiểm tra giờ mở cửa
    if (!isDiceOpen()) {
        const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        alert(`Sự kiện đang khóa! Hẹn bạn vào ${DICE_CONFIG.startHour}:00 ${days[DICE_CONFIG.dayOfWeek]}`);
        return;
    }

    const name = document.getElementById('username').value.trim();
    if (!name) return alert("Nhập tên Ingame!");
    
    rollBtn.disabled = true;

    // Kiểm tra trùng lặp (chỉ lấy dữ liệu 1 lần)
    const leaderboardRef = window.dbRef(window.db, 'leaderboard');
    window.dbOnValue(leaderboardRef, (snapshot) => {
        const data = snapshot.val();
        let hasPlayed = false;
        if (data) {
            hasPlayed = Object.values(data).some(item => item.username.toLowerCase() === name.toLowerCase());
        }

        if (hasPlayed) {
            alert("Nhân vật này đã tham gia rồi!");
            rollBtn.disabled = false;
        } else {
            processRoll(name);
        }
    }, { onlyOnce: true });
});

// Hàm xử lý hiệu ứng quay và lưu điểm
function processRoll(name) {
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
        
        // Lưu lên Firebase
        const scoresRef = window.dbRef(window.db, 'leaderboard');
        const newScoreRef = window.dbPush(scoresRef);
        window.dbSet(newScoreRef, {
            username: name,
            score: total,
            time: new Date().toLocaleString()
        });
        
        rollBtn.disabled = false;
    }, 1800);
}

// ============================================================
// 3. QUẢN TRỊ ADMIN (MỞ BẰNG PHÍM "?")
// ============================================================
window.addEventListener('keydown', (e) => {
    if (e.key === '?') {
        if (prompt("PIN Admin:") === ADMIN_PIN) {
            const adminPanel = document.getElementById('admin-panel');
            if (adminPanel) adminPanel.classList.toggle('hidden');
        }
    }
});

// Lưu cấu hình giờ từ Admin
const saveBtn = document.getElementById('save-config-btn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const newConfig = {
            dayOfWeek: parseInt(document.getElementById('edit-day').value),
            startHour: parseInt(document.getElementById('edit-start').value),
            startMinute: 0,
            endHour: parseInt(document.getElementById('edit-end').value),
            endMinute: 0
        };

        window.dbSet(window.dbRef(window.db, 'eventConfig/dice'), newConfig)
            .then(() => {
                alert("✅ Đã cập nhật giờ sự kiện mới!");
                DICE_CONFIG = newConfig;
                updateStatusUI();
            })
            .catch((err) => alert("Lỗi: " + err));
    });
}

// Reset bảng xếp hạng
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm("Reset sạch bảng xếp hạng Xúc xắc?")) {
            window.dbRemove(window.dbRef(window.db, 'leaderboard')).then(() => {
                alert("Đã reset!");
                location.reload();
            });
        }
    });
}

// ============================================================
// 4. HIỂN THỊ ĐỒNG HỒ ĐẾM NGƯỢC (SIÊU TO)
// ============================================================
function updateStatusUI() {
    const statusEl = document.getElementById('timer-status');
    if (!statusEl) return;

    const now = new Date();
    statusEl.style.color = "#000";

    if (isDiceOpen()) {
        const endTime = new Date();
        endTime.setHours(DICE_CONFIG.endHour, DICE_CONFIG.endMinute || 0, 0);
        const diff = endTime - now;

        if (diff > 0) {
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

            statusEl.innerHTML = `
                <div style="font-size: 1rem; margin-bottom: 5px; opacity: 0.8;">🟢 ĐANG DIỄN RA - KẾT THÚC SAU:</div>
                <div style="font-size: 3.5rem; font-weight: 900; font-family: 'Courier New', monospace; line-height: 1;">
                    ${h}:${m}:${s}
                </div>
            `;
            statusEl.style.background = "#7cffb3";
            statusEl.style.padding = "20px 10px";
        } else {
            statusEl.innerText = "🔴 SỰ KIỆN VỪA KẾT THÚC!";
            statusEl.style.background = "#f79290";
            statusEl.style.padding = "15px";
        }
    } else {
        const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const openDay = days[DICE_CONFIG.dayOfWeek] || "Thứ 7";
        statusEl.innerHTML = `🔴 SỰ KIỆN ĐANG KHÓA <br> <span style="font-size: 1rem;">(Mở vào ${DICE_CONFIG.startHour}:00 ${openDay})</span>`;
        statusEl.style.background = "#f79290";
        statusEl.style.padding = "15px";
    }
}

// Cập nhật mỗi giây
setInterval(updateStatusUI, 1000);
updateStatusUI();