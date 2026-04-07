let EVENT_CONFIG = { dayOfWeek: 6, startHour: 20, startMinute: 0, endHour: 21, endMinute: 0 };
// Hàm lắng nghe cấu hình từ Firebase (Để admin đổi là web dân cư đổi theo luôn)
function listenEventConfig() {
    window.dbOnValue(window.dbRef(window.db, 'eventConfig'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            EVENT_CONFIG = data;
            // Cập nhật lại giao diện thông báo ngay khi giờ thay đổi
            if (typeof updateStatusUI === "function") updateStatusUI();
            
            // Nếu đang mở Admin Panel thì điền sẵn số vào ô nhập
            if(document.getElementById('edit-day')) {
                document.getElementById('edit-day').value = data.dayOfWeek;
                document.getElementById('edit-start').value = data.startHour;
                document.getElementById('edit-end').value = data.endHour;
            }
        }
    });
}
listenEventConfig();

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


//========================================================
//========================================================
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultText = document.getElementById('result-text');
const nameInput = document.getElementById('username');
const historyBody = document.getElementById('history-body');

// 1. DỮ LIỆU PHẦN THƯỞNG
const prizes = [
    { text: "2000 GOLD", color: "#FF1493", chance: 1 },
    { text: "50 Mảnh B2", color: "#4B0082", chance: 17 },
    { text: "1000 GOLD", color: "#FFD700", chance: 4 },
    { text: "300 GOLD", color: "#00FF7F", chance: 17 },
    { text: "1500 GOLD", color: "#FF4500", chance: 2 },
    { text: "500K NGỌC", color: "#1E90FF", chance: 17 },
    { text: "1.5M NGỌC", color: "#FFB6C1", chance: 12 },
    { text: "500 GOLD", color: "#20B2AA", chance: 10 },
    { text: "1M NGỌC", color: "#2F4F4F", chance: 10 },
    { text: "2M NGỌC", color: "#FF8C00", chance: 10 }
];

let startAngle = 0;
canvas.width = 500;
canvas.height = 500;
const centerX = 250;
const centerY = 250;
const radius = 240;

// 2. VẼ VÒNG QUAY
function drawWheel() {
    let currentAngle = startAngle;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prizes.forEach((p) => {
        const segAngle = (p.chance / 100) * (Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segAngle, false);
        ctx.lineTo(centerX, centerY);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = 'bold 14px Arial';
        ctx.translate(centerX, centerY);
        ctx.rotate(currentAngle + segAngle / 2);
        ctx.translate(radius * 0.55, 0); 
        ctx.fillText(p.text, 0, 5); 
        ctx.restore();
        currentAngle += segAngle;
    });
}

function initGame() {
    // 3. LẮNG NGHE LỊCH SỬ TỪ FIREBASE
    window.dbOnValue(window.dbRef(window.db, 'wheelHistory'), (snapshot) => {
        const data = snapshot.val();
        if (!historyBody) return;
        historyBody.innerHTML = "";
        if (data) {
            const list = Object.values(data).reverse();
            historyBody.innerHTML = list.map(i => `
                <tr>
                    <td style="color: #888; font-size: 0.8rem;">${i.time}</td>
                    <td style="color: #fffa65; font-weight: bold;">${i.name}</td>
                    <td style="color: #fff; font-weight: bold;">${i.prize}</td>
                </tr>
            `).join('');
        } else {
            historyBody.innerHTML = "<tr><td colspan='3'>Chưa có lượt quay nào!</td></tr>";
        }
    });

    // 4. LOGIC QUAY & LƯU FIREBASE
    spinBtn.addEventListener('click', function() {
        if (!isEventOpen()) {
        alert("Thời gian Event kết thúc, vòng quay đã được khóa!");
        return;
    }

        const name = nameInput.value.trim().toUpperCase();
        if (!name) return alert("Vui lòng nhập tên Ingame!");

        spinBtn.disabled = true;

        window.dbOnValue(window.dbRef(window.db, 'wheelHistory'), (snapshot) => {
            const data = snapshot.val();
            let hasPlayed = false;
            if (data) {
                hasPlayed = Object.values(data).some(item => item.name && item.name.toUpperCase() === name);
            }

            if (hasPlayed) {
                alert("Nhân vật này đã tham gia quay tuần này rồi!");
                spinBtn.disabled = false;
            } else {
                startSpinAction(name); // Gọi hàm quay
            }
        }, { onlyOnce: true });
    });
}

