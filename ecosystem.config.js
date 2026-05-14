module.exports = {
  apps: [
    {
      name: "nexus-backend",
      cwd: "./backend",
      script: "npm",
      args: "start",
      env: {
        PORT: 4000,
        NODE_ENV: "production",
      },
    },
    {
      name: "nexus-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      env: {
        PORT: 8080,
        NODE_ENV: "production",
      },
    },
  ],
};
