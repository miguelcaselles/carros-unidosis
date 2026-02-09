import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { cartId, technicianId } = await request.json()

        // Check if there is already an active record for this cart today?
        // Optionally we can prevent duplicates or just allow it.
        // Let's assume one record per cart per day for simplicity, or just create new.
        // The requirement says "cuando seleccionen su nombre empieza a correr el tiempo".

        const record = await prisma.fillRecord.create({
            data: {
                cartId,
                technicianId,
                startTime: new Date(),
                status: 'IN_PROGRESS',
            },
        })

        return NextResponse.json(record)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to start record' }, { status: 500 })
    }
}
