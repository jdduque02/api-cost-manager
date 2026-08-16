# Descripción del servicio — brand pack

Documento listo para compartir con un generador de imágenes (logo) y para naming del producto.

## Qué es

API backend de **gestión financiera personal** pensada para personas y hogares en Latinoamérica (enfoque Colombia). Centraliza cuentas bancarias, activos, pasivos, presupuestos, objetivos de ahorro, transacciones, importación de extractos, noticias financieras y comunicación por correo. La identidad se gestiona con Keycloak; el panel de administración permite listar usuarios con metadata, cambiar roles, publicar noticias y enviar correos masivos.

## Logo a partir de la descripción

El prompt de esta sección se construye **directamente desde la descripción del proyecto** (la sección “Qué es” y el README), no desde una idea externa. Cada rasgo del producto se traduce a una decisión visual:

| De la descripción | Traducción visual |
|---|---|
| Gestión financiera personal para personas y hogares en LATAM | Símbolo simple, cercano, cálido y cotidiano |
| Centraliza cuentas, activos, pasivos, metas y presupuestos | Estructura equilibrada / capas ordenadas |
| Privacidad por diseño (datos cifrados, roles, auditoría) | Línea continua limpia, sin adornos superfluos |
| Importación de extractos, recordatorios y períodos | Ruta / plano / calendario sugerido en el símbolo |
| Panel admin (usuarios, roles, noticias, email) | Marca tipográfica sólida y confiable |
| Confianza y precisión (cero promesas mágicas) | Verde bosque + oro mate, tipografía sobria |

**Prompt principal — pegar tal cual en el generador:**

```text
Logo for "Cost Manager", a personal finance management platform for people and
households in Latin America. It centralizes bank accounts, assets, liabilities,
budgets, savings goals, transactions, bank-statement imports, financial news and
email communication; identity is managed with Keycloak and it includes an admin
panel to manage users, roles, news and email broadcasts. Sensitive data is
encrypted by design.

The logo must express: everyday money under control, trust, privacy by design,
calm Latin American warmth, precision. No aggressive trading, no get-rich hype.

Style: minimalist flat vector, Swiss-inspired restraint. Wordmark "Cost Manager"
plus one simple geometric symbol. Symbol concepts (pick one): (A) a rising chart
line that closes into an open ledger page; (B) a leaf growing from a coin edge
that subtly reads as a percentage sign; (C) three rounded stacked bars forming a
small house with a coin in the center; (D) a compass needle pointing at a balance
mark.

Palette (flat, no gradients): primary deep forest green #0F3D2E, matte gold accent
#C4A35A, bone background #F4F1EA, near-black #1A1A1A. High contrast, legible on
light and dark backgrounds. Centered composition, generous negative space, 1:1
safe area for app icon, export-ready, crisp vector edges, no 3D, no drop shadows,
no crypto or dollar-sign clichés, no mascot faces, no script fonts.
```

**Variantes derivadas del mismo prompt:**

- **App icon**: “Square app icon, symbol only (no wordmark), 1024×1024, rounded-rect safe zone, flat colors, same palette.”
- **Lockup horizontal**: “Logo mark on the left + wordmark 'Cost Manager' on the right, transparent background, horizontal composition.”
- **Monocromo**: “Single-color version in #0F3D2E on transparent, symbol + wordmark, minimal.”
- **Banner README / cover**: “Wide horizontal banner for a README header, wordmark centered over a subtle chart-line motif in bone and forest green, no text other than the name.”

> Nota: el prompt clásico de marca (sin derivar de la descripción) se mantiene más abajo, en “Prompt para generador de imágenes (logo)”, junto con las variantes y el naming.

## Para quién

- Personas que quieren **ordenar su dinero** sin hojas de cálculo.
- Hogares que llevan varias cuentas, deudas y metas.
- Administradores del producto que necesitan operar usuarios, contenido y campañas de email.

## Propuesta de valor

1. **Una sola fuente de verdad** del patrimonio (cuentas, activos, pasivos, metas).
2. **Privacidad por diseño**: campos sensibles cifrados (AES-GCM), roles Keycloak, auditoría.
3. **Operación real**: importación de extractos, recordatorios, notificaciones en tiempo real, OTP por correo.
4. **Panel admin**: usuarios + metadata, roles, noticias y broadcast de emails tipo “newsletter”.

## Tono de marca

- **Claro, sobrio, confiable** — fintech cotidiana, no casino ni “crypto hype”.
- **Cálido latinoamericano** — cercano, sin jerga corporativa fría.
- **Preciso** — números legibles, cero promesas mágicas de “hazte rico”.

## Paleta sugerida (logo / UI)

