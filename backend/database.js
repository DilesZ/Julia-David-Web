const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initializeDB();
    }
});

function initializeDB() {
    db.serialize(() => {
        console.log("Inicializando esquema de la base de datos...");

        // Creación de Tablas
        db.run(`CREATE TABLE IF NOT EXISTS users (...)`); // El resto del DDL
        db.run(`CREATE TABLE IF NOT EXISTS content (...)`);
        db.run(`CREATE TABLE IF NOT EXISTS images (...)`);
        db.run(`CREATE TABLE IF NOT EXISTS messages (...)`);

        console.log("Esquema verificado. Poblando datos iniciales si es necesario...");

        // Poblar usuarios
        db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
            if (err) return console.error('Error al verificar usuarios:', err);
            if (row.count === 0) {
                console.log("No hay usuarios. Creando usuarios por defecto...");
                try {
                    const hashedPasswordJulia = await bcrypt.hash('julia2025', 10);
                    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['Julia', hashedPasswordJulia]);
                    const hashedPasswordDavid = await bcrypt.hash('david2025', 10);
                    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['David', hashedPasswordDavid]);
                    console.log("Usuarios por defecto creados.");
                } catch (e) {
                    console.error('Error hasheando contraseñas al inicializar:', e);
                }
            }
        });

        // Poblar contenido inicial de forma robusta
        const historiaInicial = `Nuestra historia comenzó el 20 de septiembre de 2025, cuando nuestros caminos se cruzaron de una manera que solo el destino podría haber planeado. Desde ese primer momento, supimos que algo especial estaba naciendo entre nosotros. Cada día juntos es una nueva aventura, llena de risas, complicidad y un amor que crece más fuerte con el tiempo.`;
        const planesInicial = `Nuestros sueños están llenos de planes increíbles: viajar por el mundo, crear recuerdos inolvidables y construir juntos el futuro que siempre imaginamos. Queremos explorar nuevos lugares, disfrutar de cada momento y seguir escribiendo nuestra historia de amor, capítulo a capítulo, día a día.`;

        db.run("INSERT OR IGNORE INTO content (section, text) VALUES ('historia', ?)", [historiaInicial], function(err) {
            if (err) return console.error('Error al insertar contenido de historia:', err.message);
            if (this.changes > 0) console.log('✅ Contenido inicial \"historia\" insertado.');
        });

        db.run("INSERT OR IGNORE INTO content (section, text) VALUES ('planes', ?)", [planesInicial], function(err) {
            if (err) return console.error('Error al insertar contenido de planes:', err.message);
            if (this.changes > 0) console.log('✅ Contenido inicial \"planes\" insertado.');
        });

        // Poblar imágenes iniciales
        db.get("SELECT COUNT(*) as count FROM images", (err, row) => {
            if (err) return console.error('Error al verificar imágenes:', err);
            if (row.count === 0) {
                console.log("No hay imágenes. Importando imágenes de la carpeta IMG...");
                const fs = require('fs');
                const imgPath = path.join(__dirname, '..', 'frontend', 'IMG');
                try {
                    if (fs.existsSync(imgPath)) {
                        const files = fs.readdirSync(imgPath).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
                        files.forEach((file, index) => {
                            db.run("INSERT INTO images (path, description, uploaded_by) VALUES (?, ?, ?)", [`/IMG/${file}`, `Momento especial ${index + 1}`, 'Sistema']);
                        });
                        console.log(`${files.length} imágenes importadas.`);
                    }
                } catch (e) {
                    console.error('Error al inicializar imágenes desde la carpeta:', e);
                }
            }
        });

        console.log("Proceso de inicialización de la base de datos completado.");
    });
}

module.exports = db;
