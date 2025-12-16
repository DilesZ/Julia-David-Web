
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// --- Configuración de Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Configuración del almacenamiento con Multer y Cloudinary ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'JuliaDavidWeb', // Carpeta en Cloudinary donde se guardarán las imágenes
    format: async (req, file) => 'webp', // Convierte las imágenes a un formato moderno y eficiente
    public_id: (req, file) => 'img-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }] // Redimensiona para no guardar imágenes gigantes
  },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo imágenes.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // Límite de 15MB
    fileFilter: fileFilter
});

// Middleware para manejar errores de subida
const handleUpload = (req, res, next) => {
    const uploadMiddleware = upload.single('image');
    uploadMiddleware(req, res, (err) => {
        if (err) {
            console.error('Error en la subida a Cloudinary:', err);
            return res.status(400).json({ error: `Error en la subida: ${err.message}` });
        }
        next();
    });
};

// --- RUTAS ---

// GET all images
router.get('/', (req, res) => {
    db.all("SELECT * FROM images ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error("Error al obtener imágenes:", err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.json(rows);
    });
});

// POST a new image (sube a Cloudinary)
router.post('/', authMiddleware, handleUpload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo o el formato no es válido.' });
    }

    const description = req.body.description || 'Sin descripción';
    const imageUrl = req.file.path; // URL segura proporcionada por Cloudinary
    const publicId = req.file.filename; // ID único proporcionado por Cloudinary

    db.run(
        "INSERT INTO images (path, public_id, description, uploaded_by) VALUES (?, ?, ?, ?)",
        [imageUrl, publicId, description, req.user.username],
        function (err) {
            if (err) {
                console.error("Error al guardar imagen en BD:", err);
                // Si falla la BD, intentamos borrar la imagen de Cloudinary para no dejarla huérfana
                cloudinary.uploader.destroy(publicId, (destroyErr) => {
                    if (destroyErr) console.error('Error al borrar imagen huérfana de Cloudinary:', destroyErr);
                });
                return res.status(500).json({ error: 'Error al guardar la información en la base de datos' });
            }
            res.status(201).json({ 
                message: 'Imagen subida correctamente a Cloudinary', 
                image: { id: this.lastID, path: imageUrl, public_id: publicId }
            });
        }
    );
});

// DELETE an image
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;

    db.get("SELECT path, public_id FROM images WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error al buscar la imagen:", err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Función para eliminar de la base de datos
        const deleteFromDB = () => {
            db.run("DELETE FROM images WHERE id = ?", [id], function (dbErr) {
                if (dbErr) {
                    return res.status(500).json({ error: 'Error al eliminar la imagen de la base de datos' });
                }
                res.status(200).json({ message: 'Imagen eliminada correctamente' });
            });
        };

        // Si la imagen tiene un public_id, es de Cloudinary. Si no, es una imagen local antigua.
        if (row.public_id) {
            cloudinary.uploader.destroy(row.public_id, (destroyErr, result) => {
                if (destroyErr) {
                    console.error('Error al eliminar de Cloudinary:', destroyErr);
                    // No detenemos el proceso, intentamos borrar de la BD igualmente
                }
                console.log('Resultado de Cloudinary (delete):', result);
                deleteFromDB();
            });
        } else {
            // Lógica para imágenes antiguas que no están en Cloudinary (solo se borran de la BD)
            console.log(`La imagen con ID ${id} no está en Cloudinary. Se eliminará solo de la base de datos.`);
            deleteFromDB();
        }
    });
});

module.exports = router;
