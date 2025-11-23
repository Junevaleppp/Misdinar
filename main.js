// =======================
// KONFIGURASI UMUM
// =======================

// GANTI URL INI SETELAH DEPLOY ULANG!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJuszgfw_HsusuNHd8PU3c6ymZWDXlFXmpGQwwwvRvdJpkaSOERJ3QE6ISET2xIFNKzA/exec";

// Maksimal misdinar per Misa
const MAX_PER_MASS = 8;

// Jam misa yang tersedia
const MASS_TIMES = [
  { value: "17.00", label: "Sabtu/Minggu 17.00" },
  { value: "06.00", label: "Minggu 06.00" },
  { value: "08.30", label: "Minggu 08.30" }
];

// LocalStorage key (Hanya satu key sekarang)
const MEMBER_SESSION_KEY = "barto_member_session";

// =======================
// HELPER SESSION
// =======================

function getMemberSession() {
  try {
    const raw = localStorage.getItem(MEMBER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setMemberSession(session) {
  if (!session) localStorage.removeItem(MEMBER_SESSION_KEY);
  else localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session));
}

function showMessage(elOrId, text, type) {
  const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.textContent = text;
  el.className = "form-message " + (type || "");
}

function populateMassTimes(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = "";
  MASS_TIMES.forEach((mt) => {
    const opt = document.createElement("option");
    opt.value = mt.value;
    opt.textContent = mt.label;
    select.appendChild(opt);
  });
}

// =======================
// NAVBAR LOGIC (BARU)
// =======================

function updateNavbar() {
  const session = getMemberSession();
  const navInner = document.querySelector(".nav-inner");
  
  // Bersihkan profil lama jika ada
  const oldProfile = document.getElementById("nav-user-profile");
  if (oldProfile) oldProfile.remove();

  // Handle Link Login
  const loginLink = document.querySelector('a[href="login.html"]');

  if (session) {
    // USER LOGIN
    if (loginLink) loginLink.style.display = "none";

    // Buat Profil
    const profileDiv = document.createElement("div");
    profileDiv.id = "nav-user-profile";
    profileDiv.className = "user-profile-nav";
    
    const roleLabel = session.role === 'pengurus' ? 'Pengurus' : 'Petugas';
    const roleClass = session.role === 'pengurus' ? 'badge-pengurus' : 'badge-petugas';

    let adminLinkHTML = "";
    if (session.role === 'pengurus') {
        adminLinkHTML = `<a href="admin.html" class="nav-admin-link">Admin Panel</a>`;
    }

    profileDiv.innerHTML = `
      <div class="user-info-text">
        <span class="user-name">${session.fullName}</span>
        <span class="user-meta">
           <span class="${roleClass}">${roleLabel}</span> • ${session.angkatan || '-'}
        </span>
      </div>
      <div class="user-actions">
        ${adminLinkHTML} 
        <button id="logout-btn-nav" class="btn-xs btn-outline">Logout</button>
      </div>
    `;
    navInner.appendChild(profileDiv);

    document.getElementById("logout-btn-nav").addEventListener("click", () => {
      if(confirm("Yakin ingin logout?")) {
        setMemberSession(null);
        window.location.href = "login.html";
      }
    });

  } else {
    // BELUM LOGIN
    if (loginLink) loginLink.style.display = "block";
  }
}

// =======================
// INIT
// =======================

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initYear();
  updateNavbar(); // Update navbar otomatis

  if (document.getElementById("user-login-form")) initUserLoginPage();
  if (document.getElementById("duty-form")) initDutyPage();
  if (document.getElementById("admin-logged-section")) initAdminPanel();
});

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!toggle || !navLinks) return;
  toggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

function initYear() {
  const els = document.querySelectorAll(".year-now");
  const year = new Date().getFullYear();
  els.forEach((el) => (el.textContent = year));
}

// =======================
// LOGIN PAGE
// =======================

