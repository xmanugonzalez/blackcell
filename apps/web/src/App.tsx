import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Building2,
  Banknote,
  CreditCard,
  EllipsisVertical,
  Eye,
  EyeOff,
  ExternalLink,
  HeartHandshake,
  Home,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  Moon,
  PackagePlus,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Star,
  Sun,
  Trash2,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  formatGuarani,
  type ApiResponse,
  type AuthSession,
  type AuthUser,
  type Customer as CustomerDto,
  type CustomerInput,
  type LoginInput,
} from '@black-cell/shared'
import heroForDarkTheme from './assets/blackcell-dashboard-hero-on-dark.webp'
import heroForLightTheme from './assets/blackcell-dashboard-hero-on-light.webp'
import logoForDarkTheme from './assets/blackcell-logo-on-dark.svg'
import logoForLightTheme from './assets/blackcell-logo-on-light.svg'
import loginVisualForDarkTheme from './assets/blackcell-login-visual-on-dark.webp'
import loginVisualForLightTheme from './assets/blackcell-login-visual-on-light.webp'
import loginBackgroundForDarkTheme from './assets/blackcell-login-background-on-dark.webp'
import loginBackgroundForLightTheme from './assets/blackcell-login-background-on-light.webp'
import loginLogo from './assets/logo.svg'

const iconStroke = 1.8
type Theme = 'light' | 'dark'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña').min(8, 'La contraseña debe tener al menos 8 caracteres'),
  remember: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const shoppingItemFormSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del producto'),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a cero'),
  supplier: z.string().trim().max(80, 'El proveedor es demasiado largo'),
  estimatedUnitCost: z.number().int().min(0, 'El costo no puede ser negativo'),
  priority: z.enum(['high', 'medium', 'low']),
  productUrl: z.string().trim().max(500, 'El enlace es demasiado largo').refine(
    (value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value),
    'Ingresa un enlace válido que comience con http:// o https://',
  ).optional(),
  notes: z.string().trim().max(180, 'Las notas no pueden superar 180 caracteres'),
})

const shoppingItemSchema = shoppingItemFormSchema.extend({
  id: z.string(),
  purchased: z.boolean(),
  createdAt: z.string(),
})

const shoppingListSchema = z.array(shoppingItemSchema)
type ShoppingItemFormValues = z.infer<typeof shoppingItemFormSchema>
type ShoppingItem = z.infer<typeof shoppingItemSchema>
type ShoppingListFilter = 'pending' | 'purchased' | 'all'

const shoppingListStorageKey = 'black-cell-shopping-list'
const priorityLabels: Record<ShoppingItem['priority'], string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const supplierFormSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del proveedor'),
  contactName: z.string().trim().max(80, 'El contacto es demasiado largo'),
  phone: z.string().trim().max(32, 'El teléfono es demasiado largo'),
  email: z.string().trim().max(120, 'El correo es demasiado largo').refine(
    (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Ingresa un correo válido',
  ),
  city: z.string().trim().max(80, 'La ciudad es demasiado larga'),
  category: z.enum(['parts', 'accessories', 'devices', 'services']),
  status: z.enum(['preferred', 'active', 'inactive']),
  paymentTerms: z.string().trim().max(80, 'La condición de pago es demasiado larga'),
  website: z.string().trim().max(500, 'El enlace es demasiado largo').refine(
    (value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value),
    'Ingresa un enlace válido que comience con http:// o https://',
  ),
  notes: z.string().trim().max(240, 'Las notas no pueden superar 240 caracteres'),
})

const supplierSchema = supplierFormSchema.extend({
  id: z.string(),
  createdAt: z.string(),
})

const suppliersSchema = z.array(supplierSchema)
type SupplierFormValues = z.infer<typeof supplierFormSchema>
type Supplier = z.infer<typeof supplierSchema>
type SupplierFilter = Supplier['status'] | 'all'

const suppliersStorageKey = 'black-cell-suppliers'
const supplierCategoryLabels: Record<Supplier['category'], string> = {
  parts: 'Repuestos',
  accessories: 'Accesorios',
  devices: 'Equipos',
  services: 'Servicios',
}

const supplierStatusLabels: Record<Supplier['status'], string> = {
  preferred: 'Preferido',
  active: 'Activo',
  inactive: 'Inactivo',
}

const inventoryItemFormSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del producto'),
  sku: z.string().trim().min(2, 'Ingresa un código o SKU').max(40, 'El código es demasiado largo'),
  category: z.enum(['parts', 'accessories', 'devices', 'tools']),
  supplier: z.string().trim().max(80, 'El proveedor es demasiado largo'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  minimumStock: z.number().int().min(0, 'El mínimo no puede ser negativo'),
  unitCost: z.number().int().min(0, 'El costo no puede ser negativo'),
  salePrice: z.number().int().min(0, 'El precio no puede ser negativo'),
  location: z.string().trim().max(80, 'La ubicación es demasiado larga'),
  notes: z.string().trim().max(240, 'Las notas no pueden superar 240 caracteres'),
})

const inventoryItemSchema = inventoryItemFormSchema.extend({
  id: z.string(),
  createdAt: z.string(),
})

const inventoryItemsSchema = z.array(inventoryItemSchema)
type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>
type InventoryItem = z.infer<typeof inventoryItemSchema>
type InventoryStockStatus = 'available' | 'low' | 'out'
type InventoryFilter = InventoryStockStatus | 'all'

const inventoryStorageKey = 'black-cell-inventory'
const inventoryCategoryLabels: Record<InventoryItem['category'], string> = {
  parts: 'Repuestos',
  accessories: 'Accesorios',
  devices: 'Equipos',
  tools: 'Herramientas',
}

const inventoryStatusLabels: Record<InventoryStockStatus, string> = {
  available: 'Disponible',
  low: 'Bajo stock',
  out: 'Agotado',
}

const saleFormSchema = z.object({
  customerName: z.string().trim().min(2, 'Ingresa el nombre del cliente'),
  productName: z.string().trim().min(2, 'Ingresa el producto vendido'),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a cero'),
  unitPrice: z.number().int().min(0, 'El precio no puede ser negativo'),
  paymentMethod: z.enum(['cash', 'transfer', 'card']),
  status: z.enum(['paid', 'partial', 'pending']),
  notes: z.string().trim().max(240, 'Las notas no pueden superar 240 caracteres'),
})

const saleSchema = saleFormSchema.extend({
  id: z.string(),
  number: z.string(),
  createdAt: z.string(),
})

const salesSchema = z.array(saleSchema)
type SaleFormValues = z.infer<typeof saleFormSchema>
type Sale = z.infer<typeof saleSchema>
type SaleFilter = Sale['status'] | 'all'

const salesStorageKey = 'black-cell-sales'
const saleStatusLabels: Record<Sale['status'], string> = {
  paid: 'Pagada',
  partial: 'Parcial',
  pending: 'Pendiente',
}

const paymentMethodLabels: Record<Sale['paymentMethod'], string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

const customerFormSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del cliente'),
  documentNumber: z.string().trim().max(32, 'El documento es demasiado largo'),
  phone: z.string().trim().max(32, 'El teléfono es demasiado largo'),
  email: z.string().trim().max(120, 'El correo es demasiado largo').refine(
    (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Ingresa un correo válido',
  ),
  city: z.string().trim().max(80, 'La ciudad es demasiado larga'),
  customerType: z.enum(['regular', 'frequent', 'business']),
  status: z.enum(['active', 'vip', 'inactive']),
  lastDevice: z.string().trim().max(90, 'El equipo es demasiado largo'),
  notes: z.string().trim().max(240, 'Las notas no pueden superar 240 caracteres'),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>
type Customer = CustomerDto
type CustomerFilter = Customer['status'] | 'all'

const customerTypeLabels: Record<Customer['customerType'], string> = {
  regular: 'Regular',
  frequent: 'Frecuente',
  business: 'Empresa',
}

const customerStatusLabels: Record<Customer['status'], string> = {
  active: 'Activo',
  vip: 'VIP',
  inactive: 'Inactivo',
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json() as ApiResponse<T>

  if (!payload.ok) {
    throw new Error(payload.error.message)
  }

  return payload.data
}

function getCustomers() {
  return apiRequest<Customer[]>('/clientes')
}

function createCustomer(customer: CustomerInput) {
  return apiRequest<Customer>('/clientes', {
    method: 'POST',
    body: JSON.stringify(customer),
  })
}

function deleteCustomer(id: string) {
  return apiRequest<void>(`/clientes/${id}`, { method: 'DELETE' })
}

function getCurrentSession() {
  return apiRequest<AuthSession>('/auth/me')
}

function login(input: LoginInput) {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

function logout() {
  return apiRequest<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' })
}

const moduleRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
}).catchall(z.string())

const moduleRecordsSchema = z.array(moduleRecordSchema)
type ModuleRecord = z.infer<typeof moduleRecordSchema>
type ModuleFormValues = Record<string, string>
type ModuleField = {
  name: string
  label: string
  placeholder: string
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select'
  required?: boolean
  fullWidth?: boolean
  options?: readonly { value: string; label: string }[]
}
type ModuleColumn = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  kind?: 'money' | 'status'
}
type SimpleModuleConfig = {
  title: string
  subtitle: string
  storageKey: string
  ctaLabel: string
  dialogTitle: string
  dialogSubtitle: string
  emptyTitle: string
  emptySubtitle: string
  icon: LucideIcon
  numberPrefix?: string
  primaryField: string
  secondaryField?: string
  searchableFields: string[]
  fields: ModuleField[]
  columns: ModuleColumn[]
  statusField?: string
  statusLabels?: Record<string, string>
  statusClassPrefix?: string
  filters?: readonly { value: string; label: string }[]
  metrics: readonly {
    label: string
    value: (records: ModuleRecord[]) => string
  }[]
}

const repairStatusLabels = {
  diagnosis: 'Diagnóstico',
  repair: 'En reparación',
  waiting: 'Esperando repuesto',
  ready: 'Listo',
} as const

const cashStatusLabels = {
  open: 'Abierta',
  closed: 'Cerrada',
} as const

const expenseStatusLabels = {
  paid: 'Pagado',
  pending: 'Pendiente',
} as const

const userStatusLabels = {
  active: 'Activo',
  inactive: 'Inactivo',
} as const

const settingsStatusLabels = {
  enabled: 'Activo',
  disabled: 'Inactivo',
} as const

const navigation = [
  {
    label: 'Principal',
    items: [{ label: 'Dashboard', icon: Home, path: '/' }],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Reparaciones', icon: Wrench, path: '/reparaciones', badge: '18' },
      { label: 'Clientes', icon: Users, path: '/clientes' },
      { label: 'Ventas', icon: ShoppingCart, path: '/ventas' },
      { label: 'Inventario', icon: Boxes, path: '/inventario', badge: '9' },
      { label: 'Proveedores', icon: Truck, path: '/proveedores' },
      { label: 'Compras', icon: PackagePlus, path: '/compras' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Caja', icon: ReceiptText, path: '/caja' },
      { label: 'Gastos', icon: WalletCards, path: '/gastos' },
      { label: 'Reportes', icon: BarChart3, path: '/reportes' },
      { label: 'Usuarios', icon: Users, path: '/usuarios' },
      { label: 'Configuración', icon: Settings, path: '/configuracion' },
    ],
  },
]

