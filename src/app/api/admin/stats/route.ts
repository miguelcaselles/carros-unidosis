import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date')

        // Default to today or user selected date
        const selectedDate = dateParam ? new Date(dateParam) : new Date()
        const startOfDay = new Date(selectedDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(selectedDate)
        endOfDay.setHours(23, 59, 59, 999)

        // 1. LIVE MONITOR: Get all carts with their record for the selected date
        const carts = await prisma.cart.findMany({
            orderBy: { name: 'asc' },
        })

        const cartsStatus = await Promise.all(carts.map(async (cart: any) => {
            const record = await prisma.fillRecord.findFirst({
                where: {
                    cartId: cart.id,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: { technician: true },
                orderBy: { startTime: 'desc' }
            })

            const status = record?.status || 'PENDING'

            return {
                ...cart,
                record,
                status,
                technicianName: record?.technician?.name || '-',
                startTime: record?.startTime ? new Date(record.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                endTime: record?.endTime ? new Date(record.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                duration: record?.duration ? `${record.duration}s` : '-',
            }
        }))

        // 2. TODAY'S TOTALS
        const completedToday = cartsStatus.filter((c: any) => c.status === 'COMPLETED').length
        const inProgressToday = cartsStatus.filter((c: any) => c.status === 'IN_PROGRESS').length
        const pendingToday = cartsStatus.length - completedToday - inProgressToday

        const completedRecords = cartsStatus.filter((c: any) => c.record?.duration).map((c: any) => c.record!)
        const avgDuration = completedRecords.length > 0
            ? completedRecords.reduce((acc: any, curr: any) => acc + (curr.duration || 0), 0) / completedRecords.length
            : 0

        const fastestRecord = completedRecords.sort((a: any, b: any) => (a.duration || 999999) - (b.duration || 999999))[0] || null

        // 3. HISTORICAL STATS (Last 7 days)
        // We'll group by date manually since Prisma w/ SQLite has limited groupBy support for dates
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const recentRecords = await prisma.fillRecord.findMany({
            where: {
                date: { gte: sevenDaysAgo },
                status: 'COMPLETED'
            },
            orderBy: { date: 'asc' }
        })

        // Group by day YYYY-MM-DD
        const chartDataMap = new Map()
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
            // Initialize with 0
            chartDataMap.set(dateStr, { name: dateStr, count: 0, totalDuration: 0, avgTime: 0 })
        }

        recentRecords.forEach((rec: any) => {
            const dateStr = new Date(rec.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
            if (chartDataMap.has(dateStr)) {
                const entry = chartDataMap.get(dateStr)
                entry.count++
                entry.totalDuration += (rec.duration || 0)
            }
        })

        const chartData = Array.from(chartDataMap.values()).map(entry => ({
            ...entry,
            avgTime: entry.count > 0 ? Math.round(entry.totalDuration / entry.count) : 0
        })).reverse()


        return NextResponse.json({
            monitor: cartsStatus,
            stats: {
                totalFilled: completedToday,
                inProgress: inProgressToday,
                pending: pendingToday,
                avgDuration: Math.round(avgDuration),
                fastestRecord,
            },
            chartData
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