function initUserLoginPage() {
  const form = document.getElementById("user-login-form");
  const msgEl = document.getElementById("user-login-message");

  // Jika sudah login, redirect
  const session = getMemberSession();
  if (session) {
     window.location.href = "index.html"; 
     return;
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();

      showMessage(msgEl, "Sedang masuk...", "");

      fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ mode: "memberLogin", username, password })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "ok") {
            setMemberSession(data.member);
            showMessage(msgEl, "Login berhasil!", "success");
            
            // Redirect sesuai role
            setTimeout(() => {
                if (data.member.role === 'pengurus') window.location.href = "admin.html";
                else window.location.href = "duties.html";
            }, 800);
          } else {
            showMessage(msgEl, data.message, "error");
          }
        })
        .catch((err) => showMessage(msgEl, "Gagal koneksi server.", "error"));
    });
  }
}

// =======================
// DUTY PAGE
// =======================

function initDutyPage() {
  const session = getMemberSession();
  const dutyContainer = document.querySelector(".duty-layout");
  const lockedMsg = document.getElementById("duty-locked-message");
  const infoEl = document.getElementById("duty-user-info");
  const msgEl = document.getElementById("duty-message");
  const form = document.getElementById("duty-form");

  // VALIDASI LOGIN
  if (!session) {
    if (dutyContainer) dutyContainer.style.display = "none";
    if (lockedMsg) lockedMsg.style.display = "block";
    return;
  } else {
    if (dutyContainer) dutyContainer.style.display = "grid";
    if (lockedMsg) lockedMsg.style.display = "none";
  }

  if (infoEl) {
    infoEl.textContent = `Halo, ${session.fullName}`;
  }

  populateMassTimes("mass-time-select");
  loadMemberHistory(session);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("duty-date").value;
      const massTime = document.getElementById("mass-time-select").value;

      if (!date || !massTime) {
        showMessage(msgEl, "Isi tanggal dan jam.", "error");
        return;
      }
      showMessage(msgEl, "Sedang mendaftar...", "");

      fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          mode: "registerDuty",
          memberId: session.id,
          memberName: session.fullName,
          angkatan: session.angkatan, 
          date,
          massTime
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "ok") {
            showMessage(msgEl, "Pendaftaran BERHASIL!", "success");
            loadMemberHistory(session);
          } else {
            showMessage(msgEl, data.message, "error");
          }
        })
        .catch((err) => showMessage(msgEl, "Gagal koneksi server.", "error"));
    });
  }
}

function loadMemberHistory(session) {
  const upcomingBody = document.getElementById("upcoming-body");
  const pastBody = document.getElementById("past-body");
  const totalEl = document.getElementById("history-total-count");
  if (!upcomingBody) return;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ mode: "getMemberHistory", memberId: session.id })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        if (totalEl) totalEl.textContent = data.totalAssignments;
        renderHistoryTable(data.duties, upcomingBody, pastBody, session);
      }
    });
}

