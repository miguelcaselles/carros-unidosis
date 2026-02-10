import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

function formatDuration(seconds: number | null): string {
    if (seconds == null) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        const technicianId = searchParams.get('technicianId')
        const floor = searchParams.get('floor')
        const status = searchParams.get('status')

        if (!dateFrom || !dateTo) {
            return NextResponse.json(
                { error: 'dateFrom and dateTo are required' },
                { status: 400 }
            )
        }

        const startDate = new Date(dateFrom)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)

        const where: Record<string, unknown> = {
            date: { gte: startDate, lte: endDate }
        }
        if (technicianId) where.technicianId = technicianId
        if (status) where.status = status
        if (floor) where.cart = { floor }

        const records = await prisma.fillRecord.findMany({
            where,
            include: {
                cart: true,
                technician: true
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        })

        const exportData = records.map(r => ({
            fecha: new Date(r.date).toLocaleDateString('es-ES'),
            carro: r.cart.name,
            planta: r.cart.floor,
            tecnico: r.technician.name,
            estado: r.status === 'COMPLETED' ? 'Completado'
                : r.status === 'IN_PROGRESS' ? 'En Curso'
                    : 'Pendiente',
            horaInicio: r.startTime
                ? new Date(r.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : '-',
            horaFin: r.endTime
                ? new Date(r.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : '-',
            duracion: formatDuration(r.duration),
            duracionSegundos: r.duration ?? null,
        }))

        const completed = records.filter(r => r.status === 'COMPLETED')
        const avgDurationSec = completed.length > 0
            ? Math.round(completed.reduce((sum, r) => sum + (r.duration || 0), 0) / completed.length)
            : 0

        const summary = {
            totalRegistros: records.length,
            completados: completed.length,
            enCurso: records.filter(r => r.status === 'IN_PROGRESS').length,
            tiempoMedio: formatDuration(avgDurationSec),
        }

        return NextResponse.json({ records: exportData, summary })
    } catch (error) {
        console.error('Export API error:', error)
        return NextResponse.json({ error: 'Failed to fetch export data' }, { status: 500 })
    }
}