// HÀM QUAY - PHẦN BẠN BỊ THIẾU
function startSpinAction(name) {
    nameInput.disabled = true;
    resultText.innerText = "Đang quay...";

    let r = Math.random() * 100;
    let acc = 0;
    let winIdx = prizes.length - 1;
    for (let i = 0; i < prizes.length; i++) {
        acc += prizes[i].chance;
        if (r <= acc) { winIdx = i; break; }
    }

    const rotations = 10;
    let angleBeforeWin = 0;
    for(let i = 0; i < winIdx; i++) {
        angleBeforeWin += (prizes[i].chance / 100) * 2 * Math.PI;
    }
    const prizeArc = (prizes[winIdx].chance / 100) * 2 * Math.PI;
    const finalAngle = (Math.PI * 1.5) - angleBeforeWin - (prizeArc / 2);
    const totalRotation = (rotations * 2 * Math.PI) + (finalAngle - (startAngle % (2 * Math.PI)));

    let startTimestamp = null;
    const duration = 5000;
    const initialAngle = startAngle;

    function animate(now) {
        if (!startTimestamp) startTimestamp = now;
        let elapsed = now - startTimestamp;
        let progress = Math.min(elapsed / duration, 1);
        let ease = 1 - Math.pow(1 - progress, 4);
        startAngle = initialAngle + (totalRotation * ease);
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            const resultValue = prizes[winIdx].text;
            resultText.innerHTML = `<span style="color:#fffa65">🎁 TRÚNG:</span> ${resultValue}`;
            
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            window.dbPush(window.dbRef(window.db, 'wheelHistory'), {
                name: name,
                prize: resultValue,
                time: timeStr
            });
            
            spinBtn.disabled = false;
            nameInput.disabled = false;
        }
    }
    requestAnimationFrame(animate);
}

// KHỞI CHẠY
if (window.db) {
    initGame();
} else {
    window.addEventListener('firebase-ready', initGame);
}

// 5. ADMIN RESET
const ADMIN_PIN = "171102"; 

window.addEventListener('keydown', (e) => {
    if (e.key === '?') { 
        if (prompt("Nhập PIN Admin:") === ADMIN_PIN) {
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) adminModal.style.display = 'flex';
        }
    }
});
// Thêm vào sau khi Admin đã đăng nhập thành công
const saveBtn = document.getElementById('save-config-btn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const newConfig = {
            dayOfWeek: parseInt(document.getElementById('edit-day').value),
            startHour: parseInt(document.getElementById('edit-start').value),
            startMinute: 0, // Thêm mặc định là 0
            endHour: parseInt(document.getElementById('edit-end').value),
            endMinute: 0   // Thêm mặc định là 0
        };

        window.dbSet(window.dbRef(window.db, 'eventConfig'), newConfig)
            .then(() => {
                alert("Đã cập nhật giờ sự kiện mới!");
                // Cập nhật biến cục bộ ngay lập tức để Admin thấy kết quả luôn
                EVENT_CONFIG = newConfig;
                updateStatusUI();
            })
            .catch((err) => alert("Lỗi: " + err));
    });
}

const confirmResetBtn = document.getElementById('confirm-reset');
if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
        if (confirm("Reset toàn bộ lịch sử?")) {
            window.dbRemove(window.dbRef(window.db, 'wheelHistory')).then(() => {
                alert("Đã reset!");
                location.reload();
            });
        }
    });
}

const closeModalBtn = document.getElementById('close-modal');
if (closeModalBtn) {
    closeModalBtn.onclick = () => {
        document.getElementById('admin-modal').style.display = 'none';
    };
}

(function displayPrizeList() {
    const list = document.getElementById('prize-list-display');
    if (!list) return;
    list.innerHTML = prizes.map(p => `
        <li style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="color: #fff;">${p.text}</span>
            <span style="color: #fffa65; font-weight: bold;">${p.chance}%</span>
        </li>
    `).join('');
})();

drawWheel();

//
function updateStatusUI() {
    const statusEl = document.getElementById('timer-status');
    if (!statusEl) return;

    const now = new Date();
    
    // Ép chữ đen cho dễ đọc
    statusEl.style.color = "#000";

    if (isEventOpen()) {
        // --- LOGIC TÍNH ĐẾM NGƯỢC ---
        const endTime = new Date();
        endTime.setHours(EVENT_CONFIG.endHour, EVENT_CONFIG.endMinute || 0, 0);

        const diff = endTime - now; // Khoảng cách thời gian (miliseconds)

        if (diff > 0) {
            statusEl.innerHTML = `
                <div style="font-size: 0.9rem; margin-bottom: 3px;">🟢 ĐANG DIỄN RA</div>
                <div style="font-size: 1.8rem; font-weight: 800; letter-spacing: 1px;">
                    KẾT THÚC SAU: <span style="font-family: 'Courier New', monospace;">${h}:${m}:${s}</span>
                </div>
            `;
            statusEl.style.background = "#7cffb3";
            statusEl.style.padding = "15px"; // Thêm chút đệm cho khung to ra

        } else {
            statusEl.innerText = "🔴 SỰ KIỆN VỪA KẾT THÚC!";
            statusEl.style.background = "#f79290";
        }
    } else {
        // --- TRẠNG THÁI ĐANG KHÓA ---
        const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const openDay = days[EVENT_CONFIG.dayOfWeek] || "Thứ 7";
        statusEl.innerText = `🔴 SỰ KIỆN ĐANG KHÓA (Mở vào ${EVENT_CONFIG.startHour}:00 ${openDay})`;
        statusEl.style.background = "#f79290";
    }
}

// Chạy cập nhật mỗi phút
setInterval(updateStatusUI, 1000);
updateStatusUI();
