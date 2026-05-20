import Joi from 'joi';

export const updateUserDto = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().trim().email().lowercase().optional(),
  role: Joi.string().valid('user', 'admin').optional(),
  isActive: Joi.boolean().optional(),
});
