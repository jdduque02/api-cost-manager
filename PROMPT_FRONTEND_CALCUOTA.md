# Prompt para Frontend: Integrar Ruta de Cálculo de Cuotas de Ahorro

---

## Contexto para el Agente de Frontend

Estás integrando una ruta del backend que calcula las cuotas necesarias (semanales, quincenales o mensuales) para alcanzar una meta de ahorro. La ruta aplica la regla 50-30-20 cuando el usuario tiene perfil financiero registrado.

---

## Endpoint

```
POST /api/v1/users/:userId/financial-objectives/calculate-quota
```

### Headers
```
Authorization: Bearer <token_keycloak>
Content-Type: application/json
```

### Path Parameters
| Param | Tipo | Descripción |
|-------|------|-------------|
| `userId` | number | ID interno del usuario en el sistema |

### Body (Request)

```json
{
  "target_amount": 10000000,
  "current_balance": 0,
  "start_date": "2026-01-01",
  "end_date": "2027-12-31",
  "frequency": "monthly"
}
```

#### Campos del Body

| Campo | Tipo | Obligatorio | Default | Descripción |
|-------|------|-------------|---------|-------------|
| `target_amount` | number | **Sí** | - | Monto objetivo de la meta de ahorro (debe ser > 0) |
| `current_balance` | number | No | `0` | Saldo actual ya ahorrado hacia esta meta |
| `start_date` | string (ISO date) | No | Fecha actual | Fecha de inicio del plan de ahorro |
| `end_date` | string (ISO date) | No | `null` | Fecha límite para alcanzar la meta. **Si no se envía, la ruta retorna recomendaciones sin calcular cuotas** |
| `frequency` | string | **Sí** | - | Frecuencia de cuotas. Valores válidos: `"weekly"`, `"biweekly"`, `"monthly"` |

---

## Respuestas

### Escenario 1: Cálculo completo (con end_date + con perfil financiero)

```json
{
  "status": true,
  "message": "Operación exitosa",
  "data": {
    "target_amount": 10000000,
    "current_balance": 0,
    "amount_to_save": 10000000,
    "start_date": "2026-01-01",
    "end_date": "2027-12-31",
    "frequency": "monthly",
    "total_periods": 24,
    "days_in_period": 730,
    "quota_amount": 416666.67,
    "monthly_income": 3500000,
    "savings_ratio": 20,
    "max_allowed_per_period": 578640.73,
    "is_within_budget": true,
    "bank": null,
    "current_profitability": null,
    "projected_final_balance": null,
    "has_financial_profile": true,
    "warnings": [],
    "recommendations": []
  },
  "timestamp": "2026-07-26T10:00:00.000Z"
}
```

### Escenario 2: Cuota excede el presupuesto (con perfil financiero)

```json
{
  "status": true,
  "message": "Operación exitosa",
  "data": {
    "target_amount": 20000000,
    "current_balance": 0,
    "amount_to_save": 20000000,
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "frequency": "monthly",
    "total_periods": 12,
    "days_in_period": 365,
    "quota_amount": 1666666.67,
    "monthly_income": 3500000,
    "savings_ratio": 20,
    "max_allowed_per_period": 578640.73,
    "is_within_budget": false,
    "bank": null,
    "current_profitability": null,
    "projected_final_balance": null,
    "has_financial_profile": true,
    "warnings": [
      "Tu cuota de $1,666,667 excede el 20% recomendado de tu ingreso mensual ($3,500,000). El máximo recomendado por mes es $578,641."
    ],
    "recommendations": [
      "Considera reducir el monto objetivo, ampliar el plazo hasta la fecha límite, o buscar formas de incrementar tus ingresos para cumplir la meta sin comprometer tu estabilidad financiera."
    ]
  },
  "timestamp": "2026-07-26T10:00:00.000Z"
}
```

### Escenario 3: Sin fecha fin (ahorro sin objetivo definido)

```json
{
  "status": true,
  "message": "Operación exitosa",
  "data": {
    "target_amount": 10000000,
    "current_balance": 0,
    "amount_to_save": 10000000,
    "start_date": "2026-07-26",
    "end_date": null,
    "frequency": "monthly",
    "total_periods": 0,
    "days_in_period": 0,
    "quota_amount": 0,
    "monthly_income": null,
    "savings_ratio": 20,
    "max_allowed_per_period": null,
    "is_within_budget": null,
    "bank": null,
    "current_profitability": null,
    "projected_final_balance": null,
    "has_financial_profile": false,
    "warnings": [],
    "recommendations": [
      "Para un ahorro efectivo, se recomienda establecer una fecha límite para tu meta. Los objetivos con una fecha definida tienen 42% más probabilidad de cumplirse según estudios de psicología del comportamiento.",
      "Puedes reutilizar esta ruta en el futuro cuando definas tu fecha objetivo para obtener las cuotas exactas."
    ]
  },
  "timestamp": "2026-07-26T10:00:00.000Z"
}
```

### Escenario 4: Sin perfil financiero (cálculo teórico)

