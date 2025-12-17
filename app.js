document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCommonFeatures();

    // Page Specific Initializations
    if (document.getElementById('historia-page')) loadTextContent();
    if (document.getElementById('planes-page')) loadTextContent();
    if (document.querySelector('.gallery')) initGallery();
    if (document.getElementById('mensajes-page')) initMessages();
    if (document.getElementById('anniversary-countdown')) updateCountdown();

    // Check server health on all pages
    checkServerHealth();
});

// --- Dynamic Navigation ---
function initNavigation() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (!navPlaceholder) return;

    const navHTML = `
    <nav>
        <button class="menu-toggle" id="menu-toggle" aria-label="Abrir menú">☰</button>
        <ul id="nav-ul">
            <li><a href="index.html"><i class="fa-solid fa-house"></i> Inicio</a></li>
            <li><a href="historia.html"><i class="fa-solid fa-book-open"></i> Historia</a></li>
            <li><a href="momentos.html"><i class="fa-solid fa-images"></i> Momentos</a></li>
            <li><a href="calendario.html"><i class="fa-regular fa-calendar-check"></i> Calendario</a></li>
            <li><a href="planes.html"><i class="fa-solid fa-plane"></i> Planes</a></li>
            <li><a href="mensajes.html"><i class="fa-solid fa-envelope"></i> Mensajes</a></li>
            <li id="login-nav-item"><a href="login.html" id="login-nav-btn"><i class="fa-solid fa-user"></i> Iniciar Sesión</a></li>
            <li id="user-status" style="display:none;">
                <span id="user-name"></span>
                <button id="admin-panel-btn"><i class="fa-solid fa-gear"></i></button>
                <button id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i></button>
            </li>
        </ul>
    </nav>
    <div class="menu-overlay"></div>
    `;

    navPlaceholder.innerHTML = navHTML;
    highlightActiveLink();
    initMobileMenu();
    checkLoginStatus();
}

function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('nav ul li a');
    links.forEach(link => {
        // Simple check: if href matches current page filename
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navUl = document.getElementById('nav-ul');
    const overlay = document.querySelector('.menu-overlay');

    if (!menuToggle || !navUl) return;

    function toggleMenu() {
        navUl.classList.toggle('active');
        menuToggle.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = navUl.classList.contains('active') ? 'hidden' : '';
    }

    menuToggle.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);
}

// --- Common Features (Stats, Dark Mode, etc) ---
function initCommonFeatures() {
    // Dark Mode
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }

        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark ? 'enabled' : '');
            darkModeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // Admin Modal Logic (if present or injected)
    // Note: admin-modal is currently in index.html, but not others. 
    // Ideally it should be injected too or present in all pages. 
    // For now, allow it to fail gracefully if missing.
    const adminModal = document.getElementById('admin-modal');
    if (adminModal) {
        const closeBtn = document.getElementById('close-admin-modal');

        // Delegated listener for admin button in nav
        document.addEventListener('click', (e) => {
            if (e.target.closest('#admin-panel-btn')) {
                loadAdminContent();
                adminModal.style.display = 'block';
            }
        });

        if (closeBtn) closeBtn.onclick = () => adminModal.style.display = 'none';
        window.onclick = (e) => { if (e.target == adminModal) adminModal.style.display = 'none'; };

        const saveHistoria = document.getElementById('save-historia');
        const savePlanes = document.getElementById('save-planes');
        if (saveHistoria) saveHistoria.onclick = () => saveData('historia', document.getElementById('historia-text-admin').value);
        if (savePlanes) savePlanes.onclick = () => saveData('planes', document.getElementById('planes-text-admin').value);

        const uploadBtn = document.getElementById('upload-image-btn-admin');
        if (uploadBtn) uploadBtn.addEventListener('click', () => handleImageUpload(document.getElementById('admin-upload-image')));
    }

    // Logout Logic
    document.addEventListener('click', (e) => {
        if (e.target.closest('#logout-btn')) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            location.reload();
        }
    });

    // Heart Particles
    const heartParticles = document.querySelector('.heart-particles');
    if (heartParticles) {
        setInterval(() => {
            const heart = document.createElement('div');
            heart.classList.add('heart-particle');
            heart.innerHTML = '♡';
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.animationDuration = Math.random() * 5 + 5 + 's';
            heartParticles.appendChild(heart);
            setTimeout(() => heart.remove(), 10000);
        }, 1000);
    }
}

// --- Content Loading ---
const defaultContent = {
    historia: `Nuestra historia comenzó el 20 de septiembre de 2025...`,
    planes: `Nuestros sueños están llenos de planes increíbles...`
};

async function loadTextContent() {
    try {
        const response = await fetch(`/api/content`);
        const contents = response.ok ? await response.json() : [];

        const hText = document.getElementById('historia-text');
        const pText = document.getElementById('planes-text');

        if (hText) hText.textContent = contents.find(c => c.section === 'historia')?.text || defaultContent.historia;
        if (pText) pText.textContent = contents.find(c => c.section === 'planes')?.text || defaultContent.planes;
    } catch (e) { console.error('Error loading content', e); }
}

