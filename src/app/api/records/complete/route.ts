import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { recordId } = await request.json()

        const record = await prisma.fillRecord.findUnique({
            where: { id: recordId },
        })

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 })
        }

        const endTime = new Date()
        const duration = Math.round((endTime.getTime() - record.startTime.getTime()) / 1000)

        const updatedRecord = await prisma.fillRecord.update({
            where: { id: recordId },
            data: {
                endTime,
                duration,
                status: 'COMPLETED',
            },
        })

        return NextResponse.json(updatedRecord)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to complete record' }, { status: 500 })
    }
}
