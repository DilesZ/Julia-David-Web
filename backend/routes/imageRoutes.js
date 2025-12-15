const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// La carpeta de subidas ahora está garantizada por el build command de Render.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

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
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

router.get('/', (req, res) => {
    db.all("SELECT * FROM images ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            console.error('Error al obtener imágenes:', err);
            return res.status(500).json({ error: 'Error al obtener imágenes' });
        }
        res.json(rows);
    });
});

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const description = req.body.description || 'Sin descripción';
    const imagePath = '/uploads/' + req.file.filename;

    db.run(
        "INSERT INTO images (path, description, uploaded_by) VALUES (?, ?, ?)",
        [imagePath, description, req.user.username],
        function (err) {
            if (err) {
                console.error('Error al guardar imagen en BD:', err);
                return res.status(500).json({ error: 'Error al guardar imagen' });
            }

            res.json({
                message: 'Imagen subida correctamente',
                image: {
                    id: this.lastID,
                    path: imagePath,
                    description: description,
                    uploaded_by: req.user.username
                }
            });
        }
    );
});

router.delete('/:id', authMiddleware, (req, res) => {
    const imageId = req.params.id;

    db.get("SELECT * FROM images WHERE id = ?", [imageId], (err, image) => {
        if (err || !image) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        const filePath = path.join(UPLOAD_DIR, path.basename(image.path));

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.run("DELETE FROM images WHERE id = ?", [imageId], (err) => {
            if (err) {
                console.error('Error al eliminar imagen de BD:', err);
                return res.status(500).json({ error: 'Error al eliminar imagen' });
            }
            res.json({ message: 'Imagen eliminada correctamente' });
        });
    });
});

module.exports = router;