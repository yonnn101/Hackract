import Joi from 'joi';
import { createOrganizationSchema, submitVerificationSchema } from '../src/modules/Organization/Organization.schema.js';

const mockNameWithPunctuation = "Acme, (Global) Corp.";
const mockWebsite = "https://example.com";

const createVal = createOrganizationSchema.validate({
  name: mockNameWithPunctuation,
  website: mockWebsite,
  industry: "Technology",
  companySize: "1-10",
  addressLine1: "123 Main St",
  taxId: "12-3456789"
});

console.log("Create Organization Schema Validation Result:");
if (createVal.error) {
  console.error("FAIL:", createVal.error.message);
} else {
  console.log("SUCCESS");
}

const verificationVal = submitVerificationSchema.validate({
  taxId: "12-3456789",
  industry: "Technology",
  companySize: "1-10",
  website: mockWebsite,
  address: "123 Main St"
});

console.log("\nSubmit Verification Schema Validation Result:");
if (verificationVal.error) {
  console.error("FAIL:", verificationVal.error.message);
} else {
  console.log("SUCCESS");
}
