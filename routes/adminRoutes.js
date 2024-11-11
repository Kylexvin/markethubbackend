const express = require('express');
const {
    getAllProducts,
    getApprovedProducts,
    getApprovedProductsPublic,  // Import the public controller
    approveProduct,
    rejectProduct,
    deleteProduct
} = require('../controllers/adminController');
const { isAdmin, verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public route to get approved products
router.get('/products/approved/public', getApprovedProductsPublic);

// Admin route to get approved products
router.get('/products/approved', verifyToken, isAdmin, getApprovedProducts);

// Get all products for admin review
router.get('/products', verifyToken, isAdmin, getAllProducts);

// Approve a product
router.put('/products/:id/approve', verifyToken, isAdmin, approveProduct);

// Reject a product
router.put('/products/:id/reject', verifyToken, isAdmin, rejectProduct);

// Delete a product
router.delete('/products/:id', verifyToken, isAdmin, deleteProduct);

module.exports = router;
