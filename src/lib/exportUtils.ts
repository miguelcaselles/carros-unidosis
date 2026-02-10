import ExcelJS from 'exceljs'

type ExportRecord = {
    fecha: string
    carro: string
    planta: string
    tecnico: string
    estado: string
    horaInicio: string
    horaFin: string
    duracion: string
    duracionSegundos: number | null
}

type ExportSummary = {
    totalRegistros: number
    completados: number
    enCurso: number
    tiempoMedio: string
}

type ExportFilters = {
    dateFrom: string
    dateTo: string
    technician?: string
    floor?: string
    status?: string
}

const HEADER_FILL: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7F7EFF' }
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 11
}

const SUMMARY_FILL: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0EEFF' }
}

export async function generateXLSX(
    records: ExportRecord[],
    summary: ExportSummary,
    filters: ExportFilters
): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Carros Unidosis - Panel de Control'
    workbook.created = new Date()

    const ws = workbook.addWorksheet('Registros', {
        views: [{ state: 'frozen', ySplit: 7 }]
    })

    // Title
    ws.mergeCells('A1:H1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'Informe de Carros Unidosis'
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF4A4A8A' } }
    titleCell.alignment = { horizontal: 'center' }

    // Subtitle with filters
    ws.mergeCells('A2:H2')
    const subtitleCell = ws.getCell('A2')
    let subtitle = `Periodo: ${filters.dateFrom} - ${filters.dateTo}`
    if (filters.technician) subtitle += ` | Técnico: ${filters.technician}`
    if (filters.floor) subtitle += ` | Planta: ${filters.floor}`
    if (filters.status) subtitle += ` | Estado: ${filters.status}`
    subtitleCell.value = subtitle
    subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF666666' } }
    subtitleCell.alignment = { horizontal: 'center' }

    // Summary section
    const summaryLabels = ['Total Registros', 'Completados', 'En Curso', 'Tiempo Medio']
    const summaryValues: (string | number)[] = [
        summary.totalRegistros,
        summary.completados,
        summary.enCurso,
        summary.tiempoMedio
    ]

    const row4 = ws.getRow(4)
    const row5 = ws.getRow(5)
    summaryLabels.forEach((label, i) => {
        const col = i + 1
        const labelCell = row4.getCell(col)
        labelCell.value = label
        labelCell.font = { bold: true, size: 9, color: { argb: 'FF555555' } }
        labelCell.fill = SUMMARY_FILL
        labelCell.alignment = { horizontal: 'center' }

        const valueCell = row5.getCell(col)
        valueCell.value = summaryValues[i]
        valueCell.font = { bold: true, size: 12 }
        valueCell.alignment = { horizontal: 'center' }
    })

    // Column definitions
    const columns = [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Carro', key: 'carro', width: 10 },
        { header: 'Planta', key: 'planta', width: 10 },
        { header: 'Técnico', key: 'tecnico', width: 22 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Hora Inicio', key: 'horaInicio', width: 14 },
        { header: 'Hora Fin', key: 'horaFin', width: 14 },
        { header: 'Duración', key: 'duracion', width: 14 },
    ]

    ws.columns = columns.map(c => ({ width: c.width, key: c.key }))

    // Header row
    const headerRow = ws.getRow(7)
    columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = col.header
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF5A5AFF' } }
        }
    })
    headerRow.height = 24

    // Data rows
    records.forEach((record, idx) => {
        const rowNum = 8 + idx
        const row = ws.getRow(rowNum)
        row.getCell(1).value = record.fecha
        row.getCell(2).value = record.carro
        row.getCell(3).value = record.planta
        row.getCell(4).value = record.tecnico
        row.getCell(5).value = record.estado
        row.getCell(6).value = record.horaInicio
        row.getCell(7).value = record.horaFin
        row.getCell(8).value = record.duracion

        // Alternating row colors
        if (idx % 2 === 0) {
            for (let c = 1; c <= 8; c++) {
                row.getCell(c).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F7FF' }
                }
            }
        }

        // Color-code status
        const statusCell = row.getCell(5)
        if (record.estado === 'Completado') {
            statusCell.font = { color: { argb: 'FF10B981' }, bold: true }
        } else if (record.estado === 'En Curso') {
            statusCell.font = { color: { argb: 'FF3B82F6' }, bold: true }
        } else {
            statusCell.font = { color: { argb: 'FFF59E0B' } }
        }
    })

    // Auto-filter
    const lastDataRow = 7 + records.length
    ws.autoFilter = {
        from: { row: 7, column: 1 },
        to: { row: lastDataRow, column: 8 }
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    downloadBlob(blob, `carros-unidosis-${todayStr()}.xlsx`)
}

export function generateCSV(records: ExportRecord[]): void {
    const headers = ['Fecha', 'Carro', 'Planta', 'Técnico', 'Estado', 'Hora Inicio', 'Hora Fin', 'Duración']
    const rows = records.map(r => [
        r.fecha, r.carro, r.planta, r.tecnico, r.estado,
        r.horaInicio, r.horaFin, r.duracion
    ])

    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `carros-unidosis-${todayStr()}.csv`)
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function todayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}
