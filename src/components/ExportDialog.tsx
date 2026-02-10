"use client"

import { useState } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateXLSX, generateCSV } from "@/lib/exportUtils"

type Technician = { id: string; name: string }

type ExportDialogProps = {
    technicians: Technician[]
}

function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function weekAgoStr() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

export default function ExportDialog({ technicians }: ExportDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [dateFrom, setDateFrom] = useState(weekAgoStr())
    const [dateTo, setDateTo] = useState(todayStr())
    const [technicianId, setTechnicianId] = useState("all")
    const [floor, setFloor] = useState("all")
    const [status, setStatus] = useState("all")
    const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx")

    const handleExport = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ dateFrom, dateTo })
            if (technicianId !== "all") params.set('technicianId', technicianId)
            if (floor !== "all") params.set('floor', floor)
            if (status !== "all") params.set('status', status)

            const res = await fetch(`/api/admin/export?${params}`)
            if (!res.ok) throw new Error('Error al obtener datos')

            const { records, summary } = await res.json()

            if (records.length === 0) {
                toast.warning("No hay registros para los filtros seleccionados")
                setLoading(false)
                return
            }

            const selectedTechName = technicianId !== "all"
                ? technicians.find(t => t.id === technicianId)?.name
                : undefined

            const filters = {
                dateFrom,
                dateTo,
                technician: selectedTechName,
                floor: floor !== "all" ? floor : undefined,
                status: status !== "all"
                    ? (status === 'COMPLETED' ? 'Completado'
                        : status === 'IN_PROGRESS' ? 'En Curso'
                            : 'Pendiente')
                    : undefined,
            }

            if (exportFormat === "xlsx") {
                await generateXLSX(records, summary, filters)
            } else {
                generateCSV(records)
            }

            toast.success(`Archivo ${exportFormat.toUpperCase()} descargado`)
            setOpen(false)
        } catch (error) {
            toast.error("Error al exportar datos")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-white/70 bg-white/50 hover:bg-white/70">
                    <Download className="h-4 w-4" />
                    Exportar Datos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Exportar Estadísticas
                    </DialogTitle>
                    <DialogDescription>
                        Configura los filtros y el formato de exportación
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Technician filter */}
                    <div className="space-y-2">
                        <Label>Técnico</Label>
                        <Select value={technicianId} onValueChange={setTechnicianId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los técnicos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los técnicos</SelectItem>
                                {technicians.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Floor + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Planta</Label>
                            <Select value={floor} onValueChange={setFloor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="0">Planta 0</SelectItem>
                                    <SelectItem value="1">Planta 1</SelectItem>
                                    <SelectItem value="2">Planta 2</SelectItem>
                                    <SelectItem value="3">Planta 3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="COMPLETED">Completado</SelectItem>
                                    <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                        <Label>Formato</Label>
                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "xlsx" | "csv")}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx">Excel (.xlsx) - Formato profesional</SelectItem>
                                <SelectItem value="csv">CSV (.csv) - Formato simple</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleExport}
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {loading ? 'Generando...' : 'Descargar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
