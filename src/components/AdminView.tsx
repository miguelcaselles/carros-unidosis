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
    Loader2, Trash2, UserPlus, Clock, CheckCircle,
    Activity, BarChart3, CalendarDays, Search,
    ArrowUpRight, AlertCircle, LayoutDashboard
} from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { cn } from "@/lib/utils"

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

export default function AdminView() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")

    const [data, setData] = useState<DashboardData | null>(null)
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [newTechName, setNewTechName] = useState("")
    const [loading, setLoading] = useState(false)
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
        setLoading(true)
        try {
            const [statsRes, techsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/technicians")
            ])

            if (statsRes.ok) setData(await statsRes.json())
            if (techsRes.ok) setTechnicians(await techsRes.json())
        } catch (error) {
            toast.error("Error al cargar datos")
        } finally {
            setLoading(false)
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
        } catch (error) {
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
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge className="bg-green-500 hover:bg-green-600">Completado</Badge>
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">En Curso</Badge>
            default:
                return <Badge variant="outline" className="text-slate-500">Pendiente</Badge>
        }
    }

    const filteredMonitor = data?.monitor.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
                <Card className="w-full max-w-sm shadow-xl border-slate-200">
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
                                className="bg-white"
                            />
                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">
                                Entrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Professional Header */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto max-w-7xl h-16 flex items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-900 p-1.5 rounded-lg">
                            <LayoutDashboard className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">Panel de Control</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500 hidden sm:block">
                            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)} className="text-slate-600 hover:text-red-600">
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-7xl p-4 sm:p-8 space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Completados Hoy</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{data?.stats.totalFilled || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Carros verificados</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">En Progreso</CardTitle>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{data?.stats.inProgress || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Siendo llenados ahora</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Pendientes</CardTitle>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{data?.stats.pending || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Por iniciar</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Tiempo Medio</CardTitle>
                            <Clock className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{data?.stats.avgDuration || 0}s</div>
                            <p className="text-xs text-slate-500 mt-1">Por carro hoy</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="monitor" className="space-y-6">
                    <TabsList className="bg-slate-200/50 p-1 border border-slate-200">
                        <TabsTrigger value="monitor" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Activity className="h-4 w-4 mr-2" /> Monitor Diario
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <BarChart3 className="h-4 w-4 mr-2" /> Estadísticas y Gráficas
                        </TabsTrigger>
                        <TabsTrigger value="technicians" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <UserPlus className="h-4 w-4 mr-2" /> Gestión Técnicos
                        </TabsTrigger>
                    </TabsList>

                    {/* MONITOR TAB */}
                    <TabsContent value="monitor" className="space-y-4">
                        <Card className="border-slate-200 shadow-md">
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
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 hover:bg-slate-50">
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
                                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-bold text-slate-700">{item.name}</TableCell>
                                                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                    <TableCell className="font-medium text-slate-600">{item.technicianName}</TableCell>
                                                    <TableCell className="text-slate-500 font-mono text-xs">{item.startTime}</TableCell>
                                                    <TableCell className="text-slate-500 font-mono text-xs">{item.endTime}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium text-slate-700">{item.duration}</TableCell>
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card className="shadow-md">
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
                                            <Bar dataKey="count" name="Carros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle>Eficiencia Promedio</CardTitle>
                                    <CardDescription>Tiempo medio de llenado por día (segundos)</CardDescription>
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
                                            <Line type="monotone" dataKey="avgTime" name="Tiempo Medio (s)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2 shadow-md bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
                                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                                            <ArrowUpRight className="h-5 w-5 text-green-400" />
                                            Récord del Día
                                        </h3>
                                        <p className="text-slate-300">El llenado más rápido registrado hoy.</p>
                                    </div>
                                    <div className="flex items-center gap-6 bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                        <div>
                                            <p className="text-xs text-slate-300 uppercase tracking-wider">Técnico</p>
                                            <p className="text-xl font-bold">{data?.stats.fastestRecord?.technician.name || "-"}</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20" />
                                        <div>
                                            <p className="text-xs text-slate-300 uppercase tracking-wider">Tiempo</p>
                                            <p className="text-xl font-bold font-mono text-green-400">{data?.stats.fastestRecord ? `${data.stats.fastestRecord.duration}s` : "-"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TECHNICIAN MANAGEMENT TAB */}
                    <TabsContent value="technicians">
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Gestión de Personal</CardTitle>
                                <CardDescription>Añadir o eliminar técnicos activos del sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-1/3 space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <h4 className="font-semibold text-sm mb-4">Añadir Nuevo Técnico</h4>
                                            <form onSubmit={handleAddTechnician} className="space-y-3">
                                                <Input
                                                    placeholder="Nombre y Apellido"
                                                    value={newTechName}
                                                    onChange={(e) => setNewTechName(e.target.value)}
                                                    className="bg-white"
                                                />
                                                <Button type="submit" className="w-full" disabled={!newTechName.trim()}>
                                                    <UserPlus className="h-4 w-4 mr-2" /> Registrar
                                                </Button>
                                            </form>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-2/3">
                                        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
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
                                                            <TableCell><Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Activo</Badge></TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTechnician(tech.id)} className="text-slate-400 hover:text-red-500">
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
