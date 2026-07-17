import Joi from 'joi';

const submitVerificationSchema = Joi.object({
  taxId: Joi.string().required(),
  industry: Joi.string().required(),
  companySize: Joi.string().required(),
  website: Joi.string().uri().required(),
  address: Joi.string().required(),
});

console.log("Validating with http://example.com:", submitVerificationSchema.validate({
  taxId: "12-3456789",
  industry: "Technology",
  companySize: "1-10",
  website: "http://example.com",
  address: "123 Main St"
}).error);

console.log("Validating with example.com:", submitVerificationSchema.validate({
  taxId: "12-3456789",
  industry: "Technology",
  companySize: "1-10",
  website: "example.com",
  address: "123 Main St"
}).error);