function renderHistoryTable(duties, upBody, pastBody, session) {
  upBody.innerHTML = "";
  pastBody.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);

  duties.forEach((d) => {
    const isUpcoming = d.date >= today && d.status === "active";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.massTime}</td>
      <td>${d.status}</td>
      <td>${isUpcoming ? `<button onclick="cancelDuty('${d.id}')" class="btn-sm btn-ghost">Batal</button>` : ''}</td>
    `;
    (isUpcoming ? upBody : pastBody).appendChild(tr);
  });
}

window.cancelDuty = function(dutyId) {
  const session = getMemberSession();
  if (!confirm("Batalkan tugas ini?")) return;
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ mode: "cancelDuty", dutyId, memberId: session.id, memberName: session.fullName })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      alert("Tugas dibatalkan.");
      loadMemberHistory(session);
    } else alert(data.message);
  });
};

// =======================
// ADMIN PANEL
// =======================

function initAdminPanel() {
  const session = getMemberSession();
  const forbiddenMsg = document.getElementById("admin-forbidden");
  const adminSection = document.getElementById("admin-logged-section");

  // CEK ROLE
  if (!session || session.role !== 'pengurus') {
    if (adminSection) adminSection.style.display = "none";
    if (forbiddenMsg) {
         forbiddenMsg.style.display = "block";
         forbiddenMsg.innerHTML = `<h3>Akses Ditolak</h3><p>Halaman ini hanya untuk Pengurus. <a href="index.html">Kembali</a></p>`;
    } else {
         window.location.href = "login.html";
    }
    return;
  }

  // Jika Pengurus
  if(adminSection) adminSection.style.display = "block";
  document.getElementById("admin-name").textContent = session.fullName;
  
  loadAdminDashboard();

  document.querySelectorAll("[data-admin-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-admin-tab");
      document.querySelectorAll("[data-admin-view]").forEach(v => v.style.display = "none");
      document.querySelector(`[data-admin-view="${target}"]`).style.display = "block";
      
      if (target === "members") loadMembersView();
      if (target === "history") loadDutyHistoryView();
      if (target === "overview") loadMemberOverviewView();
      if (target === "activity") loadAdminActivityView();
    });
  });

  // CREATE MEMBER BARU
  const createForm = document.getElementById("create-member-form");
  if (createForm) {
    createForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = document.getElementById("new-fullname").value;
      const username = document.getElementById("new-username").value;
      const password = document.getElementById("new-password").value;
      const angkatan = document.getElementById("new-angkatan").value;
      const role = document.getElementById("new-role").value; // Input Role Baru

      fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          mode: "createMember",
          fullName, username, password, angkatan, role,
          adminUser: session.username
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === "ok") {
          alert("Akun berhasil dibuat!");
          createForm.reset();
          loadAdminDashboard();
        } else alert(data.message);
      });
    });
  }
}

function loadAdminDashboard() {
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "getStats" }) })
  .then(res => res.json())
  .then(data => {
    if(data.status==="ok"){
      document.getElementById("stat-total-members").textContent = data.totalMembers;
      document.getElementById("stat-total-month").textContent = data.totalDutiesThisMonth;
      document.getElementById("stat-total-canceled").textContent = data.totalCanceledThisMonth;
    }
  });
}

function loadMembersView() {
  const tbody = document.getElementById("members-body");
  tbody.innerHTML = "Loading...";
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "listMembers" }) })
    .then(res => res.json())
    .then(data => {
      tbody.innerHTML = "";
      data.members.forEach(m => {
        tbody.innerHTML += `
          <tr>
            <td>${m.fullName}</td>
            <td>${m.role}</td>
            <td>${m.username}</td>
            <td>${m.totalAssignments}</td>
            <td><button onclick="deleteMember('${m.id}')" class="btn-sm btn-primary">Hapus</button></td>
          </tr>
        `;
      });
    });
}

window.deleteMember = function(id) {
  const s = getMemberSession();
  if(!confirm("Hapus user ini?")) return;
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "deleteMember", memberId: id, adminUser: s.username }) })
    .then(res => res.json())
    .then(d => { if(d.status==="ok") loadMembersView(); else alert(d.message); });
}

function loadDutyHistoryView() {
  const tbody = document.getElementById("history-body");
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "listDuties" }) })
    .then(res => res.json())
    .then(data => {
      tbody.innerHTML = "";
      data.duties.forEach(d => {
        tbody.innerHTML += `
          <tr><td>${d.date}</td><td>${d.massTime}</td><td>${d.memberName}</td><td>${d.status}</td><td>${d.createdAt}</td></tr>
        `;
      });
    });
}

function loadMemberOverviewView() {
  const tbody = document.getElementById("overview-body");
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "getMemberOverview" }) })
    .then(res => res.json())
    .then(data => {
      tbody.innerHTML = "";
      data.overview.forEach(o => {
        tbody.innerHTML += `<tr><td>${o.fullName}</td><td>${o.angkatan||'-'}</td><td>${o.role}</td><td>${o.totalAssignments}</td></tr>`;
      });
    });
}

function loadAdminActivityView() {
  const tbody = document.getElementById("activity-body");
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ mode: "listAdminActivity" }) })
    .then(res => res.json())
    .then(data => {
      tbody.innerHTML = "";
      data.activities.forEach(a => {
        tbody.innerHTML += `<tr><td>${a.timestamp}</td><td>${a.type}</td><td>${a.actor}</td><td>${a.description}</td></tr>`;
      });
    });
}

window.exportHistoryCsv = function() {
  window.open(`${SCRIPT_URL}?mode=exportHistory`, "_blank");
}