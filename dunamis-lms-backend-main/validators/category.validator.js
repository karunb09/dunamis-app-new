const { z } = require("zod");
const { nonEmpty } = require("./common");

const createCategorySchema = z.looseObject({
  name: nonEmpty("Name"),
  status: nonEmpty("Status"),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  subcategories: z.any().optional(),
});

const createCategoryFullSchema = z.looseObject({
  name: nonEmpty("Name"),
  status: nonEmpty("Status"),
  subcategories: z.array(z.any(), { error: "Subcategories must be an array." }),
});

module.exports = { createCategorySchema, createCategoryFullSchema };
