const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos } = require('../controllers/pedidos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, crearPedido);

router.get('/', verificarToken, obtenerPedidos);

module.exports = router;