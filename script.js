// ⚡ ใส่ IP ของ ESP32 ที่ Serial Monitor แสดง
const wss = new WebSocket("ws://172.20.10.12:81"); 

// ขอสิทธิ์การแจ้งเตือน
if ('Notification' in window) {
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}

// ตัวแปรเก็บสถานะเดิม
let previousFullStatus = false;

// ฟังก์ชันส่งการแจ้งเตือน
function sendNotification(title, message, icon = '🚗') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`),
      badge: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚗</text></svg>`),
      tag: 'parking-notification',
      requireInteraction: true
    });
  }
}

wss.onopen = () => {
  console.log("Connected to ESP32");
  document.getElementById("status").textContent = "เชื่อมต่อกับระบบสำเร็จ";
};

wss.onerror = (error) => {
  console.error("WebSocket Error:", error);
  document.getElementById("status").textContent = "ไม่สามารถเชื่อมต่อกับระบบ";
};

wss.onclose = () => {
  console.warn("WebSocket Closed");
  document.getElementById("status").textContent = "การเชื่อมต่อถูกปิด";
};

wss.onmessage = (event) => {
  console.log("Data from ESP32:", event.data);
  const data = JSON.parse(event.data);

  // Update parking spots display with enhanced animations
  const container = document.getElementById("spots");
  const existingSpots = container.querySelectorAll('.parking-spot');
  
  let totalSpots = 5;
  let occupiedSpots = 0;

  // If first time loading, create spots with staggered animation
  if (existingSpots.length === 0) {
    container.innerHTML = "";
    
    for (let i = 1; i <= totalSpots; i++) {
      const div = document.createElement("div");
      const isOccupied = data["spot"+i];
      
      div.className = "parking-spot";
      div.style.opacity = '0';
      div.style.transform = 'translateY(20px) scale(0.8)';
      div.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      
      if (isOccupied) {
        occupiedSpots++;
        div.classList.add('occupied');
        div.innerHTML = `
          <div class="spot-header">
            <span class="spot-number">${i}</span>
            <div class="car-icon">🚗</div>
          </div>
          <div class="spot-status-container">
            <span class="spot-status occupied">เต็ม</span>
            <div class="pulse-indicator occupied"></div>
          </div>
          <div class="spot-details">
            <small>มีรถจอด</small>
          </div>
        `;
      } else {
        div.classList.add('available');
        div.innerHTML = `
          <div class="spot-header">
            <span class="spot-number">${i}</span>
            <div class="parking-icon">🅿️</div>
          </div>
          <div class="spot-status-container">
            <span class="spot-status available">ว่าง</span>
            <div class="pulse-indicator available"></div>
          </div>
          <div class="spot-details">
            <small>พร้อมใช้งาน</small>
          </div>
        `;
      }
      
      container.appendChild(div);
      
      // Staggered animation
      setTimeout(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0) scale(1)';
      }, i * 150);
    }
  } else {
    // Update existing spots with smooth transitions
    for (let i = 1; i <= totalSpots; i++) {
      const spot = existingSpots[i-1];
      const isOccupied = data["spot"+i];
      const wasOccupied = spot.classList.contains('occupied');
      
      if (isOccupied) occupiedSpots++;
      
      // Only update if status changed
      if (isOccupied !== wasOccupied) {
        // ส่งการแจ้งเตือนเมื่อช่องจอดเต็ม
        if (isOccupied && !wasOccupied) {
          sendNotification(
            '🚗 ช่องจอดเต็ม!',
            `ช่องจอดที่ ${i} มีรถจอดแล้ว`,
            '🚗'
          );
        }
        
        // ส่งการแจ้งเตือนเมื่อช่องจอดว่าง
        if (!isOccupied && wasOccupied) {
          sendNotification(
            '✅ ช่องจอดว่าง!',
            `ช่องจอดที่ ${i} ว่างแล้ว`,
            '✅'
          );
        }
        
        // Add change animation
        spot.style.transform = 'scale(1.1)';
        spot.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          spot.className = `parking-spot ${isOccupied ? 'occupied' : 'available'}`;
          
          if (isOccupied) {
            spot.innerHTML = `
              <div class="spot-header">
                <span class="spot-number">${i}</span>
                <div class="car-icon">🚗</div>
              </div>
              <div class="spot-status-container">
                <span class="spot-status occupied">เต็ม</span>
                <div class="pulse-indicator occupied"></div>
              </div>
              <div class="spot-details">
                <small>มีรถจอด</small>
              </div>
            `;
          } else {
            spot.innerHTML = `
              <div class="spot-header">
                <span class="spot-number">${i}</span>
                <div class="parking-icon">🅿️</div>
              </div>
              <div class="spot-status-container">
                <span class="spot-status available">ว่าง</span>
                <div class="pulse-indicator available"></div>
              </div>
              <div class="spot-details">
                <small>พร้อมใช้งาน</small>
              </div>
            `;
          }
          
          spot.style.transform = 'scale(1)';
        }, 150);
      }
    }
  }

  // Update stats
  document.getElementById("totalSpots").textContent = totalSpots;
  document.getElementById("freeSpots").textContent = totalSpots - occupiedSpots;
  document.getElementById("occupiedSpots").textContent = occupiedSpots;
  
  // แจ้งเตือนเมื่อช่องจอดเต็มทั้งหมด (ไม่ซ้ำ)
  const isCurrentlyFull = occupiedSpots === totalSpots;
  if (isCurrentlyFull && !previousFullStatus) {
    sendNotification(
      '🚫 ช่องจอดเต็มทั้งหมด!',
      'ไม่มีช่องจอดว่างแล้ว กรุณาหาที่จอดอื่น',
      '🚫'
    );
  }
  
  // แจ้งเตือนเมื่อมีช่องจอดว่างหลังจากเต็ม
  if (!isCurrentlyFull && previousFullStatus) {
    sendNotification(
      '🎉 มีช่องจอดว่างแล้ว!',
      `ตอนนี้มีช่องจอดว่าง ${totalSpots - occupiedSpots} ช่อง`,
      '🎉'
    );
  }
  
  previousFullStatus = isCurrentlyFull;
  

};

