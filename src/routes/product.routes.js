const express = require('express');
const router = express.Router();
const { getNearExpirationProducts, getExpiredProducts, updateStock, getLowStockProducts, getProductByBarcode, importProducts, getProduct, getProducts, createProduct, updateProduct, deleteProduct} = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas especiales (deben ir antes de las rutas con :id)
router.get('/low-stock', getLowStockProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.post('/import', importProducts);
router.get('/near-expiration', getNearExpirationProducts); 
router.get('/expired', getExpiredProducts); 

// Rutas CRUD básicas
router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/stock', updateStock);

module.exports = router;