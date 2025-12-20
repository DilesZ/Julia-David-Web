const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { Readable } = require('stream');
const { uploadToDrive } = require('./drive');

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
        const isAudio = file.mimetype.startsWith('audio/') ||
            file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
        if (isAudio) {
            resourceType = 'video';
        }
        return {
            folder: 'nidito',
            resource_type: resourceType,
            type: 'upload',
            use_filename: true,
            unique_filename: true,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'm4a', 'aac']
        };
    }
});
const upload = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

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
        // Usamos memory storage y subimos vía upload_stream para controlar resource_type
        return new Promise((resolve) => {
            uploadMemory.single('file')(req, res, async (err) => {
                if (err) {
                    console.error("Error recibiendo archivo:", err);
                    client.release();
                    return res.status(400).json({ error: 'Error recibiendo archivo: ' + err.message }), resolve();
                }
                if (!req.file) {
                    client.release();
                    return res.status(400).json({ error: 'No se ha subido ningún archivo' }), resolve();
                }

                const fileBuffer = req.file.buffer;
                const fileName = req.file.originalname;
                const mimeType = req.file.mimetype || '';
                const isAudio = mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
                const isVideo = mimeType.startsWith('video/');
                const isImage = mimeType.startsWith('image/');

                try {
                    // AUDIO: Usar Google Drive
                    if (isAudio) {
                        try {
                            const driveResult = await uploadToDrive(fileBuffer, fileName, mimeType);
                            const newFile = await client.query(`
                                INSERT INTO nest_files (box_id, file_name, file_url, file_type, cloudinary_id, user_id)
                                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
                            `, [boxId, fileName, driveResult.url, mimeType, `drive:${driveResult.fileId}`, req.user.userId]);

                            res.status(201).json(newFile.rows[0]);
                            client.release();
                            return resolve();
                        } catch (driveErr) {
                            console.error("Error subiendo audio a Drive:", driveErr);
                            client.release();
                            res.status(500).json({ error: 'Error al subir audio a Google Drive: ' + driveErr.message });
                            return resolve();
                        }
                    }

                    // NO AUDIO: Usar Cloudinary
                    const resourceType = isVideo ? 'video' : (isImage ? 'image' : 'auto');
                    const uploadOpts = {
                        folder: 'nidito',
                        resource_type: resourceType,
                        use_filename: true,
                        unique_filename: true
                    };

                    const uploadStream = cloudinary.uploader.upload_stream(uploadOpts, async (cloudErr, result) => {
                        if (cloudErr) {
                            client.release();
                            console.error("Error Cloudinary:", cloudErr);
                            res.status(500).json({ error: 'Error al subir a Cloudinary: ' + (cloudErr.message || 'Error') });
                            return resolve();
                        }

                        try {
                            const file_url = result.secure_url || result.url;
                            const cloudinary_id = result.public_id;

                            const newFile = await client.query(`
                                INSERT INTO nest_files (box_id, file_name, file_url, file_type, cloudinary_id, user_id)
                                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
                            `, [boxId, fileName, file_url, mimeType, cloudinary_id, req.user.userId]);

                            res.status(201).json(newFile.rows[0]);
                            resolve();
                        } catch (dbErr) {
                            console.error("Error guardando en DB:", dbErr);
                            res.status(500).json({ error: 'Error al guardar referencia del archivo' });
                            resolve();
                        } finally {
                            client.release();
                        }
                    });

                    const readable = new Readable();
                    readable.push(fileBuffer);
                    readable.push(null);
                    readable.pipe(uploadStream);
                } catch (e) {
                    console.error("Error general en subida:", e);
                    client.release();
                    res.status(500).json({ error: 'Error interno en subida' });
                    resolve();
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