const repairActivity = [
  { number: 'REP-000184', customer: 'Diego Benítez', device: 'iPhone 13 Pro', status: 'En diagnóstico', tone: 'warning' },
  { number: 'REP-000183', customer: 'Laura Giménez', device: 'Samsung S23', status: 'Listo', tone: 'success' },
  { number: 'REP-000182', customer: 'Marcos Ferreira', device: 'Xiaomi Note 12', status: 'En reparación', tone: 'primary' },
  { number: 'REP-000181', customer: 'Ana Cabrera', device: 'iPhone 11', status: 'Esperando repuesto', tone: 'neutral' },
]

const inventoryAlerts = [
  { name: 'Display iPhone 11', sku: 'DIS-IP11-INC', stock: 2, minimum: 5 },
  { name: 'Batería Samsung A52', sku: 'BAT-SA52', stock: 1, minimum: 4 },
  { name: 'Cable USB-C 1 m', sku: 'CAB-USBC-1M', stock: 3, minimum: 10 },
]

const monthSales = [52, 70, 43, 78, 61, 89, 68, 94, 76, 100, 83, 91]

const routeTitles: Record<string, string> = Object.fromEntries(
  navigation.flatMap((section) => section.items.map((item) => [item.path, item.label])),
)

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`dashboard-card ${className}`}>{children}</section>
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div>
        <h2 className="text-primary text-[15px] font-semibold">{title}</h2>
        {subtitle ? <p className="text-muted mt-1 text-xs">{subtitle}</p> : null}
      </div>
      {action ?? (
        <button className="icon-button -mr-2 -mt-2" type="button" aria-label={`Opciones de ${title}`}>
          <EllipsisVertical size={18} strokeWidth={iconStroke} />
        </button>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  downward = false,
}: {
  title: string
  value: string
  change: string
  icon: typeof ShoppingBag
  downward?: boolean
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="metric-icon mb-4 grid h-10 w-10 place-items-center rounded-lg">
        <Icon size={21} strokeWidth={iconStroke} />
      </div>
      <p className="text-secondary text-sm">{title}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <strong className="text-primary text-[22px] font-medium">{value}</strong>
        <span className={`metric-trend flex items-center text-xs font-medium ${downward ? 'metric-trend--down' : ''}`}>
          {downward ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {change}
        </span>
      </div>
    </Card>
  )
}

function DashboardPage({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="relative min-h-52 overflow-hidden xl:col-span-8">
          <div className="relative z-[1] max-w-[62%] p-6 sm:p-7">
            <h2 className="text-primary text-xl font-semibold">¡Buen trabajo, equipo BlackCell!</h2>
            <p className="text-secondary mt-3 max-w-md text-sm leading-6">
              Hoy ingresaron 7 reparaciones y ya completaron 12 ventas. Hay 4 equipos listos para entregar.
            </p>
            <NavLink className="primary-button mt-5 inline-flex" to="/reparaciones">
              Ver reparaciones
            </NavLink>
          </div>
          <div className="hero-visual absolute inset-y-0 right-0 w-[42%] overflow-hidden">
            <img
              className="absolute inset-0 h-full w-full object-cover object-center"
              src={theme === 'dark' ? heroForDarkTheme : heroForLightTheme}
              alt="Teléfono BlackCell preparado para reparación"
            />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-6 xl:col-span-4">
          <MetricCard title="Ventas de hoy" value={formatGuarani(2450000)} change="18,2%" icon={ShoppingBag} />
          <MetricCard title="Gastos" value={formatGuarani(380000)} change="6,4%" icon={WalletCards} downward />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="Rendimiento mensual" subtitle="Ventas registradas en los últimos 12 meses" />
          <div className="px-5 pb-6 pt-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-muted text-xs">Total acumulado</p>
                <p className="text-primary mt-1 text-2xl font-medium">{formatGuarani(28640000)}</p>
              </div>
              <span className="metric-change flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium">
                <ArrowUpRight size={14} /> 14,8%
              </span>
            </div>
            <div className="mt-8 flex h-44 items-end gap-2 sm:gap-3" aria-label="Gráfico de ventas mensuales">
              {monthSales.map((height, index) => (
                <div className="group flex h-full flex-1 items-end" key={`${height}-${index}`}>
                  <div
                    className="chart-bar w-full rounded-t-md transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${height}% del máximo mensual`}
                  />
                </div>
              ))}
            </div>
            <div className="text-muted mt-3 grid grid-cols-12 text-center text-[10px]">
              {['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'].map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Estado de reparaciones" subtitle="18 órdenes abiertas" />
          <div className="flex flex-col items-center px-6 pb-6 pt-5">
            <div className="repair-ring" role="img" aria-label="67 por ciento de reparaciones en proceso">
              <div className="repair-ring__center">
                <strong>67%</strong>
                <span>En proceso</span>
              </div>
            </div>
            <div className="mt-7 grid w-full grid-cols-3 gap-2 text-center">
              <div><strong className="text-primary block text-base">6</strong><span className="text-muted text-[11px]">Diagnóstico</span></div>
              <div><strong className="text-primary block text-base">8</strong><span className="text-muted text-[11px]">Reparación</span></div>
              <div><strong className="text-primary block text-base">4</strong><span className="text-muted text-[11px]">Listos</span></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <CardHeader
            title="Reparaciones recientes"
            subtitle="Últimos movimientos del taller"
            action={<NavLink className="text-primary text-xs font-medium hover:underline" to="/reparaciones">Ver todas</NavLink>}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Equipo</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {repairActivity.map((repair) => (
                  <tr className="table-row" key={repair.number}>
                    <td className="text-primary px-6 py-4 font-medium">{repair.number}</td>
                    <td className="text-primary px-4 py-4">{repair.customer}</td>
                    <td className="text-secondary px-4 py-4">{repair.device}</td>
                    <td className="px-6 py-4"><span className={`status-badge status-badge--${repair.tone}`}>{repair.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader
            title="Stock crítico"
            subtitle="Productos bajo el mínimo"
            action={<NavLink className="text-primary text-xs font-medium hover:underline" to="/inventario">Inventario</NavLink>}
          />
          <div className="inventory-list px-5 pb-3 pt-3 sm:px-6">
            {inventoryAlerts.map((item) => (
              <div className="flex items-center gap-3 py-4" key={item.sku}>
                <div className="metric-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                  <Boxes size={19} strokeWidth={iconStroke} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-primary truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted mt-0.5 text-[11px]">{item.sku}</p>
                </div>
                <div className="text-right">
                  <strong className="text-primary text-sm">{item.stock}</strong>
                  <p className="text-muted text-[10px]">mín. {item.minimum}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function readShoppingList(): ShoppingItem[] {
  const storedItems = window.localStorage.getItem(shoppingListStorageKey)
  if (!storedItems) return []

  try {
    const result = shoppingListSchema.safeParse(JSON.parse(storedItems))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>(readShoppingList)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<ShoppingListFilter>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ShoppingItemFormValues>({
    defaultValues: {
      name: '',
      quantity: 1,
      supplier: '',
      estimatedUnitCost: 0,
      priority: 'medium',
      productUrl: '',
      notes: '',
    },
  })

  useEffect(() => {
    window.localStorage.setItem(shoppingListStorageKey, JSON.stringify(items))
  }, [items])

  const pendingItems = items.filter((item) => !item.purchased)
  const purchasedItems = items.filter((item) => item.purchased)
  const estimatedTotal = pendingItems.reduce(
    (total, item) => total + item.quantity * item.estimatedUnitCost,
    0,
  )

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'purchased' ? item.purchased : !item.purchased)
      const matchesSearch = !normalizedSearch
        || item.name.toLocaleLowerCase('es').includes(normalizedSearch)
        || item.supplier.toLocaleLowerCase('es').includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [filter, items, searchTerm])

  const closeForm = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit: SubmitHandler<ShoppingItemFormValues> = (values) => {
    const result = shoppingItemFormSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && field in values) {
          setError(field as keyof ShoppingItemFormValues, { message: issue.message })
        }
      })
      return
    }

    setItems((currentItems) => [{
      ...result.data,
      id: crypto.randomUUID(),
      purchased: false,
      createdAt: new Date().toISOString(),
    }, ...currentItems])
    closeForm()
  }

  const togglePurchased = (id: string) => {
    setItems((currentItems) => currentItems.map((item) => (
      item.id === id ? { ...item, purchased: !item.purchased } : item
    )))
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">Lista de compras</h2>
          <p className="text-secondary mt-1 text-sm">Organiza lo que necesitas comprar próximamente.</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          Agregar producto
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-muted text-xs">Pendientes</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{pendingItems.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Comprados</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{purchasedItems.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Costo pendiente estimado</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(estimatedTotal)}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor="shopping-list-search">
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id="shopping-list-search"
              type="search"
              placeholder="Buscar producto o proveedor"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="shopping-filter" aria-label="Filtrar lista">
            {([
              ['pending', 'Pendientes'],
              ['purchased', 'Comprados'],
              ['all', 'Todos'],
            ] as const).map(([value, label]) => (
              <button
                className={filter === value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="w-16 px-6 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-center font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 text-right font-medium">Estimado</th>
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr className={`table-row shopping-row ${item.purchased ? 'shopping-row--purchased' : ''}`} key={item.id}>
                    <td className="px-6 py-4">
                      <button
                        className="shopping-check"
                        type="button"
                        aria-label={item.purchased ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`}
                        title={item.purchased ? 'Marcar como pendiente' : 'Marcar como comprado'}
                        onClick={() => togglePurchased(item.id)}
                      >
                        {item.purchased ? <CheckCircle2 size={21} strokeWidth={2} /> : <span />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-primary font-medium">{item.name}</p>
                        {item.productUrl ? (
                          <a
                            className="shopping-product-link"
                            href={item.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Abrir enlace de ${item.name}`}
                            title="Abrir enlace del producto"
                          >
                            <ExternalLink size={15} strokeWidth={iconStroke} />
                          </a>
                        ) : null}
                      </div>
                      {item.notes ? <p className="text-muted mt-1 max-w-xs truncate text-[11px]">{item.notes}</p> : null}
                    </td>
                    <td className="text-secondary px-4 py-4">{item.supplier || 'Sin definir'}</td>
                    <td className="text-primary px-4 py-4 text-center">{item.quantity}</td>
                    <td className="px-4 py-4">
                      <span className={`status-badge shopping-priority--${item.priority}`}>{priorityLabels[item.priority]}</span>
                    </td>
                    <td className="text-primary px-4 py-4 text-right font-medium">
                      {formatGuarani(item.quantity * item.estimatedUnitCost)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="icon-button shopping-delete"
                        type="button"
                        aria-label={`Eliminar ${item.name}`}
                        title="Eliminar"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={17} strokeWidth={iconStroke} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <ShoppingCart size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">
              {items.length ? 'No hay coincidencias' : 'Tu lista está vacía'}
            </h3>
            <p className="text-muted mt-1 text-xs">
              {items.length ? 'Prueba con otro filtro o término de búsqueda.' : 'Agrega el primer producto que planeas comprar.'}
            </p>
            {!items.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> Agregar producto
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="shopping-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id="shopping-dialog-title">Agregar producto</h2>
                <p className="text-muted mt-1 text-xs">Registra lo necesario para planificar la compra.</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="form-field sm:col-span-2">
                <label htmlFor="shopping-name">Producto *</label>
                <input className="shopping-input" id="shopping-name" autoFocus placeholder="Ej. Display iPhone 13" {...register('name')} />
                {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="shopping-quantity">Cantidad *</label>
                <input className="shopping-input" id="shopping-quantity" type="number" min="1" {...register('quantity', { valueAsNumber: true })} />
                {errors.quantity ? <p className="field-error">{errors.quantity.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="shopping-cost">Costo unitario estimado</label>
                <div className="shopping-money-input">
                  <span>₲</span>
                  <input id="shopping-cost" type="number" min="0" step="1000" {...register('estimatedUnitCost', { valueAsNumber: true })} />
                </div>
                {errors.estimatedUnitCost ? <p className="field-error">{errors.estimatedUnitCost.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="shopping-supplier">Proveedor</label>
                <input className="shopping-input" id="shopping-supplier" placeholder="Opcional" {...register('supplier')} />
              </div>
              <div className="form-field">
                <label htmlFor="shopping-priority">Prioridad</label>
                <select className="shopping-input" id="shopping-priority" {...register('priority')}>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="shopping-url">Enlace del producto</label>
                <div className="shopping-icon-input">
                  <ExternalLink size={17} strokeWidth={iconStroke} aria-hidden="true" />
                  <input id="shopping-url" type="url" placeholder="https://tienda.com/producto" {...register('productUrl')} />
                </div>
                {errors.productUrl ? <p className="field-error">{errors.productUrl.message}</p> : null}
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="shopping-notes">Notas</label>
                <textarea className="shopping-input shopping-notes resize-y py-3" id="shopping-notes" placeholder="Modelo, color, referencia u otra información" {...register('notes')} />
                {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit">
                  <Check size={16} strokeWidth={iconStroke} /> Guardar producto
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function readSuppliers(): Supplier[] {
  const storedSuppliers = window.localStorage.getItem(suppliersStorageKey)
  if (!storedSuppliers) return []

  try {
    const result = suppliersSchema.safeParse(JSON.parse(storedSuppliers))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(readSuppliers)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<SupplierFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    defaultValues: {
      name: '',
      contactName: '',
      phone: '',
      email: '',
      city: '',
      category: 'parts',
      status: 'active',
      paymentTerms: '',
      website: '',
      notes: '',
    },
  })

  useEffect(() => {
    window.localStorage.setItem(suppliersStorageKey, JSON.stringify(suppliers))
  }, [suppliers])

  const activeSuppliers = suppliers.filter((supplier) => supplier.status !== 'inactive')
  const preferredSuppliers = suppliers.filter((supplier) => supplier.status === 'preferred')
  const suppliersWithContact = suppliers.filter((supplier) => supplier.phone || supplier.email)

  const visibleSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return suppliers.filter((supplier) => {
      const matchesFilter = filter === 'all' || supplier.status === filter
      const matchesSearch = !normalizedSearch
        || supplier.name.toLocaleLowerCase('es').includes(normalizedSearch)
        || supplier.contactName.toLocaleLowerCase('es').includes(normalizedSearch)
        || supplier.phone.toLocaleLowerCase('es').includes(normalizedSearch)
        || supplier.email.toLocaleLowerCase('es').includes(normalizedSearch)
        || supplier.city.toLocaleLowerCase('es').includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [filter, searchTerm, suppliers])

  const closeForm = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit: SubmitHandler<SupplierFormValues> = (values) => {
    const result = supplierFormSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && field in values) {
          setError(field as keyof SupplierFormValues, { message: issue.message })
        }
      })
      return
    }

    setSuppliers((currentSuppliers) => [{
      ...result.data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }, ...currentSuppliers])
    closeForm()
  }

  const removeSupplier = (id: string) => {
    setSuppliers((currentSuppliers) => currentSuppliers.filter((supplier) => supplier.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">Proveedores</h2>
          <p className="text-secondary mt-1 text-sm">Administra contactos, categorías y condiciones de compra.</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          Agregar proveedor
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-muted text-xs">Activos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{activeSuppliers.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Preferidos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{preferredSuppliers.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Con contacto</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{suppliersWithContact.length}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor="supplier-search">
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id="supplier-search"
              type="search"
              placeholder="Buscar proveedor, contacto, teléfono o ciudad"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="shopping-filter" aria-label="Filtrar proveedores">
            {([
              ['all', 'Todos'],
              ['preferred', 'Preferidos'],
              ['active', 'Activos'],
              ['inactive', 'Inactivos'],
            ] as const).map(([value, label]) => (
              <button
                className={filter === value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleSuppliers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleSuppliers.map((supplier) => (
                  <tr className="table-row" key={supplier.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="supplier-avatar grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                          {supplier.status === 'preferred' ? (
                            <Star size={18} strokeWidth={iconStroke} />
                          ) : (
                            <Building2 size={18} strokeWidth={iconStroke} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-primary truncate font-medium">{supplier.name}</p>
                            {supplier.website ? (
                              <a
                                className="shopping-product-link"
                                href={supplier.website}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Abrir sitio web de ${supplier.name}`}
                                title="Abrir sitio web"
                              >
                                <ExternalLink size={15} strokeWidth={iconStroke} />
                              </a>
                            ) : null}
                          </div>
                          {supplier.notes ? <p className="text-muted mt-1 max-w-xs truncate text-[11px]">{supplier.notes}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-primary font-medium">{supplier.contactName || 'Sin contacto'}</p>
                      <div className="supplier-contact-list mt-1">
                        {supplier.phone ? (
                          <span><Phone size={12} strokeWidth={iconStroke} /> {supplier.phone}</span>
                        ) : null}
                        {supplier.email ? (
                          <span><Mail size={12} strokeWidth={iconStroke} /> {supplier.email}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-secondary px-4 py-4">{supplierCategoryLabels[supplier.category]}</td>
                    <td className="text-secondary px-4 py-4">
                      {supplier.city ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} strokeWidth={iconStroke} /> {supplier.city}
                        </span>
                      ) : 'Sin definir'}
                    </td>
                    <td className="text-secondary px-4 py-4">{supplier.paymentTerms || 'Sin definir'}</td>
                    <td className="px-4 py-4">
                      <span className={`status-badge supplier-status--${supplier.status}`}>
                        {supplierStatusLabels[supplier.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="icon-button shopping-delete"
                        type="button"
                        aria-label={`Eliminar ${supplier.name}`}
                        title="Eliminar"
                        onClick={() => removeSupplier(supplier.id)}
                      >
                        <Trash2 size={17} strokeWidth={iconStroke} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <Truck size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">
              {suppliers.length ? 'No hay coincidencias' : 'No hay proveedores registrados'}
            </h3>
            <p className="text-muted mt-1 text-xs">
              {suppliers.length ? 'Prueba con otro filtro o término de búsqueda.' : 'Agrega tu primer proveedor para tenerlo a mano.'}
            </p>
            {!suppliers.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> Agregar proveedor
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id="supplier-dialog-title">Agregar proveedor</h2>
                <p className="text-muted mt-1 text-xs">Guarda datos útiles para compras y reposición.</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="form-field sm:col-span-2">
                <label htmlFor="supplier-name">Proveedor *</label>
                <input className="shopping-input" id="supplier-name" autoFocus placeholder="Ej. Importadora Cell Parts" {...register('name')} />
                {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="supplier-contact">Contacto</label>
                <input className="shopping-input" id="supplier-contact" placeholder="Nombre de la persona" {...register('contactName')} />
              </div>
              <div className="form-field">
                <label htmlFor="supplier-phone">Teléfono</label>
                <input className="shopping-input" id="supplier-phone" type="tel" placeholder="+595 981 000 000" {...register('phone')} />
                {errors.phone ? <p className="field-error">{errors.phone.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="supplier-email">Correo</label>
                <input className="shopping-input" id="supplier-email" type="email" placeholder="ventas@proveedor.com" {...register('email')} />
                {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="supplier-city">Ciudad</label>
                <input className="shopping-input" id="supplier-city" placeholder="Asunción" {...register('city')} />
              </div>
              <div className="form-field">
                <label htmlFor="supplier-category">Categoría</label>
                <select className="shopping-input" id="supplier-category" {...register('category')}>
                  <option value="parts">Repuestos</option>
                  <option value="accessories">Accesorios</option>
                  <option value="devices">Equipos</option>
                  <option value="services">Servicios</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="supplier-status">Estado</label>
                <select className="shopping-input" id="supplier-status" {...register('status')}>
                  <option value="active">Activo</option>
                  <option value="preferred">Preferido</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="supplier-payment">Condición de pago</label>
                <input className="shopping-input" id="supplier-payment" placeholder="Contado, crédito 15 días" {...register('paymentTerms')} />
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="supplier-website">Sitio web o catálogo</label>
                <div className="shopping-icon-input">
                  <ExternalLink size={17} strokeWidth={iconStroke} aria-hidden="true" />
                  <input id="supplier-website" type="url" placeholder="https://proveedor.com/catalogo" {...register('website')} />
                </div>
                {errors.website ? <p className="field-error">{errors.website.message}</p> : null}
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="supplier-notes">Notas</label>
                <textarea className="shopping-input shopping-notes resize-y py-3" id="supplier-notes" placeholder="Horarios, mínimos de compra, marcas o condiciones especiales" {...register('notes')} />
                {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit">
                  <Check size={16} strokeWidth={iconStroke} /> Guardar proveedor
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function readInventory(): InventoryItem[] {
  const storedInventory = window.localStorage.getItem(inventoryStorageKey)
  if (!storedInventory) return []

  try {
    const result = inventoryItemsSchema.safeParse(JSON.parse(storedInventory))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function getInventoryStockStatus(item: Pick<InventoryItem, 'stock' | 'minimumStock'>): InventoryStockStatus {
  if (item.stock <= 0) return 'out'
  if (item.minimumStock > 0 && item.stock <= item.minimumStock) return 'low'
  return 'available'
}

function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(readInventory)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InventoryItemFormValues>({
    defaultValues: {
      name: '',
      sku: '',
      category: 'parts',
      supplier: '',
      stock: 0,
      minimumStock: 0,
      unitCost: 0,
      salePrice: 0,
      location: '',
      notes: '',
    },
  })

  useEffect(() => {
    window.localStorage.setItem(inventoryStorageKey, JSON.stringify(items))
  }, [items])

  const totalStock = items.reduce((total, item) => total + item.stock, 0)
  const inventoryValue = items.reduce((total, item) => total + item.stock * item.unitCost, 0)
  const lowStockCount = items.filter((item) => getInventoryStockStatus(item) === 'low').length
  const outOfStockCount = items.filter((item) => getInventoryStockStatus(item) === 'out').length

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return items.filter((item) => {
      const status = getInventoryStockStatus(item)
      const matchesFilter = filter === 'all' || status === filter
      const matchesSearch = !normalizedSearch
        || item.name.toLocaleLowerCase('es').includes(normalizedSearch)
        || item.sku.toLocaleLowerCase('es').includes(normalizedSearch)
        || item.supplier.toLocaleLowerCase('es').includes(normalizedSearch)
        || item.location.toLocaleLowerCase('es').includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [filter, items, searchTerm])

  const closeForm = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit: SubmitHandler<InventoryItemFormValues> = (values) => {
    const result = inventoryItemFormSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && field in values) {
          setError(field as keyof InventoryItemFormValues, { message: issue.message })
        }
      })
      return
    }

    setItems((currentItems) => [{
      ...result.data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }, ...currentItems])
    closeForm()
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">Inventario</h2>
          <p className="text-secondary mt-1 text-sm">Controla stock, costos, precios y ubicación de productos.</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          Agregar producto
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-muted text-xs">Productos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{items.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Unidades en stock</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{totalStock}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Valor de inventario</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(inventoryValue)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Alertas</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{lowStockCount + outOfStockCount}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor="inventory-search">
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id="inventory-search"
              type="search"
              placeholder="Buscar producto, SKU, proveedor o ubicación"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="shopping-filter" aria-label="Filtrar inventario">
            {([
              ['all', 'Todos'],
              ['available', 'Disponibles'],
              ['low', 'Bajo stock'],
              ['out', 'Agotados'],
            ] as const).map(([value, label]) => (
              <button
                className={filter === value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-center font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Costo</th>
                  <th className="px-4 py-3 text-right font-medium">Venta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const status = getInventoryStockStatus(item)
                  return (
                    <tr className="table-row" key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`inventory-avatar inventory-avatar--${status} grid h-10 w-10 shrink-0 place-items-center rounded-lg`}>
                            {status === 'out' ? (
                              <ShieldAlert size={18} strokeWidth={iconStroke} />
                            ) : (
                              <Boxes size={18} strokeWidth={iconStroke} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-primary truncate font-medium">{item.name}</p>
                            <p className="text-muted mt-1 text-[11px]">SKU {item.sku}</p>
                            {item.notes ? <p className="text-muted mt-1 max-w-xs truncate text-[11px]">{item.notes}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="text-secondary px-4 py-4">{inventoryCategoryLabels[item.category]}</td>
                      <td className="text-secondary px-4 py-4">{item.supplier || 'Sin definir'}</td>
                      <td className="px-4 py-4 text-center">
                        <strong className="text-primary block text-sm">{item.stock}</strong>
                        <span className="text-muted text-[10px]">mín. {item.minimumStock}</span>
                      </td>
                      <td className="text-primary px-4 py-4 text-right font-medium">{formatGuarani(item.unitCost)}</td>
                      <td className="text-primary px-4 py-4 text-right font-medium">{formatGuarani(item.salePrice)}</td>
                      <td className="px-4 py-4">
                        <span className={`status-badge inventory-status--${status}`}>{inventoryStatusLabels[status]}</span>
                        {item.location ? (
                          <p className="text-muted mt-1 inline-flex items-center gap-1 text-[11px]">
                            <MapPin size={12} strokeWidth={iconStroke} /> {item.location}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="icon-button shopping-delete"
                          type="button"
                          aria-label={`Eliminar ${item.name}`}
                          title="Eliminar"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={17} strokeWidth={iconStroke} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <Layers3 size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">
              {items.length ? 'No hay coincidencias' : 'No hay productos en inventario'}
            </h3>
            <p className="text-muted mt-1 text-xs">
              {items.length ? 'Prueba con otro filtro o término de búsqueda.' : 'Agrega productos para empezar a controlar tu stock.'}
            </p>
            {!items.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> Agregar producto
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id="inventory-dialog-title">Agregar producto</h2>
                <p className="text-muted mt-1 text-xs">Registra stock, precios y datos de reposición.</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="form-field">
                <label htmlFor="inventory-name">Producto *</label>
                <input className="shopping-input" id="inventory-name" autoFocus placeholder="Ej. Display iPhone 11" {...register('name')} />
                {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="inventory-sku">SKU *</label>
                <input className="shopping-input" id="inventory-sku" placeholder="DIS-IP11-INC" {...register('sku')} />
                {errors.sku ? <p className="field-error">{errors.sku.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="inventory-category">Categoría</label>
                <select className="shopping-input" id="inventory-category" {...register('category')}>
                  <option value="parts">Repuestos</option>
                  <option value="accessories">Accesorios</option>
                  <option value="devices">Equipos</option>
                  <option value="tools">Herramientas</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="inventory-supplier">Proveedor</label>
                <input className="shopping-input" id="inventory-supplier" placeholder="Opcional" {...register('supplier')} />
              </div>
              <div className="form-field">
                <label htmlFor="inventory-stock">Stock actual</label>
                <input className="shopping-input" id="inventory-stock" type="number" min="0" {...register('stock', { valueAsNumber: true })} />
                {errors.stock ? <p className="field-error">{errors.stock.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="inventory-minimum">Stock mínimo</label>
                <input className="shopping-input" id="inventory-minimum" type="number" min="0" {...register('minimumStock', { valueAsNumber: true })} />
                {errors.minimumStock ? <p className="field-error">{errors.minimumStock.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="inventory-cost">Costo unitario</label>
                <div className="shopping-money-input">
                  <span>₲</span>
                  <input id="inventory-cost" type="number" min="0" step="1000" {...register('unitCost', { valueAsNumber: true })} />
                </div>
                {errors.unitCost ? <p className="field-error">{errors.unitCost.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="inventory-sale-price">Precio de venta</label>
                <div className="shopping-money-input">
                  <span>₲</span>
                  <input id="inventory-sale-price" type="number" min="0" step="1000" {...register('salePrice', { valueAsNumber: true })} />
                </div>
                {errors.salePrice ? <p className="field-error">{errors.salePrice.message}</p> : null}
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="inventory-location">Ubicación</label>
                <input className="shopping-input" id="inventory-location" placeholder="Vitrina, depósito, caja de repuestos" {...register('location')} />
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="inventory-notes">Notas</label>
                <textarea className="shopping-input shopping-notes resize-y py-3" id="inventory-notes" placeholder="Compatibilidad, color, calidad, garantía u observaciones" {...register('notes')} />
                {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit">
                  <Check size={16} strokeWidth={iconStroke} /> Guardar producto
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function readSales(): Sale[] {
  const storedSales = window.localStorage.getItem(salesStorageKey)
  if (!storedSales) return []

  try {
    const result = salesSchema.safeParse(JSON.parse(storedSales))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function formatSaleDate(value: string) {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(readSales)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<SaleFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SaleFormValues>({
    defaultValues: {
      customerName: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      paymentMethod: 'cash',
      status: 'paid',
      notes: '',
    },
  })

  useEffect(() => {
    window.localStorage.setItem(salesStorageKey, JSON.stringify(sales))
  }, [sales])

  const paidSales = sales.filter((sale) => sale.status === 'paid')
  const pendingSales = sales.filter((sale) => sale.status !== 'paid')
  const totalSales = sales.reduce((total, sale) => total + sale.quantity * sale.unitPrice, 0)
  const paidTotal = paidSales.reduce((total, sale) => total + sale.quantity * sale.unitPrice, 0)
  const averageTicket = sales.length ? Math.round(totalSales / sales.length) : 0

  const visibleSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return sales.filter((sale) => {
      const matchesFilter = filter === 'all' || sale.status === filter
      const matchesSearch = !normalizedSearch
        || sale.number.toLocaleLowerCase('es').includes(normalizedSearch)
        || sale.customerName.toLocaleLowerCase('es').includes(normalizedSearch)
        || sale.productName.toLocaleLowerCase('es').includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [filter, sales, searchTerm])

  const closeForm = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit: SubmitHandler<SaleFormValues> = (values) => {
    const result = saleFormSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && field in values) {
          setError(field as keyof SaleFormValues, { message: issue.message })
        }
      })
      return
    }

    setSales((currentSales) => [{
      ...result.data,
      id: crypto.randomUUID(),
      number: `VEN-${String(currentSales.length + 1).padStart(6, '0')}`,
      createdAt: new Date().toISOString(),
    }, ...currentSales])
    closeForm()
  }

  const removeSale = (id: string) => {
    setSales((currentSales) => currentSales.filter((sale) => sale.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">Ventas</h2>
          <p className="text-secondary mt-1 text-sm">Registra ventas rápidas y controla el estado de cobro.</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          Nueva venta
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-muted text-xs">Total vendido</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(totalSales)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Cobrado</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(paidTotal)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Pendientes</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{pendingSales.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Ticket promedio</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(averageTicket)}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor="sales-search">
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id="sales-search"
              type="search"
              placeholder="Buscar venta, cliente o producto"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="shopping-filter" aria-label="Filtrar ventas">
            {([
              ['all', 'Todas'],
              ['paid', 'Pagadas'],
              ['partial', 'Parciales'],
              ['pending', 'Pendientes'],
            ] as const).map(([value, label]) => (
              <button
                className={filter === value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleSales.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Venta</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 text-center font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleSales.map((sale) => (
                  <tr className="table-row" key={sale.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`sale-avatar sale-avatar--${sale.status} grid h-10 w-10 shrink-0 place-items-center rounded-lg`}>
                          {sale.paymentMethod === 'cash' ? (
                            <Banknote size={18} strokeWidth={iconStroke} />
                          ) : (
                            <CreditCard size={18} strokeWidth={iconStroke} />
                          )}
                        </div>
                        <div>
                          <p className="text-primary font-medium">{sale.number}</p>
                          <p className="text-muted mt-1 text-[11px]">{formatSaleDate(sale.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-primary inline-flex items-center gap-2 font-medium">
                        <UserRound size={14} strokeWidth={iconStroke} /> {sale.customerName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-primary font-medium">{sale.productName}</p>
                      {sale.notes ? <p className="text-muted mt-1 max-w-xs truncate text-[11px]">{sale.notes}</p> : null}
                    </td>
                    <td className="text-primary px-4 py-4 text-center">{sale.quantity}</td>
                    <td className="text-primary px-4 py-4 text-right font-medium">
                      {formatGuarani(sale.quantity * sale.unitPrice)}
                    </td>
                    <td className="text-secondary px-4 py-4">{paymentMethodLabels[sale.paymentMethod]}</td>
                    <td className="px-4 py-4">
                      <span className={`status-badge sale-status--${sale.status}`}>{saleStatusLabels[sale.status]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="icon-button shopping-delete"
                        type="button"
                        aria-label={`Eliminar ${sale.number}`}
                        title="Eliminar"
                        onClick={() => removeSale(sale.id)}
                      >
                        <Trash2 size={17} strokeWidth={iconStroke} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <ShoppingBag size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">
              {sales.length ? 'No hay coincidencias' : 'No hay ventas registradas'}
            </h3>
            <p className="text-muted mt-1 text-xs">
              {sales.length ? 'Prueba con otro filtro o término de búsqueda.' : 'Registra la primera venta del día.'}
            </p>
            {!sales.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> Nueva venta
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="sales-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id="sales-dialog-title">Nueva venta</h2>
                <p className="text-muted mt-1 text-xs">Registra el producto vendido y el estado de cobro.</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="form-field">
                <label htmlFor="sale-customer">Cliente *</label>
                <input className="shopping-input" id="sale-customer" autoFocus placeholder="Nombre del cliente" {...register('customerName')} />
                {errors.customerName ? <p className="field-error">{errors.customerName.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="sale-product">Producto *</label>
                <input className="shopping-input" id="sale-product" placeholder="Ej. Cable USB-C 1 m" {...register('productName')} />
                {errors.productName ? <p className="field-error">{errors.productName.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="sale-quantity">Cantidad *</label>
                <input className="shopping-input" id="sale-quantity" type="number" min="1" {...register('quantity', { valueAsNumber: true })} />
                {errors.quantity ? <p className="field-error">{errors.quantity.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="sale-unit-price">Precio unitario</label>
                <div className="shopping-money-input">
                  <span>₲</span>
                  <input id="sale-unit-price" type="number" min="0" step="1000" {...register('unitPrice', { valueAsNumber: true })} />
                </div>
                {errors.unitPrice ? <p className="field-error">{errors.unitPrice.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="sale-payment">Método de pago</label>
                <select className="shopping-input" id="sale-payment" {...register('paymentMethod')}>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="sale-status">Estado</label>
                <select className="shopping-input" id="sale-status" {...register('status')}>
                  <option value="paid">Pagada</option>
                  <option value="partial">Parcial</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="sale-notes">Notas</label>
                <textarea className="shopping-input shopping-notes resize-y py-3" id="sale-notes" placeholder="Garantía, observaciones del cliente o detalle de cobro" {...register('notes')} />
                {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit">
                  <Check size={16} strokeWidth={iconStroke} /> Guardar venta
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function CustomersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })
  const customers = customersQuery.data ?? []
  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      closeForm()
    },
  })
  const deleteCustomerMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: {
      name: '',
      documentNumber: '',
      phone: '',
      email: '',
      city: '',
      customerType: 'regular',
      status: 'active',
      lastDevice: '',
      notes: '',
    },
  })

  const activeCustomers = customers.filter((customer) => customer.status !== 'inactive')
  const vipCustomers = customers.filter((customer) => customer.status === 'vip')
  const customersWithContact = customers.filter((customer) => customer.phone || customer.email)
  const businessCustomers = customers.filter((customer) => customer.customerType === 'business')

  const visibleCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return customers.filter((customer) => {
      const matchesFilter = filter === 'all' || customer.status === filter
      const matchesSearch = !normalizedSearch
        || customer.name.toLocaleLowerCase('es').includes(normalizedSearch)
        || customer.documentNumber.toLocaleLowerCase('es').includes(normalizedSearch)
        || customer.phone.toLocaleLowerCase('es').includes(normalizedSearch)
        || customer.email.toLocaleLowerCase('es').includes(normalizedSearch)
        || customer.city.toLocaleLowerCase('es').includes(normalizedSearch)
        || customer.lastDevice.toLocaleLowerCase('es').includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [customers, filter, searchTerm])

  const closeForm = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit: SubmitHandler<CustomerFormValues> = (values) => {
    const result = customerFormSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && field in values) {
          setError(field as keyof CustomerFormValues, { message: issue.message })
        }
      })
      return
    }

    createCustomerMutation.mutate(result.data)
  }

  const removeCustomer = (id: string) => {
    deleteCustomerMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">Clientes</h2>
          <p className="text-secondary mt-1 text-sm">Centraliza datos de contacto, equipos y estado del cliente.</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          Agregar cliente
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-muted text-xs">Clientes activos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{activeCustomers.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">VIP</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{vipCustomers.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Con contacto</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{customersWithContact.length}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Empresas</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{businessCustomers.length}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor="customers-search">
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id="customers-search"
              type="search"
              placeholder="Buscar cliente, documento, teléfono o equipo"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="shopping-filter" aria-label="Filtrar clientes">
            {([
              ['all', 'Todos'],
              ['vip', 'VIP'],
              ['active', 'Activos'],
              ['inactive', 'Inactivos'],
            ] as const).map(([value, label]) => (
              <button
                className={filter === value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {customersQuery.isLoading ? (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <Users size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">Cargando clientes</h3>
            <p className="text-muted mt-1 text-xs">Consultando la base de datos de BlackCell.</p>
          </div>
        ) : customersQuery.isError ? (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <ShieldAlert size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">No se pudieron cargar los clientes</h3>
            <p className="text-muted mt-1 text-xs">{customersQuery.error.message}</p>
          </div>
        ) : visibleCustomers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Equipo reciente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((customer) => (
                  <tr className="table-row" key={customer.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`customer-avatar customer-avatar--${customer.status} grid h-10 w-10 shrink-0 place-items-center rounded-lg`}>
                          {customer.status === 'vip' ? (
                            <HeartHandshake size={18} strokeWidth={iconStroke} />
                          ) : (
                            <UserRound size={18} strokeWidth={iconStroke} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-primary truncate font-medium">{customer.name}</p>
                          {customer.city ? (
                            <p className="text-muted mt-1 inline-flex items-center gap-1 text-[11px]">
                              <MapPin size={12} strokeWidth={iconStroke} /> {customer.city}
                            </p>
                          ) : null}
                          {customer.notes ? <p className="text-muted mt-1 max-w-xs truncate text-[11px]">{customer.notes}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="supplier-contact-list">
                        {customer.phone ? (
                          <span><Phone size={12} strokeWidth={iconStroke} /> {customer.phone}</span>
                        ) : null}
                        {customer.email ? (
                          <span><Mail size={12} strokeWidth={iconStroke} /> {customer.email}</span>
                        ) : null}
                        {!customer.phone && !customer.email ? <span>Sin contacto</span> : null}
                      </div>
                    </td>
                    <td className="text-secondary px-4 py-4">{customer.documentNumber || 'Sin definir'}</td>
                    <td className="text-secondary px-4 py-4">{customerTypeLabels[customer.customerType]}</td>
                    <td className="text-secondary px-4 py-4">{customer.lastDevice || 'Sin registrar'}</td>
                    <td className="px-4 py-4">
                      <span className={`status-badge customer-status--${customer.status}`}>
                        {customerStatusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="icon-button shopping-delete"
                        type="button"
                        aria-label={`Eliminar ${customer.name}`}
                        title="Eliminar"
                        disabled={deleteCustomerMutation.isPending}
                        onClick={() => removeCustomer(customer.id)}
                      >
                        <Trash2 size={17} strokeWidth={iconStroke} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <Users size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">
              {customers.length ? 'No hay coincidencias' : 'No hay clientes registrados'}
            </h3>
            <p className="text-muted mt-1 text-xs">
              {customers.length ? 'Prueba con otro filtro o término de búsqueda.' : 'Agrega el primer cliente para comenzar tu base de datos.'}
            </p>
            {!customers.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> Agregar cliente
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id="customer-dialog-title">Agregar cliente</h2>
                <p className="text-muted mt-1 text-xs">Guarda datos útiles para ventas y reparaciones.</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="form-field sm:col-span-2">
                <label htmlFor="customer-name">Cliente *</label>
                <input className="shopping-input" id="customer-name" autoFocus placeholder="Nombre y apellido" {...register('name')} />
                {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="customer-document">Documento</label>
                <input className="shopping-input" id="customer-document" placeholder="CI o RUC" {...register('documentNumber')} />
                {errors.documentNumber ? <p className="field-error">{errors.documentNumber.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="customer-phone">Teléfono</label>
                <input className="shopping-input" id="customer-phone" type="tel" placeholder="+595 981 000 000" {...register('phone')} />
                {errors.phone ? <p className="field-error">{errors.phone.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="customer-email">Correo</label>
                <input className="shopping-input" id="customer-email" type="email" placeholder="cliente@email.com" {...register('email')} />
                {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
              </div>
              <div className="form-field">
                <label htmlFor="customer-city">Ciudad</label>
                <input className="shopping-input" id="customer-city" placeholder="Asunción" {...register('city')} />
              </div>
              <div className="form-field">
                <label htmlFor="customer-type">Tipo</label>
                <select className="shopping-input" id="customer-type" {...register('customerType')}>
                  <option value="regular">Regular</option>
                  <option value="frequent">Frecuente</option>
                  <option value="business">Empresa</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="customer-status">Estado</label>
                <select className="shopping-input" id="customer-status" {...register('status')}>
                  <option value="active">Activo</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="customer-device">Equipo reciente</label>
                <input className="shopping-input" id="customer-device" placeholder="Ej. iPhone 13 Pro, Samsung A52" {...register('lastDevice')} />
                {errors.lastDevice ? <p className="field-error">{errors.lastDevice.message}</p> : null}
              </div>
              <div className="form-field sm:col-span-2">
                <label htmlFor="customer-notes">Notas</label>
                <textarea className="shopping-input shopping-notes resize-y py-3" id="customer-notes" placeholder="Preferencias, referencias, historial breve u observaciones" {...register('notes')} />
                {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit" disabled={createCustomerMutation.isPending}>
                  <Check size={16} strokeWidth={iconStroke} />
                  {createCustomerMutation.isPending ? 'Guardando...' : 'Guardar cliente'}
                </button>
              </div>
              {createCustomerMutation.isError ? (
                <p className="field-error sm:col-span-2">{createCustomerMutation.error.message}</p>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function readModuleRecords(storageKey: string): ModuleRecord[] {
  const storedRecords = window.localStorage.getItem(storageKey)
  if (!storedRecords) return []

  try {
    const result = moduleRecordsSchema.safeParse(JSON.parse(storedRecords))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function getModuleDefaults(fields: ModuleField[]): ModuleFormValues {
  return Object.fromEntries(fields.map((field) => [field.name, field.options?.[0]?.value ?? '']))
}

function getModuleFormSchema(fields: ModuleField[]) {
  return z.object(Object.fromEntries(fields.map((field) => [
    field.name,
    field.required
      ? z.string().trim().min(1, `Ingresa ${field.label.toLocaleLowerCase('es')}`)
      : z.string().trim(),
  ])) as Record<string, z.ZodString>)
}

function readMoneyValue(value: string | undefined) {
  return Number(value || 0)
}

function SimpleOperationsPage({ config }: { config: SimpleModuleConfig }) {
  const [records, setRecords] = useState<ModuleRecord[]>(() => readModuleRecords(config.storageKey))
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const firstColumnLabel = config.columns[0]?.label ?? config.title
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ModuleFormValues>({
    defaultValues: getModuleDefaults(config.fields),
  })

  useEffect(() => {
    window.localStorage.setItem(config.storageKey, JSON.stringify(records))
  }, [config.storageKey, records])

  const visibleRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
    return records.filter((record) => {
      const statusValue = config.statusField ? record[config.statusField] : ''
      const matchesFilter = filter === 'all' || statusValue === filter
      const matchesSearch = !normalizedSearch || config.searchableFields.some((field) => (
        (record[field] ?? '').toLocaleLowerCase('es').includes(normalizedSearch)
      ))
      return matchesFilter && matchesSearch
    })
  }, [config.searchableFields, config.statusField, filter, records, searchTerm])

  const closeForm = () => {
    setFormOpen(false)
    reset(getModuleDefaults(config.fields))
  }

  const onSubmit: SubmitHandler<ModuleFormValues> = (values) => {
    const formSchema = getModuleFormSchema(config.fields)
    const result = formSchema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string') {
          setError(field, { message: issue.message })
        }
      })
      return
    }

    setRecords((currentRecords) => [{
      ...result.data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...(config.numberPrefix ? { number: `${config.numberPrefix}-${String(currentRecords.length + 1).padStart(6, '0')}` } : {}),
    }, ...currentRecords])
    closeForm()
  }

  const removeRecord = (id: string) => {
    setRecords((currentRecords) => currentRecords.filter((record) => record.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-semibold">{config.title}</h2>
          <p className="text-secondary mt-1 text-sm">{config.subtitle}</p>
        </div>
        <button className="primary-button inline-flex gap-2 self-start" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={17} strokeWidth={iconStroke} />
          {config.ctaLabel}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <Card className="p-5" key={metric.label}>
            <p className="text-muted text-xs">{metric.label}</p>
            <strong className="text-primary mt-2 block text-2xl font-semibold">{metric.value(records)}</strong>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="shopping-list-toolbar">
          <label className="shopping-search" htmlFor={`${config.storageKey}-search`}>
            <Search size={17} strokeWidth={iconStroke} aria-hidden="true" />
            <input
              id={`${config.storageKey}-search`}
              type="search"
              placeholder={`Buscar en ${config.title.toLocaleLowerCase('es')}`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          {config.filters ? (
            <div className="shopping-filter" aria-label={`Filtrar ${config.title.toLocaleLowerCase('es')}`}>
              {config.filters.map((item) => (
                <button
                  className={filter === item.value ? 'shopping-filter__button shopping-filter__button--active' : 'shopping-filter__button'}
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visibleRecords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="table-head text-[11px] uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">{firstColumnLabel}</th>
                  {config.columns.slice(1).map((column) => (
                    <th className={`px-4 py-3 font-medium ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`} key={column.key}>
                      {column.label}
                    </th>
                  ))}
                  <th className="w-16 px-6 py-3 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => {
                  const primaryValue = record[config.primaryField] ?? ''
                  const secondaryValue = config.secondaryField ? record[config.secondaryField] : record.number
                  return (
                    <tr className="table-row" key={record.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="module-avatar grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                            <config.icon size={18} strokeWidth={iconStroke} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-primary truncate font-medium">{primaryValue}</p>
                            {secondaryValue ? <p className="text-muted mt-1 text-[11px]">{secondaryValue}</p> : null}
                          </div>
                        </div>
                      </td>
                      {config.columns.slice(1).map((column) => {
                        const value = record[column.key] ?? ''
                        const statusLabel = column.kind === 'status' ? config.statusLabels?.[value] ?? value : value
                        const displayValue = column.kind === 'money' ? formatGuarani(readMoneyValue(value)) : statusLabel
                        return (
                          <td className={`px-4 py-4 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-secondary'}`} key={column.key}>
                            {column.kind === 'status' ? (
                              <span className={`status-badge ${config.statusClassPrefix}--${value}`}>{displayValue}</span>
                            ) : (
                              <span className={column.kind === 'money' ? 'text-primary font-medium' : ''}>{displayValue || 'Sin definir'}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-6 py-4">
                        <button
                          className="icon-button shopping-delete"
                          type="button"
                          aria-label={`Eliminar ${primaryValue}`}
                          title="Eliminar"
                          onClick={() => removeRecord(record.id)}
                        >
                          <Trash2 size={17} strokeWidth={iconStroke} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="shopping-empty">
            <div className="placeholder-icon grid h-12 w-12 place-items-center rounded-lg">
              <config.icon size={22} strokeWidth={iconStroke} />
            </div>
            <h3 className="text-primary mt-4 text-sm font-semibold">{records.length ? 'No hay coincidencias' : config.emptyTitle}</h3>
            <p className="text-muted mt-1 text-xs">
              {records.length ? 'Prueba con otro filtro o término de búsqueda.' : config.emptySubtitle}
            </p>
            {!records.length ? (
              <button className="secondary-button mt-5 inline-flex gap-2" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={16} strokeWidth={iconStroke} /> {config.ctaLabel}
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {formOpen ? (
        <div className="shopping-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm()
        }}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby={`${config.storageKey}-dialog-title`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-primary text-lg font-semibold" id={`${config.storageKey}-dialog-title`}>{config.dialogTitle}</h2>
                <p className="text-muted mt-1 text-xs">{config.dialogSubtitle}</p>
              </div>
              <button className="icon-button -mr-2 -mt-2" type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={20} strokeWidth={iconStroke} />
              </button>
            </div>

            <form className="shopping-form" noValidate onSubmit={handleSubmit(onSubmit)}>
              {config.fields.map((field) => (
                <div className={`form-field ${field.fullWidth ? 'sm:col-span-2' : ''}`} key={field.name}>
                  <label htmlFor={`${config.storageKey}-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>
                  {field.type === 'select' ? (
                    <select className="shopping-input" id={`${config.storageKey}-${field.name}`} {...register(field.name)}>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea className="shopping-input shopping-notes resize-y py-3" id={`${config.storageKey}-${field.name}`} placeholder={field.placeholder} {...register(field.name)} />
                  ) : (
                    <input className="shopping-input" id={`${config.storageKey}-${field.name}`} type={field.type ?? 'text'} placeholder={field.placeholder} {...register(field.name)} />
                  )}
                  {errors[field.name]?.message ? <p className="field-error">{String(errors[field.name]?.message)}</p> : null}
                </div>
              ))}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button className="secondary-button inline-flex" type="button" onClick={closeForm}>Cancelar</button>
                <button className="primary-button inline-flex gap-2" type="submit">
                  <Check size={16} strokeWidth={iconStroke} /> Guardar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

const repairsModuleConfig: SimpleModuleConfig = {
  title: 'Reparaciones',
  subtitle: 'Registra órdenes, equipos, técnicos y estado del trabajo.',
  storageKey: 'black-cell-repairs',
  ctaLabel: 'Nueva reparación',
  dialogTitle: 'Nueva reparación',
  dialogSubtitle: 'Carga los datos iniciales del equipo y el diagnóstico.',
  emptyTitle: 'No hay reparaciones registradas',
  emptySubtitle: 'Crea la primera orden para empezar a controlar el taller.',
  icon: Wrench,
  numberPrefix: 'REP',
  primaryField: 'customerName',
  secondaryField: 'device',
  searchableFields: ['number', 'customerName', 'phone', 'device', 'issue', 'technician'],
  statusField: 'status',
  statusLabels: repairStatusLabels,
  statusClassPrefix: 'repair-status',
  filters: [
    { value: 'all', label: 'Todas' },
    { value: 'diagnosis', label: 'Diagnóstico' },
    { value: 'repair', label: 'Reparación' },
    { value: 'waiting', label: 'Espera' },
    { value: 'ready', label: 'Listas' },
  ],
  fields: [
    { name: 'customerName', label: 'Cliente', placeholder: 'Nombre del cliente', required: true },
    { name: 'phone', label: 'Teléfono', placeholder: '+595 981 000 000', type: 'tel' },
    { name: 'device', label: 'Equipo', placeholder: 'iPhone 13 Pro', required: true },
    { name: 'technician', label: 'Técnico', placeholder: 'Responsable' },
    { name: 'estimatedCost', label: 'Presupuesto', placeholder: '250000', type: 'number' },
    { name: 'status', label: 'Estado', placeholder: '', type: 'select', options: [
      { value: 'diagnosis', label: 'Diagnóstico' },
      { value: 'repair', label: 'En reparación' },
      { value: 'waiting', label: 'Esperando repuesto' },
      { value: 'ready', label: 'Listo' },
    ] },
    { name: 'issue', label: 'Falla reportada', placeholder: 'Pantalla rota, no carga, humedad', fullWidth: true },
    { name: 'notes', label: 'Notas', placeholder: 'Accesorios recibidos, contraseña, observaciones', type: 'textarea', fullWidth: true },
  ],
  columns: [
    { key: 'customerName', label: 'Cliente' },
    { key: 'number', label: 'Orden' },
    { key: 'device', label: 'Equipo' },
    { key: 'technician', label: 'Técnico' },
    { key: 'estimatedCost', label: 'Presupuesto', kind: 'money', align: 'right' },
    { key: 'status', label: 'Estado', kind: 'status' },
  ],
  metrics: [
    { label: 'Órdenes', value: (records) => String(records.length) },
    { label: 'En reparación', value: (records) => String(records.filter((record) => record.status === 'repair').length) },
    { label: 'Esperando repuesto', value: (records) => String(records.filter((record) => record.status === 'waiting').length) },
    { label: 'Presupuesto total', value: (records) => formatGuarani(records.reduce((total, record) => total + readMoneyValue(record.estimatedCost), 0)) },
  ],
}

const cashModuleConfig: SimpleModuleConfig = {
  title: 'Caja',
  subtitle: 'Controla sesiones, responsables y efectivo de apertura o cierre.',
  storageKey: 'black-cell-cash',
  ctaLabel: 'Registrar caja',
  dialogTitle: 'Registrar movimiento de caja',
  dialogSubtitle: 'Carga una sesión o ajuste para control interno.',
  emptyTitle: 'No hay registros de caja',
  emptySubtitle: 'Registra una apertura, cierre o ajuste de caja.',
  icon: ReceiptText,
  primaryField: 'responsible',
  secondaryField: 'date',
  searchableFields: ['responsible', 'date', 'notes'],
  statusField: 'status',
  statusLabels: cashStatusLabels,
  statusClassPrefix: 'cash-status',
  filters: [
    { value: 'all', label: 'Todas' },
    { value: 'open', label: 'Abiertas' },
    { value: 'closed', label: 'Cerradas' },
  ],
  fields: [
    { name: 'responsible', label: 'Responsable', placeholder: 'Nombre del cajero', required: true },
    { name: 'date', label: 'Fecha', placeholder: '', type: 'date' },
    { name: 'openingAmount', label: 'Monto inicial', placeholder: '500000', type: 'number' },
    { name: 'closingAmount', label: 'Monto cierre', placeholder: '0', type: 'number' },
    { name: 'status', label: 'Estado', placeholder: '', type: 'select', options: [
      { value: 'open', label: 'Abierta' },
      { value: 'closed', label: 'Cerrada' },
    ] },
    { name: 'notes', label: 'Notas', placeholder: 'Diferencias, retiros o comentarios', type: 'textarea', fullWidth: true },
  ],
  columns: [
    { key: 'responsible', label: 'Responsable' },
    { key: 'date', label: 'Fecha' },
    { key: 'openingAmount', label: 'Inicial', kind: 'money', align: 'right' },
    { key: 'closingAmount', label: 'Cierre', kind: 'money', align: 'right' },
    { key: 'status', label: 'Estado', kind: 'status' },
  ],
  metrics: [
    { label: 'Sesiones', value: (records) => String(records.length) },
    { label: 'Abiertas', value: (records) => String(records.filter((record) => record.status === 'open').length) },
    { label: 'Total inicial', value: (records) => formatGuarani(records.reduce((total, record) => total + readMoneyValue(record.openingAmount), 0)) },
    { label: 'Total cierre', value: (records) => formatGuarani(records.reduce((total, record) => total + readMoneyValue(record.closingAmount), 0)) },
  ],
}

const expensesModuleConfig: SimpleModuleConfig = {
  title: 'Gastos',
  subtitle: 'Registra egresos operativos y controla pagos pendientes.',
  storageKey: 'black-cell-expenses',
  ctaLabel: 'Nuevo gasto',
  dialogTitle: 'Nuevo gasto',
  dialogSubtitle: 'Guarda el concepto, monto y estado del gasto.',
  emptyTitle: 'No hay gastos registrados',
  emptySubtitle: 'Carga el primer gasto operativo para controlarlo.',
  icon: WalletCards,
  primaryField: 'concept',
  secondaryField: 'category',
  searchableFields: ['concept', 'category', 'supplier', 'notes'],
  statusField: 'status',
  statusLabels: expenseStatusLabels,
  statusClassPrefix: 'expense-status',
  filters: [
    { value: 'all', label: 'Todos' },
    { value: 'paid', label: 'Pagados' },
    { value: 'pending', label: 'Pendientes' },
  ],
  fields: [
    { name: 'concept', label: 'Concepto', placeholder: 'Alquiler, insumos, delivery', required: true },
    { name: 'supplier', label: 'Proveedor', placeholder: 'Opcional' },
    { name: 'category', label: 'Categoría', placeholder: 'Operativo, servicios, impuestos' },
    { name: 'amount', label: 'Monto', placeholder: '150000', type: 'number' },
    { name: 'status', label: 'Estado', placeholder: '', type: 'select', options: [
      { value: 'paid', label: 'Pagado' },
      { value: 'pending', label: 'Pendiente' },
    ] },
    { name: 'notes', label: 'Notas', placeholder: 'Comprobante, vencimiento u observaciones', type: 'textarea', fullWidth: true },
  ],
  columns: [
    { key: 'concept', label: 'Concepto' },
    { key: 'category', label: 'Categoría' },
    { key: 'supplier', label: 'Proveedor' },
    { key: 'amount', label: 'Monto', kind: 'money', align: 'right' },
    { key: 'status', label: 'Estado', kind: 'status' },
  ],
  metrics: [
    { label: 'Gastos', value: (records) => String(records.length) },
    { label: 'Pagados', value: (records) => String(records.filter((record) => record.status === 'paid').length) },
    { label: 'Pendientes', value: (records) => String(records.filter((record) => record.status === 'pending').length) },
    { label: 'Total', value: (records) => formatGuarani(records.reduce((total, record) => total + readMoneyValue(record.amount), 0)) },
  ],
}

const usersModuleConfig: SimpleModuleConfig = {
  title: 'Usuarios',
  subtitle: 'Administra usuarios internos, roles y estado de acceso.',
  storageKey: 'black-cell-users',
  ctaLabel: 'Agregar usuario',
  dialogTitle: 'Agregar usuario',
  dialogSubtitle: 'Registra el perfil operativo del usuario.',
  emptyTitle: 'No hay usuarios registrados',
  emptySubtitle: 'Agrega usuarios para preparar permisos y operación.',
  icon: Users,
  primaryField: 'name',
  secondaryField: 'role',
  searchableFields: ['name', 'email', 'role'],
  statusField: 'status',
  statusLabels: userStatusLabels,
  statusClassPrefix: 'user-status',
  filters: [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ],
  fields: [
    { name: 'name', label: 'Nombre', placeholder: 'Nombre del usuario', required: true },
    { name: 'email', label: 'Correo', placeholder: 'usuario@blackcell.com', type: 'email' },
    { name: 'role', label: 'Rol', placeholder: '', type: 'select', options: [
      { value: 'Administrador', label: 'Administrador' },
      { value: 'Técnico', label: 'Técnico' },
      { value: 'Ventas', label: 'Ventas' },
      { value: 'Caja', label: 'Caja' },
    ] },
    { name: 'status', label: 'Estado', placeholder: '', type: 'select', options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
    ] },
    { name: 'notes', label: 'Notas', placeholder: 'Permisos, sucursal u observaciones', type: 'textarea', fullWidth: true },
  ],
  columns: [
    { key: 'name', label: 'Usuario' },
    { key: 'email', label: 'Correo' },
    { key: 'role', label: 'Rol' },
    { key: 'status', label: 'Estado', kind: 'status' },
  ],
  metrics: [
    { label: 'Usuarios', value: (records) => String(records.length) },
    { label: 'Activos', value: (records) => String(records.filter((record) => record.status === 'active').length) },
    { label: 'Inactivos', value: (records) => String(records.filter((record) => record.status === 'inactive').length) },
    { label: 'Roles', value: (records) => String(new Set(records.map((record) => record.role).filter(Boolean)).size) },
  ],
}

const settingsModuleConfig: SimpleModuleConfig = {
  title: 'Configuración',
  subtitle: 'Define parámetros operativos visibles del sistema.',
  storageKey: 'black-cell-settings',
  ctaLabel: 'Agregar ajuste',
  dialogTitle: 'Agregar ajuste',
  dialogSubtitle: 'Guarda una configuración pendiente para el sistema.',
  emptyTitle: 'No hay ajustes registrados',
  emptySubtitle: 'Agrega parámetros operativos para documentar el sistema.',
  icon: Settings,
  primaryField: 'name',
  secondaryField: 'module',
  searchableFields: ['name', 'module', 'value', 'notes'],
  statusField: 'status',
  statusLabels: settingsStatusLabels,
  statusClassPrefix: 'setting-status',
  filters: [
    { value: 'all', label: 'Todos' },
    { value: 'enabled', label: 'Activos' },
    { value: 'disabled', label: 'Inactivos' },
  ],
  fields: [
    { name: 'name', label: 'Ajuste', placeholder: 'Nombre del ajuste', required: true },
    { name: 'module', label: 'Módulo', placeholder: 'Ventas, Caja, Inventario' },
    { name: 'value', label: 'Valor', placeholder: 'Valor configurado' },
    { name: 'status', label: 'Estado', placeholder: '', type: 'select', options: [
      { value: 'enabled', label: 'Activo' },
      { value: 'disabled', label: 'Inactivo' },
    ] },
    { name: 'notes', label: 'Notas', placeholder: 'Descripción o criterio de uso', type: 'textarea', fullWidth: true },
  ],
  columns: [
    { key: 'name', label: 'Ajuste' },
    { key: 'module', label: 'Módulo' },
    { key: 'value', label: 'Valor' },
    { key: 'status', label: 'Estado', kind: 'status' },
  ],
  metrics: [
    { label: 'Ajustes', value: (records) => String(records.length) },
    { label: 'Activos', value: (records) => String(records.filter((record) => record.status === 'enabled').length) },
    { label: 'Inactivos', value: (records) => String(records.filter((record) => record.status === 'disabled').length) },
    { label: 'Módulos', value: (records) => String(new Set(records.map((record) => record.module).filter(Boolean)).size) },
  ],
}

function RepairsPage() {
  return <SimpleOperationsPage config={repairsModuleConfig} />
}

function CashRegisterPage() {
  return <SimpleOperationsPage config={cashModuleConfig} />
}

function ExpensesPage() {
  return <SimpleOperationsPage config={expensesModuleConfig} />
}

function UsersPage() {
  return <SimpleOperationsPage config={usersModuleConfig} />
}

function SettingsPage() {
  return <SimpleOperationsPage config={settingsModuleConfig} />
}

function ReportsPage() {
  const sales = readSales()
  const expenses = readModuleRecords(expensesModuleConfig.storageKey)
  const inventory = readInventory()
  const repairs = readModuleRecords(repairsModuleConfig.storageKey)
  const purchases = readShoppingList()
  const totalSales = sales.reduce((total, sale) => total + sale.quantity * sale.unitPrice, 0)
  const totalExpenses = expenses.reduce((total, expense) => total + readMoneyValue(expense.amount), 0)
  const inventoryValue = inventory.reduce((total, item) => total + item.stock * item.unitCost, 0)
  const pendingPurchases = purchases.filter((item) => !item.purchased)

  const rows = [
    { label: 'Ventas registradas', value: String(sales.length), amount: formatGuarani(totalSales), tone: 'success' },
    { label: 'Gastos registrados', value: String(expenses.length), amount: formatGuarani(totalExpenses), tone: 'warning' },
    { label: 'Inventario valorizado', value: String(inventory.length), amount: formatGuarani(inventoryValue), tone: 'primary' },
    { label: 'Reparaciones abiertas', value: String(repairs.filter((repair) => repair.status !== 'ready').length), amount: `${repairs.length} órdenes`, tone: 'neutral' },
    { label: 'Compras pendientes', value: String(pendingPurchases.length), amount: formatGuarani(pendingPurchases.reduce((total, item) => total + item.quantity * item.estimatedUnitCost, 0)), tone: 'warning' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-primary text-xl font-semibold">Reportes</h2>
        <p className="text-secondary mt-1 text-sm">Resumen local de ventas, gastos, inventario, reparaciones y compras.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-muted text-xs">Ingresos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(totalSales)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Egresos</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(totalExpenses)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-muted text-xs">Balance estimado</p>
          <strong className="text-primary mt-2 block text-2xl font-semibold">{formatGuarani(totalSales - totalExpenses)}</strong>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Resumen operativo" subtitle="Datos guardados localmente en este navegador" action={null} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="table-head text-[11px] uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Indicador</th>
                <th className="px-4 py-3 text-center font-medium">Registros</th>
                <th className="px-4 py-3 text-right font-medium">Monto o detalle</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="table-row" key={row.label}>
                  <td className="text-primary px-6 py-4 font-medium">{row.label}</td>
                  <td className="text-primary px-4 py-4 text-center">{row.value}</td>
                  <td className="text-primary px-4 py-4 text-right font-medium">{row.amount}</td>
                  <td className="px-6 py-4"><span className={`status-badge status-badge--${row.tone}`}>Actual</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center">
      <Card className="w-full max-w-xl p-8 text-center">
        <div className="placeholder-icon mx-auto grid h-14 w-14 place-items-center rounded-xl">
          <ClipboardList size={26} strokeWidth={iconStroke} />
        </div>
        <h2 className="text-primary mt-5 text-xl font-semibold">{title}</h2>
        <p className="text-secondary mx-auto mt-2 max-w-md text-sm leading-6">
          Este módulo conserva el nuevo sistema visual y está preparado para incorporar sus flujos operativos.
        </p>
        <NavLink className="secondary-button mt-6 inline-flex" to="/">Volver al dashboard</NavLink>
      </Card>
    </div>
  )
}

function Sidebar({ open, onClose, theme }: { open: boolean; onClose: () => void; theme: Theme }) {
  return (
    <>
      <button
        className={`sidebar-overlay fixed inset-0 z-20 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="relative flex h-[108px] items-center justify-center px-4">
          <NavLink className="logo-link w-[300px]" to="/" aria-label="Ir al dashboard" onClick={onClose}>
            <img
              className="h-auto w-full object-contain"
              src={theme === 'dark' ? logoForDarkTheme : logoForLightTheme}
              alt="BlackCell"
            />
          </NavLink>
          <button
            className="icon-button absolute right-2 top-2 lg:!hidden"
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            <X size={20} strokeWidth={iconStroke} />
          </button>
        </div>

        <nav className="sidebar-scroll px-3 pb-6 pt-2" aria-label="Navegación principal">
          {navigation.map((section) => (
            <div className="mb-5" key={section.label}>
              <p className="text-muted mb-2 px-3 text-[10px] font-semibold uppercase">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    className={({ isActive }) => `sidebar-link group ${isActive ? 'sidebar-link--active' : ''}`}
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                  >
                    <item.icon size={19} strokeWidth={iconStroke} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="sidebar-badge">{item.badge}</span> : <ChevronRight className="opacity-0 transition-opacity group-hover:opacity-40" size={14} />}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

function Topbar({
  onOpenMenu,
  theme,
  user,
  onLogout,
  onToggleTheme,
}: {
  onOpenMenu: () => void
  theme: Theme
  user: AuthUser
  onLogout: () => void
  onToggleTheme: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const roleLabel = user.role === 'administrador' ? 'Administrador' : user.role

  return (
    <header className="topbar">
      <button className="icon-button lg:!hidden" type="button" aria-label="Abrir menú" onClick={onOpenMenu}>
        <Menu size={22} strokeWidth={iconStroke} />
      </button>
      <label className="flex min-w-0 flex-1 items-center gap-3" htmlFor="global-search">
        <Search className="text-secondary shrink-0" size={20} strokeWidth={iconStroke} />
        <input
          className="search-input w-full bg-transparent text-sm outline-none"
          id="global-search"
          type="search"
          placeholder="Buscar reparación, cliente o producto"
        />
      </label>
      <button
        className="icon-button"
        type="button"
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? <Sun size={20} strokeWidth={iconStroke} /> : <Moon size={20} strokeWidth={iconStroke} />}
      </button>
      <button className="icon-button relative" type="button" aria-label="Notificaciones">
        <Bell size={20} strokeWidth={iconStroke} />
        <span className="notification-dot absolute right-2 top-2 h-2 w-2 rounded-full border-2" />
      </button>
      <div className="relative">
        <button
          className="profile-button flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors"
          type="button"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((value) => !value)}
        >
          <span className="avatar grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold">PA</span>
          <span className="hidden xl:block">
            <strong className="text-primary block text-xs font-medium">{user.name}</strong>
            <span className="text-muted block text-[10px]">{roleLabel}</span>
          </span>
          <ChevronDown className="text-muted hidden xl:block" size={14} />
        </button>
        {profileOpen ? (
          <div className="profile-menu absolute right-0 top-12 z-10 w-48 rounded-lg p-2">
            <NavLink className="dropdown-link" to="/configuracion" onClick={() => setProfileOpen(false)}>Mi perfil</NavLink>
            <NavLink className="dropdown-link" to="/configuracion" onClick={() => setProfileOpen(false)}>Configuración</NavLink>
            <button className="dropdown-link w-full text-left" type="button" onClick={() => {
              setProfileOpen(false)
              onLogout()
            }}>
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function LoginPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [assistanceVisible, setAssistanceVisible] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const currentSessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentSession,
    retry: false,
  })
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      queryClient.setQueryData(['auth', 'me'], session)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      navigate('/')
    },
    onError: (error) => {
      setLoginError(error.message)
    },
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', remember: false },
  })

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setLoginError(null)
    const result = loginSchema.safeParse(values)

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field === 'email' || field === 'password' || field === 'remember') {
          setError(field, { message: issue.message })
        }
      })
      return
    }

    loginMutation.mutate(result.data)
  }

  useEffect(() => {
    if (currentSessionQuery.data) {
      navigate('/')
    }
  }, [currentSessionQuery.data, navigate])

  return (
    <main className="login-page min-h-[100dvh]">
      <section className="login-visual" aria-label="BlackCell Manager">
        <img
          className="login-visual__image"
          src={theme === 'dark' ? loginVisualForDarkTheme : loginVisualForLightTheme}
          alt="Área de trabajo de BlackCell"
        />
      </section>

      <section className="login-panel">
        <img
          className="login-panel__background"
          src={theme === 'dark' ? loginBackgroundForDarkTheme : loginBackgroundForLightTheme}
          alt=""
          aria-hidden="true"
        />
        <div className="login-panel__topbar">
          <button
            className="icon-button ml-auto"
            type="button"
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} strokeWidth={iconStroke} /> : <Moon size={20} strokeWidth={iconStroke} />}
          </button>
        </div>

        <div className="login-form-wrap">
          <div className="login-heading">
            <img className="login-heading__logo" src={loginLogo} alt="BlackCell" />
            <h1>Bienvenido de nuevo</h1>
            <p>Ingresa tus credenciales para continuar.</p>
          </div>

          <form className="login-form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="form-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className={`login-input ${errors.email ? 'login-input--error' : ''}`}>
                <Mail size={18} strokeWidth={iconStroke} aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@blackcell.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email ? <p className="field-error" id="login-email-error">{errors.email.message}</p> : null}
            </div>

            <div className="form-field">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="login-password">Contraseña</label>
                <button className="login-text-button" type="button" onClick={() => setAssistanceVisible(true)}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className={`login-input ${errors.password ? 'login-input--error' : ''}`}>
                <LockKeyhole size={18} strokeWidth={iconStroke} aria-hidden="true" />
                <input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  {...register('password')}
                />
                <button
                  className="login-input__action"
                  type="button"
                  aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? <EyeOff size={18} strokeWidth={iconStroke} /> : <Eye size={18} strokeWidth={iconStroke} />}
                </button>
              </div>
              {errors.password ? <p className="field-error" id="login-password-error">{errors.password.message}</p> : null}
            </div>

            <label className="login-checkbox">
              <input type="checkbox" {...register('remember')} />
              <span>Mantener mi sesión iniciada</span>
            </label>

            <button className="login-submit" type="submit" disabled={loginMutation.isPending}>
              <span>{loginMutation.isPending ? 'Verificando acceso...' : 'Ingresar al sistema'}</span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </form>

          {loginError ? (
            <p className="login-assistance" role="alert">{loginError}</p>
          ) : null}

          {assistanceVisible ? (
            <p className="login-assistance" role="status">Solicita al administrador de BlackCell el restablecimiento de tu acceso.</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function AppLayout({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pageTitle = routeTitles[location.pathname] ?? 'Dashboard'
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentSession,
    retry: false,
  })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      navigate('/login')
    },
  })

  if (sessionQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-[100dvh] place-items-center">
        <Card className="w-full max-w-sm p-6 text-center">
          <h1 className="text-primary text-lg font-semibold">Verificando sesión</h1>
          <p className="text-muted mt-2 text-sm">Conectando con BlackCell Manager.</p>
        </Card>
      </div>
    )
  }

  if (!sessionQuery.data) {
    return <Navigate replace to="/login" />
  }

  return (
    <div className="app-shell min-h-[100dvh]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} theme={theme} />
      <main className="min-h-[100dvh] lg:pl-[260px]">
        <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-5">
          <Topbar
            onOpenMenu={() => setMenuOpen(true)}
            theme={theme}
            user={sessionQuery.data.user}
            onLogout={() => logoutMutation.mutate()}
            onToggleTheme={onToggleTheme}
          />
          <div className="mb-6 mt-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-muted text-xs">BlackCell Manager</p>
              <h1 className="text-primary mt-1 text-2xl font-semibold">{pageTitle}</h1>
            </div>
            <p className="text-muted text-xs">Lunes, 31 de agosto de 2026</p>
          </div>
          <Routes>
            <Route path="/" element={<DashboardPage theme={theme} />} />
            <Route path="/reparaciones" element={<RepairsPage />} />
            <Route path="/clientes" element={<CustomersPage />} />
            <Route path="/ventas" element={<SalesPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/proveedores" element={<SuppliersPage />} />
            <Route path="/compras" element={<ShoppingListPage />} />
            <Route path="/caja" element={<CashRegisterPage />} />
            <Route path="/gastos" element={<ExpensesPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            {navigation.flatMap((section) => section.items).slice(1).filter((item) => ![
              '/reparaciones',
              '/clientes',
              '/ventas',
              '/inventario',
              '/compras',
              '/proveedores',
              '/caja',
              '/gastos',
              '/reportes',
              '/usuarios',
              '/configuracion',
            ].includes(item.path)).map((item) => (
              <Route key={item.path} path={item.path} element={<PlaceholderPage title={item.label} />} />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem('black-cell-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('black-cell-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="/*" element={<AppLayout theme={theme} onToggleTheme={toggleTheme} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
