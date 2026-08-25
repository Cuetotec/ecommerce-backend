const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');

// Ruta protegida: solo accesible con un token válido
router.get('/me', verificarToken, (req, res) => {
    res.json({
        mensaje: 'Acceso autorizado a perfil privado',
        usuarioAutenticado: req.usuario
    });
    });

    module.exports = router;