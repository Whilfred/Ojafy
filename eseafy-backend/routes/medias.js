const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ══════════════════════════════════════
//  GET /api/medias/:id  → sert l'image stockée en base
// ══════════════════════════════════════
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID invalide.' });

  try {
    const result = await pool.query(
      'SELECT data, mimetype FROM medias WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Image introuvable.' });

    const media = result.rows[0];
    res.setHeader('Content-Type', media.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(media.data);
  } catch (err) {
    console.error('❌ Erreur lecture media :', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ══════════════════════════════════════
//  DELETE /api/medias/:id
// ══════════════════════════════════════
router.delete('/:id', auth, async (req, res) => {
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
    console.error('❌ Erreur suppression media :', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
