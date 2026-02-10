"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
    Trash2, UserPlus, Clock, CheckCircle,
    Activity, BarChart3, Search,
    ArrowUpRight, AlertCircle, LayoutDashboard
} from "lucide-react"
import ExportDialog from "@/components/ExportDialog"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

// Types matching the new API response
type MonitorItem = {
    id: string
    name: string
    floor: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
    technicianName: string
    startTime: string
    endTime: string
    duration: string
}

type ChartData = {
    name: string
    count: number // Total Filled
    avgTime: number // Avg Duration
}

type DashboardData = {
    monitor: MonitorItem[]
    stats: {
        totalFilled: number
        inProgress: number
        pending: number
        avgDuration: number
        fastestRecord?: {
            duration: number
            technician: { name: string }
        } | null
    }
    chartData: ChartData[]
}

type Technician = {
    id: string
    name: string
    active: boolean
}

function formatDuration(seconds: number | null | undefined): string {
    if (seconds == null || seconds === 0) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AdminView() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")

    const [data, setData] = useState<DashboardData | null>(null)
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [newTechName, setNewTechName] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === "admin123") {
            setIsAuthenticated(true)
            fetchData()
        } else {
            toast.error("Contraseña incorrecta")
        }
    }

    const fetchData = async () => {
        try {
            const [statsRes, techsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/technicians")
            ])

            if (statsRes.ok) setData(await statsRes.json())
            if (techsRes.ok) setTechnicians(await techsRes.json())
        } catch {
            toast.error("Error al cargar datos")
        }
    }

    // Auto-refresh monitor data every 30s
    useEffect(() => {
        if (isAuthenticated) {
            const interval = setInterval(fetchData, 30000)
            return () => clearInterval(interval)
        }
    }, [isAuthenticated])

    const handleAddTechnician = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTechName.trim()) return

        try {
            const res = await fetch("/api/technicians", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTechName }),
            })

            if (res.ok) {
                toast.success("Técnico añadido")
                setNewTechName("")
                fetchData()
            } else {
                toast.error("Error al añadir")
            }
        } catch {
            toast.error("Error de conexión")
        }
    }

    const handleDeleteTechnician = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este técnico?")) return

        try {
            const res = await fetch(`/api/technicians?id=${id}`, {
                method: "DELETE",
            })

            if (res.ok) {
                toast.success("Técnico eliminado")
                fetchData()
            } else {
                toast.error("Error al eliminar")
            }
        } catch {
            toast.error("Error de conexión")
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completado</Badge>
            case 'IN_PROGRESS':
                return <Badge className="lavender-accent animate-pulse hover:brightness-105">En Curso</Badge>
            default:
                return <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>
        }
    }

    const filteredMonitor = data?.monitor.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <Card className="w-full max-w-sm border-white/70 shadow-[0_24px_60px_-42px_rgba(64,88,168,0.68)]">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Acceso Administrador</CardTitle>
                        <CardDescription className="text-center">Introduce tu contraseña para continuar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Button type="submit" className="w-full">
                                Entrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Professional Header */}
            <header className="sticky top-0 z-30 w-full border-b border-white/60 bg-white/50 backdrop-blur-xl">
                <div className="container mx-auto max-w-7xl h-16 flex items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-2">
                        <div className="lavender-accent rounded-lg p-1.5 shadow-[0_16px_30px_-18px_rgba(89,106,255,0.85)]">
                            <LayoutDashboard className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden text-sm text-muted-foreground sm:block">
                            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)} className="text-muted-foreground hover:text-red-600">
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-7xl p-4 sm:p-8 space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-emerald-500/90">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completados Hoy</CardTitle>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{data?.stats.totalFilled || 0}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Carros verificados</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500/90">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">En Progreso</CardTitle>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{data?.stats.inProgress || 0}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Siendo llenados ahora</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500/90">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{data?.stats.pending || 0}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Por iniciar</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-violet-500/90">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo Medio</CardTitle>
                            <Clock className="h-4 w-4 text-violet-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{formatDuration(data?.stats.avgDuration)}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Por carro hoy</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="monitor" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="monitor">
                            <Activity className="h-4 w-4 mr-2" /> Monitor Diario
                        </TabsTrigger>
                        <TabsTrigger value="analytics">
                            <BarChart3 className="h-4 w-4 mr-2" /> Estadísticas y Gráficas
                        </TabsTrigger>
                        <TabsTrigger value="technicians">
                            <UserPlus className="h-4 w-4 mr-2" /> Gestión Técnicos
                        </TabsTrigger>
                    </TabsList>

                    {/* MONITOR TAB */}
                    <TabsContent value="monitor" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Estado de Planta</CardTitle>
                                    <CardDescription>Visión en tiempo real de todos los carros de unidosis</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar carro o técnico..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-xl border border-white/70 bg-white/38 p-1 backdrop-blur-sm">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[100px]">Carro</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Técnico</TableHead>
                                                <TableHead>Inicio</TableHead>
                                                <TableHead>Fin</TableHead>
                                                <TableHead className="text-right">Tiempo Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMonitor?.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-bold text-foreground">{item.name}</TableCell>
                                                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                    <TableCell className="font-medium text-muted-foreground">{item.technicianName}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{item.startTime}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{item.endTime}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium text-foreground">{item.duration}</TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredMonitor?.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        No se encontraron resultados
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ANALYTICS TAB */}
                    <TabsContent value="analytics" className="space-y-4">
                        <div className="flex justify-end">
                            <ExportDialog technicians={technicians} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Carros Completados (Últimos 7 días)</CardTitle>
                                    <CardDescription>Producción diaria total</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data?.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            />
                                            <Bar dataKey="count" name="Carros" fill="#7f7eff" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Eficiencia Promedio</CardTitle>
                                    <CardDescription>Tiempo medio de llenado por día</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data?.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="avgTime" name="Tiempo Medio" stroke="#6796ff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2 border-none bg-gradient-to-r from-[#8e7dff]/95 to-[#6796ff]/95 text-white shadow-[0_24px_56px_-36px_rgba(89,106,255,0.86)]">
                                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                                            <ArrowUpRight className="h-5 w-5 text-emerald-200" />
                                            Récord del Día
                                        </h3>
                                        <p className="text-blue-100/90">El llenado más rápido registrado hoy.</p>
                                    </div>
                                    <div className="flex items-center gap-6 rounded-lg border border-white/30 bg-white/14 p-4 backdrop-blur-sm">
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-blue-100/80">Técnico</p>
                                            <p className="text-xl font-bold">{data?.stats.fastestRecord?.technician.name || "-"}</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20" />
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-blue-100/80">Tiempo</p>
                                            <p className="text-xl font-bold font-mono text-emerald-200">{data?.stats.fastestRecord ? formatDuration(data.stats.fastestRecord.duration) : "-"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TECHNICIAN MANAGEMENT TAB */}
                    <TabsContent value="technicians">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Personal</CardTitle>
                                <CardDescription>Añadir o eliminar técnicos activos del sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-1/3 space-y-4">
                                        <div className="rounded-xl border border-white/70 bg-white/42 p-4 backdrop-blur-sm">
                                            <h4 className="font-semibold text-sm mb-4">Añadir Nuevo Técnico</h4>
                                            <form onSubmit={handleAddTechnician} className="space-y-3">
                                                <Input
                                                    placeholder="Nombre y Apellido"
                                                    value={newTechName}
                                                    onChange={(e) => setNewTechName(e.target.value)}
                                                />
                                                <Button type="submit" className="w-full" disabled={!newTechName.trim()}>
                                                    <UserPlus className="h-4 w-4 mr-2" /> Registrar
                                                </Button>
                                            </form>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-2/3">
                                        <ScrollArea className="h-[400px] w-full rounded-xl border border-white/70 bg-white/38 p-4 backdrop-blur-sm">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nombre</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {technicians.map((tech) => (
                                                        <TableRow key={tech.id}>
                                                            <TableCell className="font-medium">{tech.name}</TableCell>
                                                            <TableCell><Badge variant="outline" className="border-emerald-200/80 bg-emerald-100/70 text-emerald-700">Activo</Badge></TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTechnician(tech.id)} className="text-muted-foreground hover:text-red-500">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
