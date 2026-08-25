const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productosRoutes = require('./src/routes/productos.routes');
const authRoutes = require('./src/routes/auth.routes');
const perfilRoutes = require('./src/routes/perfil.routes');
const pedidosRoutes = require('./src/routes/pedidos.routes');

const app = express();

// Middeleware
app.use(cors());
app.use(express.json()); // Permite recibir datos en formato JSON en las peticiones

// Rutas de la API
app.use('/api/productos', productosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.get('/', (req, res) => {
    res.send('API del Ecommerce funcionando correctamente');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});