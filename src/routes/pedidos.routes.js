const express = require('express');
const router = express.Router();
const { crearPedido } = require('../controllers/pedidos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, crearPedido);

module.exports = router;