async function loadAdminContent() {
    try {
        const res = await fetch(`/api/content`);
        const contents = await res.json();
        const hInput = document.getElementById('historia-text-admin');
        const pInput = document.getElementById('planes-text-admin');
        if (hInput) hInput.value = contents.find(c => c.section === 'historia')?.text || defaultContent.historia;
        if (pInput) pInput.value = contents.find(c => c.section === 'planes')?.text || defaultContent.planes;
    } catch (e) { console.error(e); }
}

async function saveData(section, text) {
    const token = localStorage.getItem('token');
    if (!token) return alert('Sesión expirada');

    await fetch(`/api/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ section, text })
    });
    alert('Guardado!');
    loadTextContent();
    document.getElementById('admin-modal').style.display = 'none';
}

// --- Gallery Logic ---
async function initGallery() {
    await loadImages();
    const uploadInput = document.getElementById('upload-image');
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => handleImageUpload(e.target));
    }
}

async function loadImages() {
    try {
        const res = await fetch(`/api/images`);
        if (!res.ok) return;
        const images = await res.json();
        const sliderContainer = document.getElementById('slider-container');
        if (!sliderContainer) return;

        sliderContainer.innerHTML = '';
        images.forEach(img => {
            const slide = document.createElement('div');
            slide.classList.add('slider-slide');
            const imgEl = document.createElement('img');
            imgEl.src = img.cloudinary_url;
            slide.appendChild(imgEl);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.onclick = () => handleImageDelete(img.id);
            slide.appendChild(delBtn);

            sliderContainer.appendChild(slide);
        });

        initSliderControls();
    } catch (e) { console.error(e); }
}

let currentIndex = 0;
function initSliderControls() {
    const slider = document.querySelector('.slider-container');
    if (!slider || !slider.children.length) return;
    const slides = slider.children;
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');

    function updateSlider() { slider.style.transform = `translateX(-${currentIndex * 100}%)`; }

    if (prevBtn) prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + slides.length) % slides.length; updateSlider(); };
    if (nextBtn) nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % slides.length; updateSlider(); };
}

async function handleImageUpload(fileInput) {
    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm('Necesitas iniciar sesión. ¿Ir al login?')) window.location.href = 'login.html';
        return;
    }

    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(`/api/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (res.ok) {
            alert('Imagen subida!');
            location.reload();
        } else {
            const data = await res.json();
            alert(data.error || 'Error al subir');
        }
    } catch (e) { alert(e.message); }
}

async function handleImageDelete(id) {
    if (!confirm('¿Eliminar imagen?')) return;
    const token = localStorage.getItem('token');
    if (!token) return alert('No tienes permisos');

    try {
        const res = await fetch(`/api/images/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            location.reload();
        } else {
            alert('Error al eliminar');
        }
    } catch (e) { alert(e.message); }
}

// --- Messages Logic ---
async function initMessages() {
    loadMessages();
    const form = document.getElementById('message-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const text = document.getElementById('message-text').value.trim();
            const token = localStorage.getItem('token');

            if (!token) {
                if (confirm('Necesitas iniciar sesión para escribir. ¿Ir al login?')) window.location.href = 'login.html';
                return;
            }

            btn.disabled = true;
            try {
                const res = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ text })
                });
                if (res.ok) {
                    document.getElementById('message-text').value = '';
                    loadMessages();
                } else {
                    alert('Error enviando mensaje');
                }
            } catch (e) { alert(e.message); }
            btn.disabled = false;
        });
    }
}

async function loadMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    try {
        const res = await fetch('/api/messages');
        const msgs = await res.json();
        container.innerHTML = '';
        if (!msgs.length) {
            container.innerHTML = '<p class="no-messages">Sé el primero en escribir.</p>';
            return;
        }

        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-item';
            div.innerHTML = `
                <div class="message-header"><strong>${msg.username}</strong> <small>${new Date(msg.created_at).toLocaleDateString()}</small></div>
                <div class="message-body">${msg.text}</div>
                <button class="delete-message-btn delete-btn" onclick="deleteMessage(${msg.id})"><i class="fa-solid fa-trash"></i></button>
            `;
            container.appendChild(div);
        });
        checkLoginStatus();
    } catch (e) { console.error(e); }
}

window.deleteMessage = async function (id) {
    if (!confirm('¿Borrar mensaje?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`/api/messages?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    loadMessages();
}

// --- Auth Utilities ---
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isLoggedIn = token && username;

    const loginItem = document.getElementById('login-nav-item');
    const userStatus = document.getElementById('user-status');
    const userName = document.getElementById('user-name');

    if (loginItem) loginItem.style.display = isLoggedIn ? 'none' : 'block';
    if (userStatus) {
        userStatus.style.display = isLoggedIn ? 'flex' : 'none';
        if (userName) userName.textContent = username;
    }

    // Show/Hide delete buttons globally
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.style.display = isLoggedIn ? 'inline-block' : 'none';
    });

    // Message form visibility
    const msgForm = document.getElementById('message-form-container');
    if (msgForm) msgForm.style.display = isLoggedIn ? 'block' : 'none';
}

async function checkServerHealth() {
    try { await fetch('/api/health'); } catch (e) { }
}

// --- Countdown ---
function updateCountdown() {
    const el = document.getElementById('anniversary-countdown');
    if (!el) return;
    const start = new Date('2025-09-20');
    const now = new Date();
    // Simple calc
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }

    el.textContent = `Llevamos ${years > 0 ? years + ' años, ' : ''}${months} meses y ${days} días juntos.`;
}