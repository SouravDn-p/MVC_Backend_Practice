import Joi from 'joi';

export const updateUserDtoSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  photo: Joi.string().uri().allow(null, ''),
  location: Joi.string().trim().max(255).allow(null, ''),
});

export const updateUserStatusDtoSchema = Joi.object({
  isActive: Joi.boolean().required(),
});
