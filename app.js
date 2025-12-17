document.addEventListener('DOMContentLoaded', () => {
            const defaultContent = {
                historia: `Nuestra historia comenzó el 20 de septiembre de 2025...`,
                planes: `Nuestros sueños están llenos de planes increíbles...`
            };

            function setContent(content) {
                document.getElementById('historia-text').textContent = content.find(c => c.section === 'historia')?.text || defaultContent.historia;
                document.getElementById('planes-text').textContent = content.find(c => c.section === 'planes')?.text || defaultContent.planes;
            }

            async function loadContent() {
                try {
                    const response = await fetch(`/api/content`);
                    if (!response.ok) throw new Error('Response not OK');
                    const contents = await response.json();
                    setContent(contents && contents.length > 0 ? contents : []);
                } catch (error) {
                    console.error('Error cargando contenido. Usando fallback.', error);
                    setContent([]);
                }
            }
            
            async function checkServerHealth() {
                try {
                    const response = await fetch(`/api/health`);
                    const data = await response.json();
                    const statusEl = document.getElementById('health-status');
                    if (response.ok && data.status === 'ok') {
                        statusEl.textContent = 'Estado del Servidor: Conectado ✔️';
                        statusEl.style.color = '#28a745';
                    } else { throw new Error('Health check failed'); }
                } catch (error) {
                    const statusEl = document.getElementById('health-status');
                    statusEl.textContent = 'Estado del Servidor: Desconectado ❌ (Failed to fetch)';
                    statusEl.style.color = '#dc3545';
                }
            }
            
            const faders = document.querySelectorAll('.fade-in');
            const appearOptions = { threshold: 0.2, rootMargin: "0px 0px -50px 0px" };
            const appearOnScroll = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                });
            }, appearOptions);
            faders.forEach(fader => appearOnScroll.observe(fader));

            const menuToggle = document.getElementById('menu-toggle');
            const navUl = document.getElementById('nav-ul');
            menuToggle.addEventListener('click', () => navUl.classList.toggle('active'));
            
            const loginModal = document.getElementById('login-modal');
            const adminModal = document.getElementById('admin-modal');
            const loginNavBtn = document.getElementById('login-nav-btn');
            const adminPanelBtn = document.getElementById('admin-panel-btn');
            
            document.getElementById('close-login-modal').onclick = () => loginModal.style.display = 'none';
            document.getElementById('close-admin-modal').onclick = () => adminModal.style.display = 'none';
            loginNavBtn.onclick = (e) => { e.preventDefault(); loginModal.style.display = 'block'; };
            adminPanelBtn.onclick = () => { loadAdminContent(); adminModal.style.display = 'block'; };

            window.onclick = (event) => {
                if (event.target == loginModal) loginModal.style.display = "none";
                if (event.target == adminModal) adminModal.style.display = "none";
            };

            function checkLoginStatus() {
                const token = localStorage.getItem('token');
                const username = localStorage.getItem('username');
                const messageForm = document.getElementById('message-form-container');
                const isLoggedIn = token && username;

                document.getElementById('login-nav-item').style.display = isLoggedIn ? 'none' : 'block';
                document.getElementById('user-status').style.display = isLoggedIn ? 'flex' : 'none';
                if (isLoggedIn) {
                    document.getElementById('user-name').textContent = `Conectado: ${username}`;
                }
                if(messageForm) messageForm.style.display = isLoggedIn ? 'block' : 'none';
                
                document.querySelectorAll('.delete-btn').forEach(btn => btn.style.display = isLoggedIn ? 'block' : 'none');
                document.querySelectorAll('.delete-message-btn').forEach(btn => btn.style.display = isLoggedIn ? 'block' : 'none');
            }

            document.getElementById('login-modal-btn').addEventListener('click', async () => {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                try {
                    const response = await fetch(`/api/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('username', data.username);
                        loginModal.style.display = 'none';
                        checkLoginStatus();
                        location.reload(); 
                    } else {
                        alert(data.error || 'Error al iniciar sesión.');
                    }
                } catch (err) { alert('Error de conexión.'); }
            });
            
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                checkLoginStatus();
                location.reload();
            });

            async function loadImages() {
               try {
                    const res = await fetch(`/api/images`);
                    if (!res.ok) throw new Error('Failed to load images');
                    const images = await res.json();
                    const sliderContainer = document.getElementById('slider-container');
                    sliderContainer.innerHTML = '';
                    images.forEach(img => {
                        const slide = document.createElement('div');
                        slide.classList.add('slider-slide');
                        slide.style.position = 'relative';
                        const imageEl = document.createElement('img');
                        imageEl.src = img.cloudinary_url; 
                        imageEl.alt = img.description;
                        slide.appendChild(imageEl);
                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'Eliminar';
                        deleteBtn.classList.add('delete-btn');
                        deleteBtn.dataset.imageId = img.id;
                        deleteBtn.onclick = () => handleImageDelete(img.id);
                        slide.appendChild(deleteBtn);
                        sliderContainer.appendChild(slide);
                    });
                    initSlider();
                    checkLoginStatus();
                } catch(e) { console.error(e); }
            }

            async function handleImageDelete(imageId) {
                if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;
                const token = localStorage.getItem('token');
                if (!token) { alert('Debes iniciar sesión para eliminar imágenes.'); return; }
                try {
                    const response = await fetch(`/api/images/${imageId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        alert('Imagen eliminada correctamente. La página se recargará.');
                        location.reload();
                    } else {
                        const errorData = await response.json();
                        alert(`Error al eliminar la imagen: ${errorData.error || 'Error desconocido'}`);
                    }
                } catch (err) { alert(`Error de conexión al eliminar la imagen: ${err.message}`); }
            }
            
            async function loadAdminContent() {
                try {
                    const res = await fetch(`/api/content`);
                    const contents = await res.json();
                    document.getElementById('historia-text-admin').value = contents.find(c => c.section === 'historia')?.text || defaultContent.historia;
                    document.getElementById('planes-text-admin').value = contents.find(c => c.section === 'planes')?.text || defaultContent.planes;
                } catch {
                    document.getElementById('historia-text-admin').value = defaultContent.historia;
                    document.getElementById('planes-text-admin').value = defaultContent.planes;
                }
            }

            async function saveData(section, text) {
                const token = localStorage.getItem('token');
                if (!token) { alert('Sesión expirada.'); return; }
                await fetch(`/api/content`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ section, text })
                });
                alert('Contenido actualizado.');
                loadContent();
                adminModal.style.display = 'none';
            }
            document.getElementById('save-historia').onclick = () => saveData('historia', document.getElementById('historia-text-admin').value);
            document.getElementById('save-planes').onclick = () => saveData('planes', document.getElementById('planes-text-admin').value);

            document.getElementById('upload-image-btn-admin').addEventListener('click', () => handleImageUpload(document.getElementById('admin-upload-image')));
            document.getElementById('upload-image').addEventListener('change', (e) => handleImageUpload(e.target));
            
            async function handleImageUpload(fileInput) {
                const token = localStorage.getItem('token');
                if (!token) { alert('Debes iniciar sesión para subir imágenes.'); loginModal.style.display = 'block'; return; }
                const file = fileInput.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('image', file);
                try {
                    const response = await fetch(`/api/images`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (response.ok) {
                        alert('Imagen subida. La página se recargará.');
                        location.reload();
                    } else {
                        const errorData = await response.json().catch(() => ({ error: 'No se pudo leer el error del servidor' }));
                        alert(`Error al subir la imagen: ${errorData.error || 'Error desconocido'}`);
                    }
                } catch (err) { alert(`Error de conexión al subir imagen: ${err.message}`); }
            }

            // --- Lógica de Mensajes ---
            let allMessages = [];
            const messagesContainer = document.getElementById('messages-container');
            const messageForm = document.getElementById('message-form');

            function renderMessage(msg, atStart = false) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'message-item';
                msgDiv.dataset.messageId = msg.id;
                const date = new Date(msg.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                msgDiv.innerHTML = `
                    <button class="delete-btn delete-message-btn" onclick="handleMessageDelete(${msg.id})">Eliminar</button>
                    <div class="message-header">
                        ${msg.username}
                        <span>${date}</span>
                    </div>
                    <div class="message-body">
                        <p>${msg.text.replace(/\n/g, '<br>')}</p>
                    </div>
                `;
                if (atStart) {
                    messagesContainer.prepend(msgDiv);
                } else {
                    messagesContainer.appendChild(msgDiv);
                }
                checkLoginStatus(); // Para mostrar/ocultar el botón de borrado
            }

            async function loadMessages() {
                try {
                    const res = await fetch('/api/messages');
                    if (!res.ok) throw new Error('Error al cargar mensajes');
                    allMessages = await res.json();
                    messagesContainer.innerHTML = ''; 
                    if (!allMessages || allMessages.length === 0) {
                        messagesContainer.innerHTML = '<p style="text-align: center; color: #888;">Aún no hay mensajes. ¡Sé el primero en escribir!</p>';
                        return;
                    }
                    allMessages.forEach(msg => renderMessage(msg));
                } catch (error) {
                    console.error(error);
                    messagesContainer.innerHTML = '<p style="text-align: center; color: red;">No se pudieron cargar los mensajes.</p>';
                }
            }

            window.handleMessageDelete = async function(messageId) {
                if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

                const token = localStorage.getItem('token');
                if (!token) { alert('Debes iniciar sesión para eliminar mensajes.'); return; }

                try {
                    const res = await fetch(`/api/messages?id=${messageId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error || 'Error al eliminar el mensaje');
                    
                    const messageDiv = document.querySelector(`.message-item[data-message-id='${messageId}']`);
                    if (messageDiv) {
                        messageDiv.classList.add('deleting');
                        setTimeout(() => {
                            messageDiv.remove();
                            allMessages = allMessages.filter(m => m.id !== messageId);
                            if (allMessages.length === 0) {
                                messagesContainer.innerHTML = '<p style="text-align: center; color: #888;">Aún no hay mensajes. ¡Sé el primero en escribir!</p>';
                            }
                        }, 500);
                    }

                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            messageForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const button = e.target.querySelector('button');
                button.disabled = true;
                button.textContent = 'Enviando...';

                const token = localStorage.getItem('token');
                const text = document.getElementById('message-text').value.trim();
                if (!text || !token) {
                    button.disabled = false;
                    button.textContent = 'Enviar Mensaje';
                    return;
                }

                try {
                    const res = await fetch('/api/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ text })
                    });
                    
                    const result = await res.json();

                    if (!res.ok) {
                        throw new Error(result.error || 'Error al enviar el mensaje');
                    }
                    
                    document.getElementById('message-text').value = '';
                    
                    if (allMessages.length === 0) {
                        messagesContainer.innerHTML = '';
                    }

                    const newMessage = result.newMessage;
                    allMessages.unshift(newMessage);
                    renderMessage(newMessage, true); 

                } catch (error) {
                    alert(`Error: ${error.message}`);
                } finally {
                    button.disabled = false;
                    button.textContent = 'Enviar Mensaje';
                }
            });

            // --- Carga inicial ---
            checkServerHealth();
            loadContent();
            loadImages();
            loadMessages();
            checkLoginStatus();
            initSlider();
            updateCountdown();
        });
        
        let currentIndex = 0;
        function initSlider() {
            const slider = document.querySelector('.slider-container');
            if (!slider || !slider.children.length) return;
            const slides = slider.children;
            const prevBtn = document.querySelector('.slider-prev');
            const nextBtn = document.querySelector('slider-next');
            function updateSlider() { slider.style.transform = `translateX(-${currentIndex * 100}%)`; }
            prevBtn.addEventListener('click', () => { currentIndex = (currentIndex - 1 + slides.length) % slides.length; updateSlider(); });
            nextBtn.addEventListener('click', () => { currentIndex = (currentIndex + 1) % slides.length; updateSlider(); });
        }
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        darkModeToggle.addEventListener('click', () => { document.body.classList.toggle('dark-mode'); darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Oscuro'; });
        const heartParticles = document.querySelector('.heart-particles');
        function createHeart() { const heart = document.createElement('div'); heart.classList.add('heart-particle'); heart.innerHTML = '♡'; heart.style.left = Math.random() * 100 + 'vw'; heart.style.animationDuration = Math.random() * 5 + 5 + 's'; heartParticles.appendChild(heart); setTimeout(() => heart.remove(), 10000); }
        setInterval(createHeart, 1000);
        const startDate = new Date('2025-09-20');
        const countdownElement = document.getElementById('anniversary-countdown');
        function updateCountdown() { const now = new Date(); let years = now.getFullYear() - startDate.getFullYear(); let months = now.getMonth() - startDate.getMonth(); let days = now.getDate() - startDate.getDate(); if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); } if (months < 0) { years--; months += 12; } let parts = []; if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`); if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`); if (days > 0 || parts.length === 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`); countdownElement.textContent = parts.join(', '); }
        setInterval(updateCountdown, 1000);