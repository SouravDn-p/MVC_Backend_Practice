import { Product } from "./product.model";

export const productService = {
  async create(data: any) {
    return await Product.create(data);
  },

  async getAll() {
    return await Product.find();
  },
};
