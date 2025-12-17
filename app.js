document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCommonFeatures();
    initFadeInAnimations(); // New helper for animations

    // Page Specific Initializations
    if (document.getElementById('historia-page')) loadTextContent();
    if (document.getElementById('planes-page')) loadTextContent();
    if (document.querySelector('.gallery')) initGallery();
    if (document.getElementById('mensajes-page')) initMessages();
    if (document.getElementById('anniversary-countdown')) updateCountdown();
    if (document.getElementById('calendario-page')) initCalendar();

    // Check server health on all pages
    checkServerHealth();
});

// --- Calendario Personalizado ---
let currentCalendarDate = new Date();
let calendarEvents = [];
let editingEventId = null;

async function initCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    setupCalendarControls();
    await fetchCalendarEvents();
    renderCalendar();
    checkAdminAccessForCalendar();
}

function setupCalendarControls() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Modal logic
    const modal = document.getElementById('calendar-modal');
    const closeBtn = document.getElementById('close-calendar-modal');
    const deleteBtn = document.getElementById('delete-event-btn');
    const form = document.getElementById('calendar-form');

    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (editingEventId && confirm('¿Eliminar este momento del calendario?')) {
                await deleteCalendarEvent(editingEventId);
                modal.style.display = 'none';
            }
        };
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;

            const title = document.getElementById('event-title').value;
            const event_date = document.getElementById('event-date').value;
            const event_time = document.getElementById('event-time').value;
            const type = form.querySelector('input[name="event-type"]:checked').value;

            if (editingEventId) {
                await deleteCalendarEvent(editingEventId, true);
            }

            await saveCalendarEvent({ title, event_date, event_time, type });
            btn.disabled = false;
            modal.style.display = 'none';
            form.reset();
        });
    }
}

function openCalendarModal(date = null, event = null) {
    const modal = document.getElementById('calendar-modal');
    const form = document.getElementById('calendar-form');
    const deleteBtn = document.getElementById('delete-event-btn');

    editingEventId = event ? event.id : null;
    form.reset();

    if (event) {
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-date').value = event.event_date.split('T')[0];
        document.getElementById('event-time').value = event.event_time ? event.event_time.substring(0, 5) : '';
        form.querySelector(`input[name="event-type"][value="${event.type}"]`).checked = true;
        deleteBtn.style.display = 'block';
    } else {
        if (date) {
            document.getElementById('event-date').value = date;
        } else {
            document.getElementById('event-date').valueAsDate = new Date();
        }
        deleteBtn.style.display = 'none';
    }

    modal.style.display = 'block';
}

async function fetchCalendarEvents() {
    try {
        const res = await fetch('/api/calendar');
        if (res.ok) {
            calendarEvents = await res.json();
        }
    } catch (e) {
        console.error('Error fetching calendar events:', e);
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('current-month-year');
    const isAdmin = (localStorage.getItem('username') === 'Julia' || localStorage.getItem('username') === 'David');

    // Clear previous days (keep weekdays)
    const weekdays = Array.from(grid.querySelectorAll('.weekday'));
    grid.innerHTML = '';
    weekdays.forEach(wd => grid.appendChild(wd));

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYearLabel.innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Padding days
    for (let i = 0; i < adjustedFirstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        grid.appendChild(emptyDiv);
    }

    // Actual days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Find events for this day - using UTC to avoid timezone shifts
        const dayEvents = calendarEvents.filter(e => {
            const eDate = new Date(e.event_date);
            return eDate.getUTCFullYear() === year && eDate.getUTCMonth() === month && eDate.getUTCDate() === day;
        });

        dayDiv.innerHTML = `<span class="day-number">${day}</span>`;

        if (dayEvents.length > 0) {
            dayEvents.forEach(e => {
                dayDiv.classList.add(e.type === 'cita' ? 'appointment' : 'event');
                const eventEl = document.createElement('div');
                eventEl.classList.add('calendar-event-tag');
                eventEl.innerHTML = `<strong>${e.title}</strong> ${e.event_time ? '<br>' + e.event_time.substring(0, 5) : ''}`;
                dayDiv.appendChild(eventEl);

                if (isAdmin) {
                    dayDiv.style.cursor = 'pointer';
                    dayDiv.onclick = () => openCalendarModal(dateStr, e);
                }
            });
        } else if (isAdmin) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.onclick = () => openCalendarModal(dateStr);
        }

        grid.appendChild(dayDiv);
    }
}

