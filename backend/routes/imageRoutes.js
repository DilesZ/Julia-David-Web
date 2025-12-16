const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo imágenes.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Middleware para manejar los errores de Multer de forma explícita
const handleUpload = (req, res, next) => {
    const uploadMiddleware = upload.single('image');

    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Error de Multer:', err);
            return res.status(400).json({ error: `Error de Multer: ${err.message}` });
        } else if (err) {
            console.error('Error en la subida:', err);
            return res.status(500).json({ error: `Error en la subida: ${err.message}` });
        }
        next();
    });
};


// --- RUTAS ---

router.get('/', (req, res) => {
    db.all("SELECT * FROM images ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error("Error al obtener imágenes:", err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.json(rows);
    });
});

router.post('/', authMiddleware, handleUpload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo o ha sido rechazado.' });
    }

    const description = req.body.description || 'Sin descripción';
    const imagePath = '/uploads/' + req.file.filename;

    db.run(
        "INSERT INTO images (path, description, uploaded_by) VALUES (?, ?, ?)",
        [imagePath, description, req.user.username],
        function (err) {
            if (err) {
                console.error("Error al guardar imagen en BD:", err);
                const physicalPath = path.join(UPLOAD_DIR, req.file.filename);
                fs.unlink(physicalPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al borrar archivo huérfano:', unlinkErr);
                });
                return res.status(500).json({ error: 'Error al guardar la información en la base de datos' });
            }
            res.status(201).json({ 
                message: 'Imagen subida correctamente', 
                image: { id: this.lastID, path: imagePath }
            });
        }
    );
});

module.exports = router;