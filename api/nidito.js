const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de Multer para Nidito
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let resourceType = 'auto';
        // Cloudinary trata los archivos de audio como 'video'
        // Verificamos por mimetype o por extensión de archivo
        const isAudio = file.mimetype.startsWith('audio/') || 
                        file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
        
        if (isAudio) {
            resourceType = 'video';
        }
        return {
            folder: 'nidito',
            resource_type: resourceType
        };
    }
});
const upload = multer({ storage });

// Middleware para verificar JWT
const authenticate = (handler) => async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.username !== 'Julia' && decoded.username !== 'David') {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }
        req.user = decoded; // Añade la info del usuario al request
        return handler(req, res);
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// --- Manejadores de Rutas ---

// GET /api/nidito -> Obtiene todas las cajitas
// GET /api/nidito?boxId=1 -> Obtiene los archivos de una cajita
async function handleGet(req, res) {
    const { boxId } = req.query;
    const client = await pool.connect();

    try {
        if (boxId) {
            // Obtener archivos de una cajita específica
            const filesResult = await client.query(
                'SELECT * FROM nest_files WHERE box_id = $1 ORDER BY created_at DESC', 
                [boxId]
            );
            res.status(200).json(filesResult.rows);
        } else {
            // Obtener todas las cajitas con vista previa de archivos
            const boxesResult = await client.query(`
                SELECT b.*, 
                       COALESCE(
                           (SELECT json_agg(f) 
                            FROM (SELECT file_url, file_type, file_name FROM nest_files WHERE box_id = b.id ORDER BY created_at DESC LIMIT 4) f
                           ), 
                           '[]'
                       ) as preview_files
                FROM nest_boxes b 
                ORDER BY b.created_at DESC
            `);
            res.status(200).json(boxesResult.rows);
        }
    } catch (error) {
        console.error('Error en GET /api/nidito:', error);
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
    } finally {
        client.release();
    }
}

// POST /api/nidito -> Crea una nueva cajita
// POST /api/nidito?boxId=1 -> Sube un archivo a una cajita
async function handlePost(req, res) {
    const { boxId } = req.query;
    const client = await pool.connect();

    // Caso 1: Subir archivo (Multipart)
    if (boxId) {
        return new Promise((resolve, reject) => {
            upload.single('file')(req, res, async (err) => {
                if (err) {
                    console.error("Error subiendo a Cloudinary:", err);
                    client.release();
                    res.status(500).json({ error: 'Error al subir el archivo: ' + err.message });
                    return resolve();
                }

                if (!req.file) {
                    client.release();
                    res.status(400).json({ error: 'No se ha subido ningún archivo' });
                    return resolve();
                }

                try {
                    const { path: file_url, filename: cloudinary_id, mimetype } = req.file;
                    const file_name = req.file.originalname;

                    const newFile = await client.query(`
                        INSERT INTO nest_files (box_id, file_name, file_url, file_type, cloudinary_id, user_id)
                        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
                    `, [boxId, file_name, file_url, mimetype, cloudinary_id, req.user.userId]);
                    
                    res.status(201).json(newFile.rows[0]);
                    resolve();

                } catch (uploadError) {
                    console.error("Error guardando en DB:", uploadError);
                    res.status(500).json({ error: 'Error al guardar referencia del archivo' });
                    resolve();
                } finally {
                    client.release();
                }
            });
        });
    } 
    
    // Caso 2: Crear Cajita (JSON)
    try {
        const { name, description } = req.body || {};
        if (!name) return res.status(400).json({ error: 'El nombre de la cajita es obligatorio' });

        const newBox = await client.query(`
            INSERT INTO nest_boxes (name, description, user_id) VALUES ($1, $2, $3) RETURNING *
        `, [name, description || null, req.user.userId]);

        res.status(201).json(newBox.rows[0]);
    } catch (error) {
        console.error('Error en POST /api/nidito:', error);
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
    } finally {
        client.release();
    }
}

// DELETE /api/nidito?boxId=1 -> Elimina una cajita
// DELETE /api/nidito?fileId=1 -> Elimina un archivo
async function handleDelete(req, res) {
    const { boxId, fileId } = req.query;
    const client = await pool.connect();

    try {
        if (fileId) {
            // Eliminar un archivo
            const file = await client.query('SELECT * FROM nest_files WHERE id = $1', [fileId]);
            if (file.rowCount === 0) return res.status(404).json({ error: 'Archivo no encontrado' });

            // Eliminar de Cloudinary
            if (file.rows[0].cloudinary_id) {
                await cloudinary.uploader.destroy(file.rows[0].cloudinary_id);
            }

            await client.query('DELETE FROM nest_files WHERE id = $1', [fileId]);
            res.status(200).json({ message: 'Archivo eliminado' });

        } else if (boxId) {
            // Eliminar una cajita (y su contenido en cascada en la BD)
            // También es recomendable borrar la carpeta de Cloudinary si es posible
            await client.query('DELETE FROM nest_boxes WHERE id = $1', [boxId]);
            // Nota: La eliminación en cascada de la BD se encarga de los registros de nest_files.
            // Aquí podrías añadir la lógica para limpiar la carpeta en Cloudinary.
            res.status(200).json({ message: 'Cajita eliminada' });

        } else {
            res.status(400).json({ error: 'Se necesita un ID de cajita o archivo' });
        }
    } catch (error) {
        console.error('Error en DELETE /api/nidito:', error);
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
    } finally {
        client.release();
    }
}

// --- Router Principal ---

module.exports = async (req, res) => {
    // Rutas públicas (solo GET)
    if (req.method === 'GET') {
        return await handleGet(req, res);
    }

    // Todas las demás rutas (POST, DELETE) requieren autenticación
    const authenticatedHandler = authenticate((req, res) => {
        switch (req.method) {
            case 'POST':
                return handlePost(req, res);
            case 'DELETE':
                return handleDelete(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                res.status(405).end(`Método ${req.method} no permitido`);
        }
    });

    return await authenticatedHandler(req, res);
};