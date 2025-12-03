const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// Inicializar base de datos
db.serialize(() => {
    // Tabla de usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de contenido
    db.run(`
        CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT UNIQUE NOT NULL,
            text TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de imágenes
    db.run(`
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            description TEXT,
            uploaded_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de mensajes
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Verificar si existen usuarios
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (err) {
            console.error('Error al verificar usuarios:', err);
            return;
        }

        try {
            if (row.count === 0) {
                const hashedPasswordJulia = await bcrypt.hash('julia2025', 10);
                const hashedPasswordDavid = await bcrypt.hash('david2025', 10);

                db.run(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    ['Julia', hashedPasswordJulia],
                    (err) => {
                        if (err) console.error('Error al crear usuario Julia:', err);
                        else console.log('✅ Usuario Julia creado (password: julia2025)');
                    }
                );

                db.run(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    ['David', hashedPasswordDavid],
                    (err) => {
                        if (err) console.error('Error al crear usuario David:', err);
                        else console.log('✅ Usuario David creado (password: david2025)');
                    }
                );
            }
        } catch (e) {
            console.error('Error al inicializar usuarios:', e);
        }
    });

    // Verificar si existe contenido inicial
    db.get("SELECT COUNT(*) as count FROM content", (err, row) => {
        if (err) {
            console.error('Error al verificar contenido:', err);
            return;
        }

        try {
            if (row.count === 0) {
                const historiaInicial = `Nuestra historia comenzó el 20 de septiembre de 2025, cuando nuestros caminos se cruzaron de una manera que solo el destino podría haber planeado. Desde ese primer momento, supimos que algo especial estaba naciendo entre nosotros. Cada día juntos es una nueva aventura, llena de risas, complicidad y un amor que crece más fuerte con el tiempo.`;
                const planesInicial = `Nuestros sueños están llenos de planes increíbles: viajar por el mundo, crear recuerdos inolvidables y construir juntos el futuro que siempre imaginamos. Queremos explorar nuevos lugares, disfrutar de cada momento y seguir escribiendo nuestra historia de amor, capítulo a capítulo, día a día.`;

                db.run(
                    "INSERT INTO content (section, text) VALUES (?, ?)",
                    ['historia', historiaInicial],
                    (err) => {
                        if (err) console.error('Error al crear contenido historia:', err);
                        else console.log('✅ Contenido inicial "historia" creado');
                    }
                );

                db.run(
                    "INSERT INTO content (section, text) VALUES (?, ?)",
                    ['planes', planesInicial],
                    (err) => {
                        if (err) console.error('Error al crear contenido planes:', err);
                        else console.log('✅ Contenido inicial "planes" creado');
                    }
                );
            }
        } catch (e) {
            console.error('Error al inicializar contenido:', e);
        }
    });

    // Importar imágenes existentes de la carpeta IMG
    db.get("SELECT COUNT(*) as count FROM images", (err, row) => {
        if (err) {
            console.error('Error al verificar imágenes:', err);
            return;
        }

        try {
            if (row.count === 0) {
                const fs = require('fs');
                const imgPath = path.join(__dirname, '..', 'frontend', 'IMG');
                if (fs.existsSync(imgPath)) {
                    const files = fs.readdirSync(imgPath);
                    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
                    imageFiles.forEach((file, index) => {
                        db.run(
                            "INSERT INTO images (path, description, uploaded_by) VALUES (?, ?, ?)",
                            [`/IMG/${file}`, `Momento especial ${index + 1}`, 'Sistema'],
                            (err) => {
                                if (err) console.error(`Error al importar ${file}:`, err);
                                else console.log(`✅ Imagen ${file} importada`);
                            }
                        );
                    });
                }
            }
        } catch (e) {
            console.error('Error al inicializar imágenes:', e);
        }
    });
});

console.log('✅ Base de datos inicializada correctamente');

module.exports = db;
