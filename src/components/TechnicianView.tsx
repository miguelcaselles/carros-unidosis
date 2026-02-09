"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Loader2, Timer, CheckCircle2, User, PlayCircle,
    Stethoscope, CalendarDays, Filter, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

type Technician = {
    id: string
    name: string
    active: boolean
}

type Cart = {
    id: string
    name: string
    floor: string
    latestRecord?: {
        id: string
        status: string
        technicianId: string
        technician: { name: string }
        startTime: string
        endTime?: string
    } | null
}

export default function TechnicianView() {
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [carts, setCarts] = useState<Cart[]>([])
    const [loading, setLoading] = useState(true)

    // State for the "Start Cart" dialog
    const [activeCart, setActiveCart] = useState<Cart | null>(null)
    const [selectedTechForCart, setSelectedTechForCart] = useState<string>("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Filter state
    const [activeTab, setActiveTab] = useState("all")

    // Helper to persist current user selection for convenience in dialog
    const [lastSelectedTech, setLastSelectedTech] = useState<string>("")

    const fetchData = async () => {
        try {
            const [techsRes, cartsRes] = await Promise.all([
                fetch("/api/technicians"),
                fetch("/api/carts"),
            ])

            if (techsRes.ok) setTechnicians(await techsRes.json())
            if (cartsRes.ok) setCarts(await cartsRes.json())
        } catch (error) {
            toast.error("Error cargando datos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000)
        return () => clearInterval(interval)
    }, [])

    const openStartDialog = (cart: Cart) => {
        setActiveCart(cart)
        // Pre-select last used tech for convenience
        setSelectedTechForCart(lastSelectedTech)
        setIsDialogOpen(true)
    }

    const handleStart = async () => {
        if (!activeCart || !selectedTechForCart) return

        setLastSelectedTech(selectedTechForCart) // Remember for next time

        try {
            const res = await fetch("/api/records/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cartId: activeCart.id,
                    technicianId: selectedTechForCart,
                }),
            })

            if (res.ok) {
                toast.success(`Iniciando ${activeCart.name}`)
                setIsDialogOpen(false)
                fetchData()
            } else {
                toast.error("Error al iniciar")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const handleComplete = async (cart: Cart) => {
        if (!cart.latestRecord?.id) return

        try {
            const res = await fetch("/api/records/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recordId: cart.latestRecord.id,
                }),
            })

            if (res.ok) {
                toast.success(`Carro ${cart.name} terminado!`)
                fetchData()
            }
        } catch (error) {
            toast.error("Error al completar")
        }
    }

    const getFilteredCarts = () => {
        switch (activeTab) {
            case "pending":
                return carts.filter(c => !c.latestRecord || (c.latestRecord.status !== 'IN_PROGRESS' && c.latestRecord.status !== 'COMPLETED')) // Simplified logic for pending today
            case "in-progress":
                return carts.filter(c => c.latestRecord?.status === 'IN_PROGRESS')
            case "completed":
                return carts.filter(c => c.latestRecord?.status === 'COMPLETED')
            case "my-carts":
                // This requires knowing "who am I", which we only loosely know via lastSelectedTech
                // For now, we'll just show carts where the last record matches the locally stored tech ID
                if (!lastSelectedTech) return []
                return carts.filter(c => c.latestRecord?.technicianId === lastSelectedTech)
            default:
                return carts
        }
    }

    const filteredCarts = getFilteredCarts()

    // Personal Stats Calculation (based on lastSelectedTech if available)
    const myActiveCarts = lastSelectedTech
        ? carts.filter(c => c.latestRecord?.status === 'IN_PROGRESS' && c.latestRecord.technicianId === lastSelectedTech).length
        : 0

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Glass-morphism Header */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto max-w-7xl h-20 flex items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-none">Estación de Enfermería</h1>
                            <p className="text-sm text-slate-500 font-medium">Gestión de Unidosis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</span>
                            <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide">EN LÍNEA</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-7xl p-4 sm:p-8 space-y-8">

                {/* Welcome / Stats Bar */}
                {lastSelectedTech && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold">Hola, colaborador 👋</h2>
                            <p className="text-blue-100">Tienes <span className="font-bold text-white">{myActiveCarts}</span> carros en curso ahora mismo.</p>
                        </div>
                        {myActiveCarts > 0 && (
                            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 flex items-center gap-3">
                                <Activity className="h-5 w-5 text-blue-200 animate-pulse" />
                                <span className="font-medium">Tu actividad está siendo registrada</span>
                            </div>
                        )}
                    </div>
                )}

                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <TabsList className="bg-white p-1 shadow-sm border border-slate-200 h-11 w-full sm:w-auto">
                            <TabsTrigger value="all" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Todos</TabsTrigger>
                            <TabsTrigger value="in-progress" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">En Curso</TabsTrigger>
                            <TabsTrigger value="pending" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Pendientes</TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">Completados</TabsTrigger>
                            {lastSelectedTech && (
                                <TabsTrigger value="my-carts" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Mis Carros</TabsTrigger>
                            )}
                        </TabsList>

                        <div className="text-sm text-slate-500 font-medium">
                            Mostrando {filteredCarts.length} carros
                        </div>
                    </div>

                    <TabsContent value={activeTab} className="mt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {filteredCarts.map((cart) => {
                                const isCompleted = cart.latestRecord?.status === "COMPLETED"
                                const isInProgress = cart.latestRecord?.status === "IN_PROGRESS"
                                const isMyRecord = cart.latestRecord?.technicianId === lastSelectedTech

                                return (
                                    <Card
                                        key={cart.id}
                                        className={cn(
                                            "group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 ring-1 ring-slate-200",
                                            isCompleted ? "bg-white" :
                                                isInProgress ? "bg-white ring-blue-200 shadow-blue-100" :
                                                    "bg-white"
                                        )}
                                    >
                                        <div className={cn("h-1.5 w-full",
                                            isCompleted ? "bg-green-500" :
                                                isInProgress ? "bg-blue-500 animate-pulse" :
                                                    "bg-slate-200 group-hover:bg-slate-300"
                                        )} />

                                        <CardHeader className="pb-3 pt-5">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="text-slate-500 text-[10px] tracking-wider uppercase font-bold border-slate-200 bg-slate-50">
                                                            Planta {cart.floor}
                                                        </Badge>
                                                        {isCompleted && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px]">Listo</Badge>}
                                                    </div>
                                                    <CardTitle className="text-3xl font-bold text-slate-800 tracking-tight">{cart.name}</CardTitle>
                                                </div>
                                                {isCompleted ? (
                                                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                                                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                                                    </div>
                                                ) : isInProgress ? (
                                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                                                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                                        <PlayCircle className="h-6 w-6 text-slate-300 group-hover:text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pb-4">
                                            {isCompleted ? (
                                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completado por</div>
                                                    <div className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        {cart.latestRecord?.technician?.name || "Desconocido"}
                                                    </div>
                                                    <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-200 pt-2">
                                                        <span>Finalizado:</span>
                                                        <span className="font-mono">{cart.latestRecord?.endTime && new Date(cart.latestRecord.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ) : isInProgress ? (
                                                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">En proceso por</div>
                                                    <div className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                                                        <User className="h-3.5 w-3.5 text-blue-500" />
                                                        {cart.latestRecord?.technician?.name || "..."}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 font-medium animate-pulse">
                                                        <Timer className="h-3.5 w-3.5" />
                                                        Llenando ahora...
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-2">
                                                    <p className="text-sm text-slate-400">Este carro está pendiente de llenado.</p>
                                                </div>
                                            )}
                                        </CardContent>

                                        <CardFooter className="pt-0 pb-5">
                                            {isInProgress ? (
                                                <Button
                                                    className={cn(
                                                        "w-full shadow-md transition-all",
                                                        isMyRecord
                                                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                                                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                                    )}
                                                    onClick={() => isMyRecord ? handleComplete(cart) : toast.error("Este carro lo está llenando otro compañero")}
                                                    disabled={!isMyRecord}
                                                >
                                                    {isMyRecord ? "Terminar Carro" : "Ocupado"}
                                                </Button>
                                            ) : !isCompleted && (
                                                <Button
                                                    className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-semibold"
                                                    onClick={() => openStartDialog(cart)}
                                                >
                                                    Empezar Llenado
                                                </Button>
                                            )}

                                            {isCompleted && (
                                                <Button variant="ghost" className="w-full text-green-600 font-medium hover:text-green-700 hover:bg-green-50" disabled>
                                                    Ver Detalles
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )
                            })}
                        </div>

                        {filteredCarts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 mt-6">
                                <Filter className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No se encontraron carros</p>
                                <p className="text-sm">Prueba cambiando el filtro de estado</p>
                            </div>
                        )}

                    </TabsContent>
                </Tabs>

                {/* Start Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl border-4 border-white shadow-sm">
                                    {activeCart?.name.substring(0, 2)}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl">Iniciar Carro {activeCart?.name}</DialogTitle>
                                    <DialogDescription>
                                        Planta {activeCart?.floor}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="tech-select" className="text-slate-600 font-medium">¿Quién va a llenar este carro?</Label>
                                <Select value={selectedTechForCart} onValueChange={setSelectedTechForCart}>
                                    <SelectTrigger id="tech-select" className="h-12 text-lg">
                                        <SelectValue placeholder="Selecciona tu nombre..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {technicians.filter(t => t.active).map((tech) => (
                                            <SelectItem key={tech.id} value={tech.id} className="text-base py-2">
                                                {tech.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400 mt-1">Tu selección se recordará para el próximo carro.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleStart}
                                disabled={!selectedTechForCart}
                                className="bg-blue-600 hover:bg-blue-700 px-8"
                            >
                                Confirmar e Iniciar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
