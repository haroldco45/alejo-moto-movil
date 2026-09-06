# Alejo Moto-Móvil

Taller de mecánica de motos a domicilio en Caucasia, Antioquia.
Aplicación web de un solo archivo: pantalla pública para el cliente y panel privado de control para el mecánico.

Desarrollada por **Vibras Positivas HM** — Derechos de Autor Reservados.

---

## Qué resuelve

La primera versión solo enviaba solicitudes por WhatsApp. Esta versión sostiene el negocio completo:

| Necesidad | Cómo la resuelve |
|---|---|
| Conseguir el trabajo | Pantalla pública con servicios, precios y envío de ubicación GPS por WhatsApp |
| No perder plata | Registro de cada trabajo con mano de obra, repuestos, costo real y estado de pago |
| Saber cuánto ganó | Caja con entradas, salidas y utilidad limpia por día, semana y mes |
| Que el cliente vuelva | Ficha por moto con kilometraje y fecha; la app avisa cuándo toca el próximo mantenimiento |
| Verse serio | Recibo y cotización con formato profesional enviados por WhatsApp |
| No perder los datos | Respaldo descargable en JSON y restauración desde archivo |

El módulo de recordatorios es el que genera ingreso recurrente: convierte un servicio suelto en un cliente que vuelve cada 2.000 km o cada 75 días.

---

## Estructura

Un solo archivo `index.html`. Sin dependencias, sin servidor, sin base de datos externa.

- Datos en `localStorage` bajo la llave `vp_alejo_v2`
- Datos del cliente final en `vp_alejo_cliente` (solo en su propio celular)
- Sesión del panel en `sessionStorage`
- Fecha y hora reales de Colombia vía `Intl.DateTimeFormat` con `timeZone: 'America/Bogota'`
- Tipografías: Barlow Condensed e Inter (Google Fonts, con fallback del sistema)

## Vistas

**Pública** — datos del cliente, selección de servicios, moto, notas y botón de envío con GPS. Si el celular ya fue atendido antes, muestra el historial de esa moto.

**Panel** (clave por defecto `2026`, cambiable en Ajustes):

1. **Hoy** — lo que entró, la ganancia limpia, trabajos del día y clientes por llamar
2. **Trabajos** — historial completo con filtro por estado y buscador
3. **Motos** — ficha por moto con visitas, total gastado y estado de mantenimiento
4. **Caja** — entradas, salidas, registro de gastos y cierre del día por WhatsApp
5. **Ajustes** — marca, WhatsApp, umbrales de aviso, clave y respaldo

## Puesta en marcha

1. Abrir Ajustes y poner el WhatsApp real de Alejandro (formato `573XXXXXXXXX`).
2. Cambiar la clave del panel.
3. Revisar la lista de precios y ajustarla a lo que él cobra hoy.
4. Subir a GitHub Pages o Hostinger como `index.html`.
5. Subir `og/alejo-moto-movil.jpg` (1200×630) y `og/alejo-icon-512.png` a `vibraspositivashm.com`, o cambiar esas rutas en las meta tags.
6. Desde Chrome en Android: menú → «Agregar a pantalla de inicio».

## Control de suscripción

Consulta `control-vibras.js` en el repositorio de control. Para suspender:

```js
"alejo-moto-movil": "suspendido"
```

Si no hay conexión, la app sigue funcionando con normalidad.

## Habeas Data (Ley 1581 de 2012)

- Casilla de autorización obligatoria antes de guardar datos del cliente.
- Los teléfonos aparecen enmascarados en el listado de motos; se revelan con un interruptor explícito.
- Botón para eliminar la ficha de un cliente que ejerza su derecho de supresión.
- Ningún dato sale del dispositivo salvo en los mensajes de WhatsApp que el usuario decide enviar.

## Respaldo

Los datos viven solo en el celular. Descargar el respaldo semanalmente desde Ajustes. Si se borra el caché del navegador sin respaldo, la información se pierde.

---

Caucasia, Antioquia · Colombia