```json
{
  "status": true,
  "message": "Operación exitosa",
  "data": {
    "target_amount": 10000000,
    "current_balance": 2000000,
    "amount_to_save": 8000000,
    "start_date": "2026-01-01",
    "end_date": "2027-12-31",
    "frequency": "biweekly",
    "total_periods": 52,
    "days_in_period": 730,
    "quota_amount": 153846.15,
    "monthly_income": null,
    "savings_ratio": 20,
    "max_allowed_per_period": null,
    "is_within_budget": null,
    "bank": null,
    "current_profitability": null,
    "projected_final_balance": null,
    "has_financial_profile": false,
    "warnings": [],
    "recommendations": [
      "Para un cálculo más preciso y validado, registra tu ingreso mensual en tu perfil financiero. La regla 50-30-20 sugiere destinar máximo el 20% de tus ingresos al ahorro.",
      "Carga tu información financiera (ingreso mensual y ratios de distribución) en tu perfil para obtener un cálculo validado contra tu capacidad de ahorro real."
    ]
  },
  "timestamp": "2026-07-26T10:00:00.000Z"
}
```

---

## Errores

### 400 - Parámetros inválidos
```json
{
  "statusCode": 400,
  "message": "Ya alcanzaste o superaste tu objetivo de ahorro. Tu saldo actual iguala o supera el monto objetivo.",
  "error": "Bad Request"
}
```

### 400 - Fechas inválidas
```json
{
  "statusCode": 400,
  "message": "La fecha de inicio debe ser anterior a la fecha límite.",
  "error": "Bad Request"
}
```

### 400 - Frecuencia no válida
```json
{
  "statusCode": 400,
  "message": ["La frecuencia debe ser: weekly, biweekly o monthly."],
  "error": "Bad Request"
}
```

### 401 - No autenticado
```json
{
  "statusCode": 401,
  "message": "Token inválido o ausente",
  "error": "Unauthorized"
}
```

---

## Lógica de Negocio Explicada

### Frecuencias disponibles
| Frecuencia | Significado | Cuotas por mes |
|------------|-------------|----------------|
| `weekly` | Cada semana | ~4.33 |
| `biweekly` | Cada 14 días (quincenal) | ~2.17 |
| `monthly` | Cada mes | 1 |

### Regla 50-30-20
- **50%** → Necesidades básicas (vivienda, comida, transporte)
- **30%** → Deseos (entretenimiento, suscripciones)
- **20%** → Ahorro e inversión

La cuota calculada se valida contra el **20% del ingreso mensual** del usuario (si tiene perfil financiero registrado). Si la cuota excede ese monto, se retorna un warning.

### Sin perfil financiero
Si el usuario no tiene perfil financiero, la ruta:
1. Calcula la cuota teórica dividiendo el monto entre los períodos
2. Retorna `has_financial_profile: false`
3. Agrega recomendaciones para que el usuario cargue su información financiera

### Sin fecha fin (end_date)
Si el usuario no envía `end_date`, la ruta:
1. **No calcula cuotas** (retorna `total_periods: 0`, `quota_amount: 0`)
2. Retorna recomendaciones psicológicas sobre la importancia de tener fechas definidas
3. `end_date: null` en la respuesta

---

## Ejemplo de Integración en Componente React/Vue/Angular

```typescript
// Servicio de ejemplo (TypeScript)
interface CalculateQuotaRequest {
  target_amount: number;
  current_balance?: number;
  start_date?: string;
  end_date?: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
}

interface CalculateQuotaResponse {
  target_amount: number;
  current_balance: number;
  amount_to_save: number;
  start_date: string;
  end_date: string | null;
  frequency: string;
  total_periods: number;
  days_in_period: number;
  quota_amount: number;
  monthly_income: number | null;
  savings_ratio: number;
  max_allowed_per_period: number | null;
  is_within_budget: boolean | null;
  bank: string | null;
  current_profitability: number | null;
  projected_final_balance: number | null;
  has_financial_profile: boolean;
  warnings: string[];
  recommendations: string[];
}

async function calculateQuota(
  userId: number,
  request: CalculateQuotaRequest,
  token: string
): Promise<CalculateQuotaResponse> {
  const response = await fetch(
    `/api/v1/users/${userId}/financial-objectives/calculate-quota`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error calculando cuotas');
  }

  const result = await response.json();
  return result.data;
}
```

### Ejemplo de uso en componente

```typescript
// Calcular cuota mensual para meta de $10M en 2 años
const result = await calculateQuota(
  userId,
  {
    target_amount: 10000000,
    current_balance: 0,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    frequency: 'monthly',
  },
  keycloakToken
);

// Mostrar resultado
console.log(`Cuota mensual: $${result.quota_amount.toLocaleString()}`);
console.log(`Total cuotas: ${result.total_periods}`);

// Verificar si está dentro del presupuesto
if (result.is_within_budget === false) {
  // Mostrar warning al usuario
  result.warnings.forEach(w => showWarning(w));
}

// Mostrar recomendaciones
result.recommendations.forEach(r => showRecommendation(r));

// Si no tiene perfil financiero, mostrar banner
if (!result.has_financial_profile) {
  showBanner('Registra tu información financiera para un cálculo preciso');
}
```

---

## Notas para el Frontend

1. **El campo `monthly_income` viene desencriptado** del backend - no requiere desencriptación en frontend
2. **`bank` y `current_profitability`** son campos de la meta existente - si el usuario ya creó la meta con esos campos, se retornan en la respuesta de `GET /financial-objectives/:id`, no en el cálculo de cuotas
3. **`warnings`** son strings formateados listos para mostrar al usuario
4. **`recommendations`** son strings con consejos psicológicos/prácticos
5. **`is_within_budget`** puede ser `true`, `false`, o `null` (null = no hay perfil financiero)
6. **`projected_final_balance`** está reservado para futura integración con datos de rentabilidad de la meta
