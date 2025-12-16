
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// La conexión a la base de datos se configura automáticamente a través de las variables de entorno de Vercel
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones en entornos como Vercel
  }
});

const SCHEMA = 'juliadavidweb'; // Define un esquema para mantener todo organizado

async function initializeDB() {
  const client = await pool.connect();
  try {
    console.log("Conectado a la base de datos PostgreSQL. Inicializando esquema...");

    // Crear el esquema si no existe para evitar colisiones
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);

    // Establecer la ruta de búsqueda al esquema para las siguientes consultas
    await client.query(`SET search_path TO ${SCHEMA}`);

    // Crear las tablas con sintaxis de PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS content (
          id SERIAL PRIMARY KEY,
          section VARCHAR(50) UNIQUE NOT NULL,
          text TEXT
      );
      CREATE TABLE IF NOT EXISTS images (
          id SERIAL PRIMARY KEY,
          path TEXT NOT NULL,         -- URL de Cloudinary
          public_id TEXT,           -- ID de Cloudinary
          description TEXT,
          uploaded_by VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          author VARCHAR(100),
          message TEXT,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Esquema verificado. Poblando datos iniciales si es necesario...");

    // Poblar usuarios si la tabla está vacía
    const users = await client.query('SELECT COUNT(*) as count FROM users');
    if (users.rows[0].count === '0') {
      console.log("No hay usuarios. Creando usuarios por defecto...");
      const hashedPasswordJulia = bcrypt.hashSync('julia2025', 10);
      await client.query("INSERT INTO users (username, password) VALUES ($1, $2)", ['Julia', hashedPasswordJulia]);
      
      const hashedPasswordDavid = bcrypt.hashSync('david2025', 10);
      await client.query("INSERT INTO users (username, password) VALUES ($1, $2)", ['David', hashedPasswordDavid]);
      console.log("Usuarios por defecto creados.");
    }

    // Poblar contenido si la tabla está vacía
    const content = await client.query('SELECT COUNT(*) as count FROM content');
    if (content.rows[0].count === '0') {
      console.log("No hay contenido. Creando contenido por defecto...");
      const historiaInicial = `Nuestra historia comenzó el 20 de septiembre de 2025...`;
      const planesInicial = `Nuestros sueños están llenos de planes increíbles...`;
      await client.query("INSERT INTO content (section, text) VALUES ('historia', $1)", [historiaInicial]);
      await client.query("INSERT INTO content (section, text) VALUES ('planes', $1)", [planesInicial]);
      console.log("Contenido inicial creado.");
    }

    console.log("Proceso de inicialización de la base de datos completado.");

  } catch (err) {
    console.error("Error durante la inicialización de la base de datos:", err);
    // Si hay un error, lo lanzamos para detener el proceso si es necesario
    throw err;
  } finally {
    client.release();
  }
}

// Ejecutar la inicialización al arrancar el servidor
initializeDB().catch(err => {
    console.error("Fallo crítico al inicializar la base de datos. El servidor no puede continuar.", err);
    process.exit(1);
});

// Función de consulta genérica para ser usada por las rutas
// Se asegura de usar siempre el esquema correcto
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};

module.exports = { query };
