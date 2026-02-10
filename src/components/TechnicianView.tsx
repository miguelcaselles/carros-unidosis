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
        } catch {
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
        } catch {
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
        } catch {
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
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-12">
            {/* Glass-morphism Header */}
            <header className="sticky top-0 z-30 w-full border-b border-white/60 bg-white/50 backdrop-blur-xl">
                <div className="container mx-auto max-w-7xl h-20 flex items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="lavender-accent rounded-xl p-2 shadow-[0_16px_30px_-16px_rgba(89,106,255,0.8)]">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground leading-none">Estación de Enfermería</h1>
                            <p className="text-sm text-muted-foreground font-medium">Gestión de Unidosis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</span>
                            <span className="text-sm font-medium text-foreground flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-100/45 px-3 py-1.5 text-emerald-700 backdrop-blur-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide">EN LÍNEA</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-7xl p-4 sm:p-8 space-y-8">

                {/* Welcome / Stats Bar */}
                {lastSelectedTech && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 rounded-2xl border border-white/50 bg-gradient-to-r from-[#8e7dff]/95 to-[#6796ff]/95 p-6 text-white shadow-[0_24px_50px_-32px_rgba(89,106,255,0.85)]">
                        <div>
                            <h2 className="text-2xl font-bold">Hola, colaborador 👋</h2>
                            <p className="text-blue-100">Tienes <span className="font-bold text-white">{myActiveCarts}</span> carros en curso ahora mismo.</p>
                        </div>
                        {myActiveCarts > 0 && (
                            <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/14 px-4 py-2 backdrop-blur-sm">
                                <Activity className="h-5 w-5 text-blue-200 animate-pulse" />
                                <span className="font-medium">Tu actividad está siendo registrada</span>
                            </div>
                        )}
                    </div>
                )}

                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <TabsList className="h-11 w-full sm:w-auto">
                            <TabsTrigger value="all">Todos</TabsTrigger>
                            <TabsTrigger value="in-progress">En Curso</TabsTrigger>
                            <TabsTrigger value="pending">Pendientes</TabsTrigger>
                            <TabsTrigger value="completed">Completados</TabsTrigger>
                            {lastSelectedTech && (
                                <TabsTrigger value="my-carts">Mis Carros</TabsTrigger>
                            )}
                        </TabsList>

                        <div className="text-sm text-muted-foreground font-medium">
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
                                            "group overflow-hidden border-white/70 transition-all duration-300 hover:-translate-y-1",
                                            isCompleted
                                                ? "bg-white/65"
                                                : isInProgress
                                                    ? "bg-blue-100/35 shadow-[0_24px_50px_-36px_rgba(82,139,255,0.85)]"
                                                    : "bg-white/60"
                                        )}
                                    >
                                        <div className={cn("h-1.5 w-full",
                                            isCompleted ? "bg-emerald-500" :
                                                isInProgress ? "lavender-accent animate-pulse" :
                                                    "bg-slate-300/60 group-hover:bg-slate-400/60"
                                        )} />

                                        <CardHeader className="pb-3 pt-5">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-bold">
                                                            Planta {cart.floor}
                                                        </Badge>
                                                        {isCompleted && <Badge className="border-0 bg-emerald-100/90 text-emerald-700 text-[10px] hover:bg-emerald-100/90">Listo</Badge>}
                                                    </div>
                                                    <CardTitle className="text-3xl font-bold text-foreground tracking-tight">{cart.name}</CardTitle>
                                                </div>
                                                {isCompleted ? (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100/80">
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                    </div>
                                                ) : isInProgress ? (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100/65 animate-pulse">
                                                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/65 transition-colors group-hover:bg-white/80">
                                                        <PlayCircle className="h-6 w-6 text-slate-400 group-hover:text-slate-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pb-4">
                                            {isCompleted ? (
                                                <div className="glass-soft rounded-lg p-3">
                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completado por</div>
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {cart.latestRecord?.technician?.name || "Desconocido"}
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between border-t border-white/65 pt-2 text-[10px] text-muted-foreground">
                                                        <span>Finalizado:</span>
                                                        <span className="font-mono">{cart.latestRecord?.endTime && new Date(cart.latestRecord.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ) : isInProgress ? (
                                                <div className="rounded-lg border border-blue-200/70 bg-blue-100/45 p-3 backdrop-blur-sm">
                                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-500">En proceso por</div>
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                                                        <User className="h-3.5 w-3.5 text-blue-600" />
                                                        {cart.latestRecord?.technician?.name || "..."}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-700 animate-pulse">
                                                        <Timer className="h-3.5 w-3.5" />
                                                        Llenando ahora...
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-2">
                                                    <p className="text-sm text-muted-foreground">Este carro está pendiente de llenado.</p>
                                                </div>
                                            )}
                                        </CardContent>

                                        <CardFooter className="pt-0 pb-5">
                                            {isInProgress ? (
                                                <Button
                                                    className={cn(
                                                        "w-full transition-all",
                                                        isMyRecord
                                                            ? "lavender-accent text-white shadow-[0_12px_24px_-16px_rgba(89,106,255,0.85)] hover:brightness-105"
                                                            : "border border-blue-300/70 bg-blue-50/55 text-blue-700 hover:bg-blue-100/65"
                                                    )}
                                                    onClick={() => handleComplete(cart)}
                                                >
                                                    Terminar Carro
                                                </Button>
                                            ) : !isCompleted && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-white/70 bg-white/50 font-semibold text-foreground hover:border-blue-300/80 hover:text-blue-700 hover:bg-blue-100/55"
                                                    onClick={() => openStartDialog(cart)}
                                                >
                                                    Empezar Llenado
                                                </Button>
                                            )}

                                            {isCompleted && (
                                                <Button variant="ghost" className="w-full font-medium text-emerald-700 hover:bg-emerald-100/60 hover:text-emerald-800" disabled>
                                                    Ver Detalles
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )
                            })}
                        </div>

                        {filteredCarts.length === 0 && (
                            <div className="glass-soft mt-6 flex flex-col items-center justify-center rounded-2xl border-dashed py-20 text-muted-foreground">
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
                                <div className="lavender-accent flex h-12 w-12 items-center justify-center rounded-full border-4 border-white/80 text-xl font-bold text-white shadow-[0_10px_20px_-12px_rgba(89,106,255,0.85)]">
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
                                <Label htmlFor="tech-select" className="font-medium text-muted-foreground">¿Quién va a llenar este carro?</Label>
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
                                <p className="mt-1 text-xs text-muted-foreground">Tu selección se recordará para el próximo carro.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleStart}
                                disabled={!selectedTechForCart}
                                className="px-8"
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
