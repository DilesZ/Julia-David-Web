
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("Empezando la configuración de la base de datos...");

        // Tabla de Usuarios (si aún no existe)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla 'users' verificada/creada.");

        // Tabla de Contenido (Historia, Planes, etc.)
        await client.query(`
            CREATE TABLE IF NOT EXISTS content (
                id SERIAL PRIMARY KEY,
                section VARCHAR(50) UNIQUE NOT NULL,
                text TEXT,
                user_id INTEGER REFERENCES users(id),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla 'content' verificada/creada.");

        // Tabla de Imágenes de la Galería
        await client.query(`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                cloudinary_id VARCHAR(255) NOT NULL,
                cloudinary_url VARCHAR(255) NOT NULL,
                description TEXT,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla 'images' verificada/creada.");

        // Tabla de Mensajes
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id),
                username VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla 'messages' verificada/creada.");

        // Tabla de Eventos del Calendario
        await client.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                event_date DATE NOT NULL,
                event_time TIME,
                type VARCHAR(50) NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabla 'calendar_events' verificada/creada.");

        // --- NUEVAS TABLAS PARA EL NIDITO ---

        // Tabla para las "Cajitas" del nido
        await client.query(`
            CREATE TABLE IF NOT EXISTS nest_boxes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("-> Nueva tabla 'nest_boxes' creada.");

        // Tabla para los archivos/links dentro de cada cajita
        await client.query(`
            CREATE TABLE IF NOT EXISTS nest_files (
                id SERIAL PRIMARY KEY,
                box_id INTEGER NOT NULL REFERENCES nest_boxes(id) ON DELETE CASCADE,
                file_name VARCHAR(255) NOT NULL,
                file_url VARCHAR(512) NOT NULL,
                file_type VARCHAR(50), -- 'video', 'link', 'document', 'image', etc.
                cloudinary_id VARCHAR(255), -- Para archivos subidos a Cloudinary
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("-> Nueva tabla 'nest_files' creada.");

        console.log("\nConfiguración de la base de datos completada con éxito.");
        console.log("Puedes ejecutar este script con 'node api/setup_database.js' si tienes las variables de entorno configuradas localmente.");

    } catch (error) {
        console.error("Error durante la configuración de la base de datos:", error);
    } finally {
        client.release();
        pool.end();
    }
};

// Solo ejecutar si el script es llamado directamente (CLI)
if (require.main === module) {
    // Cargar variables de entorno si están en un archivo .env (para ejecución local)
    try {
        require('dotenv').config();
    } catch (e) {
        console.log("dotenv no está instalado, se usarán las variables de entorno del sistema.");
    }
    setupDatabase();
}

// Exportar como handler para Vercel (HTTP)
module.exports = async (req, res) => {
    try {
        await setupDatabase();
        res.status(200).send("Configuración de base de datos completada. Tablas verificadas/creadas.");
    } catch (error) {
        res.status(500).send("Error configurando base de datos: " + error.message);
    }
};
