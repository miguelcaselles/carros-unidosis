import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const carts = await prisma.cart.findMany({
            orderBy: { name: 'asc' },
        })
        // Get status for today
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        // We also want to know if there is an active record for today?
        // Actually the requirement is "listado de los carros... y un checkbox para clicar cuando hayan terminado"
        // So we need to know status for each cart for TODAY.

        const cartsWithStatus = await Promise.all(carts.map(async (cart: any) => {
            const record = await prisma.fillRecord.findFirst({
                where: {
                    cartId: cart.id,
                    date: {
                        gte: startOfDay,
                    },
                },
                orderBy: { startTime: 'desc' },
                include: { technician: true }
            })

            return {
                ...cart,
                latestRecord: record,
            }
        }))

        return NextResponse.json(cartsWithStatus)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch carts' }, { status: 500 })
    }
}
