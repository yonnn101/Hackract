import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HackRact API",
      version: "1.0.0",
      description: "HackRact Backend API Documentation"
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server"
      }
    ]
  },

  // 👇 VERY IMPORTANT: correct paths
  apis: [
    "./src/modules/**/*.routes.js",
    "./src/modules/**/*.js"
  ]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