| Rol | Hex | Uso |
|-----|-----|-----|
| Primario | `#0F3D2E` | Verde bosque profundo (confianza, crecimiento) |
| Acento | `#C4A35A` | Oro mate (valor, estabilidad) |
| Neutro claro | `#F4F1EA` | Fondo bone / papel |
| Neutro oscuro | `#1A1A1A` | Texto e iconografía |
| Alerta | `#B33A3A` | Deuda / error (nunca dominante en logo) |

Evitar: púrpura “AI”, neones, gradientes arcoíris, monedas caricaturescas.

## Aplicación de la paleta

Fuente de tokens en código: [`src/config/brand.ts`](../src/config/brand.ts) (`BRAND_PALETTE`).

| Superficie | Archivo | Uso de tokens |
|---|---|---|
| Header Swagger | `src/config/swagger-ui.config.ts` | Gradiente `primary → neutralDark`, texto `white`, sombra tintada forest |
| Logo API | `public/logo.svg` | Círculo flat `primary`, tipografía/línea `neutralLight`, punto `accent` |
| Plantilla OTP | `src/modules/mail/templates/otp-password-reset.tsx` | Fondo/box `neutralLight`, heading `neutralDark`, código `primary`, cuerpo/footer muted |

Contrastes WCAG AA verificados (texto normal ≥ 4.5:1): forest/bone 10.78, near-black/bone 15.43, white/forest 12.16, primary/bone (OTP) ≥ 4.5.

## Prompt para generador de imágenes (logo)

Copia y pega (o adapta) el bloque siguiente:

```text
Minimalist fintech app logo for a personal finance manager used in Latin America.
Wordmark + simple symbol. Symbol concepts (pick one): (A) balanced scale made of a single continuous line that doubles as a rising chart; (B) abstract leaf growing from a coin edge; (C) geometric piggy silhouette reduced to 2–3 shapes; (D) open ledger page forming a subtle upward arrow.
Style: flat vector, premium, Swiss-inspired restraint, no gradients, no 3D, no drop shadows, no crypto motifs, no dollar-sign clichés, no mascot faces.
Palette: deep forest green #0F3D2E, matte gold #C4A35A, bone #F4F1EA, near-black #1A1A1A. High contrast, works on light and dark backgrounds.
Composition: centered mark, generous padding, crisp edges, 1:1 safe area for app icon. Optional monoline monogram if letter-based.
Mood: trustworthy, calm, modern, Latin American warmth without folk clichés. Export-ready, clean negative space.
```

Variantes útiles:

- **App icon only**: “square app icon, no wordmark, 1024×1024, rounded-rect safe zone”.
- **Horizontal lockup**: “logo mark left + wordmark right, transparent background”.
- **Monochrome**: “single-color version in #0F3D2E on transparent”.

## Listado de posibles nombres

| # | Nombre | Razón breve |
|---|--------|-------------|
| 1 | **Saldo** | Directo, cotidiano en ES-LATAM; evoca “lo que me queda”. |
| 2 | **Capa** | Capa de orden sobre el caos financiero; corto, registrable. |
| 3 | **Yunta** | Pareja / equipo (hogar); sonido andino suave, memorable. |
| 4 | **Finma** | Contracción “finanzas + mapa”; tech-friendly. |
| 5 | **Pluma** | Ligereza al llevar las cuentas; visual elegante para logo. |
| 6 | **Cuadre** | “Que cuadre el mes”; verbo-nombre muy coloquial CO/MX. |
| 7 | **Norte** | Orientación / brújula financiera; símbolo claro (flecha/N). |
| 8 | **Bruma** | Calma tras la niebla de gastos; soft brand. |
| 9 | **Ahorra** | Imperativo claro; SEO natural (puede saturar). |
| 10 | **Lumen** | Claridad sobre el dinero; premium, internacionalizable. |
| 11 | **Suma** | Agregar, consolidar patrimonio; tipografía fuerte. |
| 12 | **Pacto** | Compromiso con metas; tono serio de confianza. |
| 13 | **Ruta** | Plan / camino al objetivo; mapa como símbolo. |
| 14 | **Cinto** | “Ajustarse el cinto” → disciplina de gasto; distintivo. |
| 15 | **Vigía** | Vigilancia amable del presupuesto; guard / eye mark. |

**Recomendación de naming corta:** priorizar **Saldo**, **Capa** o **Norte** (fáciles de decir, logo-friendly, poco genéricos en fintech global).

## Taglines (opcionales)

- “Tu dinero, en orden.”
- “El mapa de tu patrimonio.”
- “Menos caos. Más saldo.”
- “Finanzas claras para el día a día.”

## Qué no comunicar en el logo

- Gráficas de velas / trading agresivo.
- Cohetes, diamantes, “to the moon”.
- Billetes realistas o banderas.
- Tipografía script cursiva ilegible a tamaño favicon.