async function saveCalendarEvent(eventData) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(eventData)
        });
        if (res.ok) {
            await fetchCalendarEvents();
            renderCalendar();
        } else {
            const error = await res.json();
            alert(error.error || 'Error al guardar');
        }
    } catch (e) { alert('Error de conexión'); }
}

async function deleteCalendarEvent(id, silent = false) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`/api/calendar?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (!silent) {
                await fetchCalendarEvents();
                renderCalendar();
            }
        }
    } catch (e) { console.error(e); }
}

function checkAdminAccessForCalendar() {
    // Ya no necesitamos mostrar el botón de añadir porque se hace clic en los días
}

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
    // Admin Modal Logic
    const adminModal = document.getElementById('admin-modal');
    // Global vars for admin editors
    window.adminQuills = {};

    if (adminModal) {
        const closeBtn = document.getElementById('close-admin-modal');

        // Initialize Admin Quills once
        if (document.getElementById('historia-editor-container')) {
            window.adminQuills.historia = new Quill('#historia-editor-container', {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline', 'strike'], ['link', 'blockquote'], [{ 'list': 'ordered' }, { 'list': 'bullet' }]] }
            });
        }
        if (document.getElementById('planes-editor-container')) {
            window.adminQuills.planes = new Quill('#planes-editor-container', {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline', 'strike'], ['link', 'blockquote'], [{ 'list': 'ordered' }, { 'list': 'bullet' }]] }
            });
        }

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

        if (saveHistoria) saveHistoria.onclick = () => saveData('historia', window.adminQuills.historia.root.innerHTML);
        if (savePlanes) savePlanes.onclick = () => saveData('planes', window.adminQuills.planes.root.innerHTML);

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

        // Use innerHTML to render HTML content from Quill
        if (hText) hText.innerHTML = contents.find(c => c.section === 'historia')?.text || defaultContent.historia;
        if (pText) pText.innerHTML = contents.find(c => c.section === 'planes')?.text || defaultContent.planes;
    } catch (e) { console.error('Error loading content', e); }
}

async function loadAdminContent() {
    try {
        const res = await fetch(`/api/content`);
        const contents = await res.json();

        if (window.adminQuills.historia) {
            const text = contents.find(c => c.section === 'historia')?.text || defaultContent.historia;
            // Handle simple text (old data) vs HTML. Quill handles proper HTML.
            // If it's plain text, setText might be safer, but root.innerHTML works for both generally if getting from valid source.
            window.adminQuills.historia.clipboard.dangerouslyPasteHTML(text);
        }
        if (window.adminQuills.planes) {
            const text = contents.find(c => c.section === 'planes')?.text || defaultContent.planes;
            window.adminQuills.planes.clipboard.dangerouslyPasteHTML(text);
        }

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
        // Initialize Quill for Messages
        const quill = new Quill('#message-editor-container', {
            theme: 'snow',
            placeholder: 'Escribe algo bonito aquí...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link']
                ]
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const text = quill.root.innerHTML; // Get HTML content

            // Check if empty (Quill leaves <p><br></p> when empty)
            if (quill.getText().trim().length === 0) {
                return alert('Por favor escribe un mensaje.');
            }

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
                    quill.setText(''); // Clear editor
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

// --- Animations ---
function initFadeInAnimations() {
    const faders = document.querySelectorAll('.fade-in');
    if (!faders.length) return;

    const appearOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };

    // Fallback: If intersection observer fails or takes wise, show content
    setTimeout(() => {
        faders.forEach(fader => {
            if (!fader.classList.contains('visible')) fader.classList.add('visible');
        });
    }, 1000);

    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, appearOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });
}