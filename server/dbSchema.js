const Joi = require('joi');

const medRecordSchema = Joi.object({
  name: Joi.string().allow('').max(100).required(),
  on: Joi.boolean().required(),
  time: Joi.string().allow('').max(20).required(),
  dose: Joi.string().allow('').max(50).required(),
  note: Joi.string().allow('').max(1000).required()
});

const sessionDataSchema = Joi.object({
  pain_meds: Joi.array().items(medRecordSchema).max(50),
  bleeding_meds: Joi.array().items(medRecordSchema).max(50),
  other_meds: Joi.array().items(medRecordSchema).max(50),
  procs: Joi.array().items(medRecordSchema).max(50),
  bodymap_svg: Joi.string().allow('').max(200000)
})
  .pattern(/^chips:/, Joi.array().items(Joi.string().max(100)).max(100))
  .pattern(/.*/, Joi.alternatives().try(Joi.string().max(500), Joi.boolean()))
  .unknown(false);

const sessionSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  archived: Joi.boolean().default(false)
});

const userSchema = Joi.object({
  token: Joi.string().required(),
  name: Joi.string().min(1).max(50).required()
});

const dbSchema = Joi.object({
  sessions: Joi.array().items(sessionSchema).required(),
  data: Joi.object().pattern(Joi.string(), sessionDataSchema).required(),
  users: Joi.array().items(userSchema).required()
});

module.exports = { dbSchema, sessionDataSchema };
