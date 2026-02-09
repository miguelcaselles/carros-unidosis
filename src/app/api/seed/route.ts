import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
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
    ]

    try {
        const technicians = [
            "Ana García", "Carlos López", "María Rodríguez", "Lucía Martinez",
            "Jorge Ruiz", "Elena Diaz", "Pedro Sanchez", "Laura Fernandez"
        ]

        const results = []

        // Seed Carts
        for (const cart of carts) {
            const c = await prisma.cart.upsert({
                where: { name: cart.name },
                update: {},
                create: {
                    name: cart.name,
                    floor: cart.floor,
                },
            })
            results.push(c)
        }

        // Seed Technicians
        for (const name of technicians) {
            await prisma.technician.upsert({
                where: { name },
                update: {},
                create: { name, active: true }
            })
        }

        return NextResponse.json({ message: 'Seeding finished', carts: results, techs: technicians.length })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Seeding failed' }, { status: 500 })
    }
}
