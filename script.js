// Biến lưu trữ giờ hiện tại (mặc định là Thứ 7, 20h-21h)
let EVENT_CONFIG = { dayOfWeek: 6, startHour: 20, startMinute: 0, endHour: 21, endMinute: 0 };

// Lắng nghe thay đổi từ Firebase
if (window.db) {
    window.dbOnValue(window.dbRef(window.db, 'eventConfig'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            EVENT_CONFIG = data; // Cập nhật biến global
            
            // Tự động điền lại vào ô input trong Admin Modal cho bạn dễ nhìn
            if(document.getElementById('edit-day')) {
                document.getElementById('edit-day').value = data.dayOfWeek;
                document.getElementById('edit-start').value = data.startHour;
                document.getElementById('edit-end').value = data.endHour;
            }
            // Cập nhật dòng trạng thái 🟢/🔴 ngay lập tức
            if (typeof updateStatusUI === "function") updateStatusUI();
        }
    });
}

// Hàm kiểm tra trạng thái mở cửa
function isEventOpen() {
    // 1. Kiểm tra an toàn: Nếu EVENT_CONFIG chưa có dữ liệu từ Firebase thì mặc định là đóng
    if (!EVENT_CONFIG) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 2. Kiểm tra đúng ngày (Ví dụ: Thứ 7)
    if (currentDay !== EVENT_CONFIG.dayOfWeek) return false;

    // 3. Quy đổi mọi thứ ra phút để so sánh cho chính xác tuyệt đối
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Lưu ý: Thêm dấu || 0 để phòng hờ trường hợp Admin nhập thiếu Start/End Minute
    const startTimeInMinutes = (EVENT_CONFIG.startHour || 0) * 60 + (EVENT_CONFIG.startMinute || 0);
    const endTimeInMinutes = (EVENT_CONFIG.endHour || 0) * 60 + (EVENT_CONFIG.endMinute || 0);

    // 4. Trả về kết quả: Hiện tại có nằm trong khoảng [Bắt đầu, Kết thúc) không?
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
    if (e.key === '?') { // Phím tắt mở Admin
        if (prompt("PIN Admin:") === ADMIN_PIN) {
            // Đối với trang Xúc xắc dùng .classList.toggle('hidden')
            const adminPanel = document.getElementById('admin-panel');
            if (adminPanel) adminPanel.classList.toggle('hidden');
            
            // Đối với trang Vòng quay dùng .style.display
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) adminModal.style.display = 'flex';
        }
    }
});

const saveBtn = document.getElementById('save-config-btn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const newConfig = {
            dayOfWeek: parseInt(document.getElementById('edit-day').value),
            startHour: parseInt(document.getElementById('edit-start').value),
            startMinute: 0, // BẮT BUỘC THÊM
            endHour: parseInt(document.getElementById('edit-end').value),
            endMinute: 0    // BẮT BUỘC THÊM
        };

        window.dbSet(window.dbRef(window.db, 'eventConfig'), newConfig)
            .then(() => {
                alert("✅ Đã cập nhật giờ sự kiện mới!");
                EVENT_CONFIG = newConfig; // Cập nhật biến tạm ngay lập tức
                updateStatusUI();        // Cập nhật đèn Xanh/Đỏ ngay
            })
            .catch((err) => alert("Lỗi: " + err));
    });
}

// Logic Reset (Giữ nguyên của bạn là đúng rồi)
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm("Reset sạch bảng xếp hạng trên Internet?")) {
            // Lưu ý: trang Xúc xắc là 'leaderboard', trang Vòng quay là 'wheelHistory'
            // Bạn nên check trang nào để remove đúng nhánh đó
            const path = window.location.pathname.includes('vongquay') ? 'wheelHistory' : 'leaderboard';
            window.dbRemove(window.dbRef(window.db, path)).then(() => {
                alert("Đã reset!");
                location.reload();
            });
        }
    });
}

//
function updateStatusUI() {
    const statusEl = document.getElementById('timer-status');
    if (!statusEl) return;

    // Ép chữ luôn màu đen cho rõ trên nền sáng
    statusEl.style.color = "#000"; 

    if (isEventOpen()) {
        statusEl.innerText = "🟢 SỰ KIỆN ĐANG DIỄN RA - QUAY NGAY!";
        statusEl.style.background = "#7cffb3"; // Màu xanh sáng
    } else {
        // Tạo mảng tên thứ để hiện cho đúng cấu hình Admin
        const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const openDay = days[EVENT_CONFIG.dayOfWeek] || "Thứ 7";
        
        statusEl.innerText = `🔴 SỰ KIỆN ĐANG KHÓA (Mở vào ${EVENT_CONFIG.startHour}:00 ${openDay})`;
        statusEl.style.background = "#f79290"; // Màu đỏ nhạt
    }
}

// Chạy cập nhật mỗi phút
setInterval(updateStatusUI, 60000);
updateStatusUI();