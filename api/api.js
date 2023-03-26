const Fastify = require('fastify');
const cors = require('@fastify/cors');
const fs = require("fs");


module.exports = {
    start: async () => {
        const fastify = Fastify();
        const routeFiles = fs.readdirSync('./api/endpoint').filter(file => file.endsWith('.js'));
        for (const file of routeFiles) {
            let data = require(`./endpoint/${file}`);
            console.log(new Date().toLocaleString(), `Registering route: /${data.method} ${data.path}`);
            fastify.route(data);
        }

        fastify.register(cors, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        });
        await fastify.listen({port: process.env.PORT || 3000});
    }
}
