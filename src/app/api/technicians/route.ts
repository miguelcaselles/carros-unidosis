import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const technicians = await prisma.technician.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(technicians)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json()
        const technician = await prisma.technician.create({
            data: { name },
        })
        return NextResponse.json(technician)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create technician' }, { status: 500 })
    }
}