// Fallback: Show demo data if WebSocket fails
setTimeout(() => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.log("🔄 Using demo data...");
    
    const demoData = {
      "spot1": false,
      "spot2": true,
      "spot3": false,
      "spot4": true,
      "spot5": false
    };
   
    // Simulate receiving data
    const event = { data: JSON.stringify(demoData) };
    ws.onmessage(event);
    
    document.getElementById("status").textContent = "🔄 แสดงข้อมูลตัวอย่าง (ไม่ได้เชื่อมต่อกับ ESP32)";
  }
}, 3000);

// Page transition control
window.addEventListener('load', function() {
  const transition = document.getElementById('pageTransition');
  setTimeout(() => {
    transition.classList.add('fade-out');
  }, 100);
});

// Handle navigation with smooth transition
document.addEventListener('DOMContentLoaded', function() {
  const homeLink = document.querySelector('a[href="index.html"]');
  if (homeLink) {
    homeLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Add fade out effect to current content
      const mainContainer = document.querySelector('.main-container');
      const navbar = document.querySelector('.navbar');
      
      mainContainer.style.transition = 'all 0.8s ease-out';
      navbar.style.transition = 'all 0.8s ease-out';
      
      mainContainer.style.opacity = '0';
      mainContainer.style.transform = 'translateY(-20px) scale(0.98)';
      navbar.style.opacity = '0';
      navbar.style.transform = 'translateY(-10px)';
      
      // Show transition overlay
      const transition = document.getElementById('pageTransition');
      transition.classList.remove('fade-out');
      transition.style.opacity = '1';
      transition.style.background = '#000000';
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    });
  }
});
