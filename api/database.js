
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.db');

// Función para conectar y asegurar la inicialización secuencial
function connectAndInitialize() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al abrir la base de datos', err.message);
      return;
    }
    console.log('Conectado a la base de datos SQLite.');
    initializeDB(db);
  });
  return db;
}

function initializeDB(db) {
  db.serialize(() => {
    console.log("Inicializando esquema de la base de datos...");

    // 1. Crear todas las tablas en una sola transacción para asegurar que existan.
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          section TEXT UNIQUE NOT NULL,
          text TEXT
      );
      CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,         -- URL de la imagen (local o Cloudinary)
          public_id TEXT,           -- ID para la gestión en Cloudinary
          description TEXT,
          uploaded_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author TEXT,
          message TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => {
      if (err) {
        console.error("Error al crear las tablas:", err.message);
        return;
      }
      console.log("Esquema verificado. Poblando datos iniciales...");
      
      // 2. Poblar los datos después de que las tablas se hayan creado.
      populateUsers(db);
      populateContent(db);
      populateImages(db);
      
      console.log("Proceso de inicialización de la base de datos completado.");
    });
  });
}

function populateUsers(db) {
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) return console.error('Error al verificar usuarios:', err.message);
    if (row.count === 0) {
      console.log("No hay usuarios. Creando usuarios por defecto...");
      try {
        const hashedPasswordJulia = bcrypt.hashSync('julia2025', 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['Julia', hashedPasswordJulia]);
        
        const hashedPasswordDavid = bcrypt.hashSync('david2025', 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['David', hashedPasswordDavid]);
        
        console.log("Usuarios por defecto creados.");
      } catch (e) {
        console.error('Error hasheando contraseñas al inicializar:', e);
      }
    }
  });
}

function populateContent(db) {
  const historiaInicial = `Nuestra historia comenzó el 20 de septiembre de 2025, cuando nuestros caminos se cruzaron de una manera que solo el destino podría haber planeado. Desde ese primer momento, supimos que algo especial estaba naciendo entre nosotros. Cada día juntos es una nueva aventura, llena de risas, complicidad y un amor que crece más fuerte con el tiempo.`;
  const planesInicial = `Nuestros sueños están llenos de planes increíbles: viajar por el mundo, crear recuerdos inolvidables y construir juntos el futuro que siempre imaginamos. Queremos explorar nuevos lugares, disfrutar de cada momento y seguir escribiendo nuestra historia de amor, capítulo a capítulo, día a día.`;

  db.run("INSERT OR IGNORE INTO content (section, text) VALUES ('historia', ?)", [historiaInicial], function(err) {
    if (err) return console.error('Error al insertar contenido de historia:', err.message);
    if (this.changes > 0) console.log('✅ Contenido inicial \'historia\' insertado.');
  });

  db.run("INSERT OR IGNORE INTO content (section, text) VALUES ('planes', ?)", [planesInicial], function(err) {
    if (err) return console.error('Error al insertar contenido de planes:', err.message);
    if (this.changes > 0) console.log('✅ Contenido inicial \'planes\' insertado.');
  });
}

function populateImages(db) {
  db.get("SELECT COUNT(*) as count FROM images", (err, row) => {
    if (err) return console.error('Error al verificar imágenes:', err.message);
    if (row.count === 0) {
      console.log("No hay imágenes. Importando imágenes de la carpeta IMG...");
      const imgPath = path.join(__dirname, '..', 'frontend', 'IMG');
      try {
        if (fs.existsSync(imgPath)) {
          const files = fs.readdirSync(imgPath).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
          if(files.length > 0) {
            const stmt = db.prepare("INSERT INTO images (path, description, uploaded_by) VALUES (?, ?, ?)");
            files.forEach((file, index) => {
              stmt.run(`/IMG/${file}`, `Momento especial ${index + 1}`, 'Sistema');
            });
            stmt.finalize();
            console.log(`${files.length} imágenes importadas.`);
          }
        }
      } catch (e) {
        console.error('Error al inicializar imágenes desde la carpeta:', e);
      }
    }
  });
}

const db = connectAndInitialize();
module.exports = db;
