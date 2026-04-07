// 1. CẤU HÌNH BIẾN TOÀN CỤC
let WHEEL_CONFIG = { dayOfMonth: 30, startHour: 20, startMinute: 0, endHour: 21, endMinute: 0 };

function listenWheelConfig() {
    if (window.db) {
        window.dbOnValue(window.dbRef(window.db, 'eventConfig/wheel'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                WHEEL_CONFIG = data;
                updateStatusUI();
                
                // Điền dữ liệu vào Admin
                if(document.getElementById('edit-date-month')) {
                    document.getElementById('edit-date-month').value = data.dayOfMonth;
                    document.getElementById('edit-start').value = data.startHour;
                    document.getElementById('edit-end').value = data.endHour;
                }
            }
        });
    }
}
listenWheelConfig();

// 2. KIỂM TRA MỞ CỬA (FIXED)
function isWheelOpen() {
    if (!WHEEL_CONFIG) return false;

    const now = new Date();
    const currentDate = now.getDate(); // Ngày hiện tại (1-31)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Kiểm tra đúng ngày trong tháng (Ví dụ: Ngày 30)
    if (currentDate !== parseInt(WHEEL_CONFIG.dayOfMonth)) return false; 

    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = (WHEEL_CONFIG.startHour || 0) * 60;
    const endTimeInMinutes = (WHEEL_CONFIG.endHour || 0) * 60;

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
}

// ========================================================
// LOGIC VÒNG QUAY
// ========================================================
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultText = document.getElementById('result-text');
const nameInput = document.getElementById('username');
const historyBody = document.getElementById('history-body');

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
    // Lắng nghe lịch sử
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

    // Nút quay (Đã fix lỗi lặp listener)
    spinBtn.addEventListener('click', function() {
        if (!isWheelOpen()) {
            alert("Sự kiện tháng hiện đang đóng!");
            return;
        }

        const name = nameInput.value.trim().toUpperCase();
        if (!name) return alert("Vui lòng nhập tên Ingame!");

        spinBtn.disabled = true;

        // Dùng dbGet (hoặc dbOnValue với onlyOnce) để check trùng
        const historyRef = window.dbRef(window.db, 'wheelHistory');
        window.dbOnValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            let hasPlayed = false;
            if (data) {
                hasPlayed = Object.values(data).some(item => item.name && item.name.toUpperCase() === name);
            }

            if (hasPlayed) {
                alert("Bạn đã tham gia quay tháng này rồi!");
                spinBtn.disabled = false;
            } else {
                startSpinAction(name); 
            }
        }, { onlyOnce: true });
    });
}

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

// 3. ADMIN & CẬP NHẬT GIAO DIỆN
const ADMIN_PIN = "171102"; 
window.addEventListener('keydown', (e) => {
    if (e.key === '?') { 
        if (prompt("Nhập PIN Admin:") === ADMIN_PIN) {
            const modal = document.getElementById('admin-modal');
            if (modal) modal.style.display = 'flex';
        }
    }
});

const saveBtn = document.getElementById('save-config-btn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const newConfig = {
            dayOfMonth: parseInt(document.getElementById('edit-date-month').value),
            startHour: parseInt(document.getElementById('edit-start').value),
            startMinute: 0,
            endHour: parseInt(document.getElementById('edit-end').value),
            endMinute: 0
        };
        
        if (isNaN(newConfig.dayOfMonth)) return alert("Vui lòng nhập ngày!");

        window.dbSet(window.dbRef(window.db, 'eventConfig/wheel'), newConfig)
            .then(() => {
                alert("✅ Đã cập nhật! Sự kiện sẽ mở vào ngày " + newConfig.dayOfMonth + " hàng tháng.");
                WHEEL_CONFIG = newConfig;
                updateStatusUI();
            })
            .catch(err => alert("Lỗi: " + err));
    });
}
// Thêm sự kiện đóng Modal cho nút Close
const closeBtn = document.getElementById('close-modal');
if(closeBtn) {
    closeBtn.addEventListener('click', () => {
        document.getElementById('admin-modal').style.display = 'none';
    });
}

// Thêm sự kiện Reset cho Vòng Quay
const confirmReset = document.getElementById('confirm-reset');
if(confirmReset) {
    confirmReset.addEventListener('click', () => {
        if(confirm("Bạn có chắc muốn xóa sạch lịch sử vòng quay?")) {
            window.dbRemove(window.dbRef(window.db, 'wheelHistory')).then(() => {
                alert("Đã reset!");
                location.reload();
            });
        }
    });
}

function updateStatusUI() {
    const statusEl = document.getElementById('timer-status');
    if (!statusEl) return;

    const now = new Date();
    statusEl.style.color = "#000";

    if (isWheelOpen()) {
        const endTime = new Date();
        endTime.setHours(WHEEL_CONFIG.endHour, WHEEL_CONFIG.endMinute || 0, 0);
        const diff = endTime - now;

        if (diff > 0) {
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

            statusEl.innerHTML = `
                <div style="font-size: 1rem; opacity: 0.8;">🟢 ĐANG DIỄN RA - KẾT THÚC SAU:</div>
                <div style="font-size: 3.5rem; font-weight: 900; font-family: monospace; line-height: 1;">
                    ${h}:${m}:${s}
                </div>
            `;
            statusEl.style.background = "#7cffb3";
            statusEl.style.padding = "20px 10px";
        } else {
            statusEl.innerText = "🔴 SỰ KIỆN VỪA KẾT THÚC!";
            statusEl.style.background = "#f79290";
        }
    } else {
        statusEl.innerHTML = `🔴 SỰ KIỆN ĐANG KHÓA <br> <span style="font-size: 0.9rem;">(Mở vào ${WHEEL_CONFIG.startHour}:00 Ngày ${WHEEL_CONFIG.dayOfMonth || WHEEL_CONFIG.dayOfWeek} Hàng Tháng)</span>`;
        statusEl.style.background = "#f79290";
        statusEl.style.padding = "15px";
    }
}

// Khởi tạo
if (window.db) initGame();
else window.addEventListener('firebase-ready', initGame);

setInterval(updateStatusUI, 1000);
updateStatusUI();
drawWheel();