const express = require('express');
const multer  = require('multer');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ══════════════════════════════════════
//  CONFIG MULTER — mémoire tampon uniquement (pas d'écriture disque)
//  Le fichier est ensuite inséré en base et le buffer est libéré.
// ══════════════════════════════════════
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  console.log('📸 Fichier reçu :', file.originalname, '| Type :', file.mimetype);
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log('❌ Format refusé :', file.mimetype);
    cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

async function saveMediaToDb(file, userId) {
  const result = await pool.query(
    `INSERT INTO medias (data, mimetype, taille, nom_original, user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [file.buffer, file.mimetype, file.size, file.originalname, userId]
  );
  return result.rows[0].id;
}

// ══════════════════════════════════════
//  POST /api/upload/image
// ══════════════════════════════════════
router.post('/image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

  try {
    const id  = await saveMediaToDb(req.file, req.user.id);
    const url = `/api/medias/${id}`;
    console.log('✅ Image sauvegardée en base :', url);
    return res.status(201).json({
      message: 'Image uploadée avec succès.',
      url,
      id,
      size: req.file.size,
    });
  } catch (err) {
    console.error('❌ Erreur upload image :', err.message);
    return res.status(500).json({ message: 'Erreur serveur lors de l’upload.' });
  }
});

// ══════════════════════════════════════
//  POST /api/upload/images
// ══════════════════════════════════════
router.post('/images', auth, upload.array('images', 8), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Aucun fichier reçu.' });

  try {
    const urls = [];
    for (const file of req.files) {
      const id = await saveMediaToDb(file, req.user.id);
      urls.push(`/api/medias/${id}`);
    }
    console.log('✅ URLs générées :', urls);
    return res.status(201).json({
      message: `${req.files.length} image(s) uploadée(s).`,
      urls,
    });
  } catch (err) {
    console.error('❌ Erreur upload images :', err.message);
    return res.status(500).json({ message: 'Erreur serveur lors de l’upload.' });
  }
});

// ══════════════════════════════════════
//  POST /api/upload/images/delete  (body: { urls: [...] })
// ══════════════════════════════════════
router.post('/images/delete', auth, async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ message: 'Aucune URL fournie.' });

  try {
    const ids = urls
      .map(u => {
        const m = String(u).match(/\/api\/medias\/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(Boolean);

    if (ids.length > 0) {
      await pool.query(
        `DELETE FROM medias WHERE id = ANY($1::int[]) AND user_id = $2`,
        [ids, req.user.id]
      );
    }
    return res.json({ message: 'Images supprimées.' });
  } catch (err) {
    console.error('❌ Erreur suppression images :', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ══════════════════════════════════════
//  DELETE /api/upload/image/:id
// ══════════════════════════════════════
router.delete('/image/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID invalide.' });

  try {
    const result = await pool.query(
      'DELETE FROM medias WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Image introuvable.' });
    return res.json({ message: 'Image supprimée.' });
  } catch (err) {
    console.error('❌ Erreur suppression :', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
