// 🔐 AUTH SYSTEM

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

function updateNavbar() {
  const navAuth = document.getElementById("nav-auth");

  const token = getToken();
  const user = getUser();

  if (token && user) {
    navAuth.innerHTML = `
      <span style="color:#f4c430;font-weight:bold;margin-right:15px">
        👋 ${user.name}
      </span>
      <button onclick="logout()" class="nav-btn">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `
      <button onclick="window.location.href='login.html'" class="nav-btn">
        Login
      </button>
      <button onclick="window.location.href='register.html'" class="nav-btn">
        Register
      </button>
    `;
  }
}

document.addEventListener("DOMContentLoaded", updateNavbar);
