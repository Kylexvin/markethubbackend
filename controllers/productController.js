// backend/controllers/productController.js
import Product from "../models/Product.js";

export const addProduct = async (req, res) => {
  try {
    const product = new Product({ ...req.body, seller: req.user._id });
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: "Failed to add product", error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ approved: true }).populate('seller', 'username');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve products" });
  }
};

export const approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product approved", product });
  } catch (error) {
    res.status(500).json({ message: "Error approving product", error: error.message });
  }
};
