const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const carts = [
    { name: '0C', floor: '0' },
    { name: '1E', floor: '1' },
    { name: '2A', floor: '2' },
    { name: '2B', floor: '2' },
    { name: '2C', floor: '2' },
    { name: '2D', floor: '2' },
    { name: '2E', floor: '2' },
    { name: '3A', floor: '3' },
    { name: '3B', floor: '3' },
    { name: '3C', floor: '3' },
    { name: '3D', floor: '3' },
    { name: '3E', floor: '3' },
    { name: '3F', floor: '3' },
];

async function main() {
    console.log('Start seeding ...');

    // Seed Carts
    for (const cart of carts) {
        const c = await prisma.cart.upsert({
            where: { name: cart.name },
            update: {},
            create: {
                name: cart.name,
                floor: cart.floor,
            },
        });
        console.log(`Created cart with id: ${c.id}`);
    }

    // Seed Admin Technician (Optional for testing)
    // const tech = await prisma.technician.upsert({
    //   where: { name: 'Admin Test' },
    //   update: {},
    //   create: { name: 'Admin Test' },
    // });

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
