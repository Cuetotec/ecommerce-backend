const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { actualizarPerfil } = require('../controllers/auth.controller')

// Ruta protegida: solo accesible con un token válido
router.get('/me', verificarToken, (req, res) => {
    res.json({
        mensaje: 'Acceso autorizado a perfil privado',
        usuarioAutenticado: req.usuario
    });
});

router.put('/', verificarToken, actualizarPerfil);

    module.exports = router;