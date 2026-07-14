# Activación de Supabase

La integración está preparada para eventos, inscripciones, buzón, cuentas y autenticación del administrador. Mientras `supabase-config.js` conserve los valores `PENDIENTE_...`, la web seguirá usando el modo local.

## 1. Crear el proyecto

1. Crea un proyecto en Supabase.
2. Elige preferiblemente una región de la Unión Europea, ya que se guardarán nombres y fechas de nacimiento.
3. Espera a que el proyecto termine de inicializarse.

## 2. Crear las tablas y permisos

1. Abre **SQL Editor** en Supabase.
2. Copia todo el contenido de `supabase/schema.sql`.
3. Ejecuta el script una vez.

El script crea:

- `events`
- `event_registrations`
- `messages`
- `transactions`
- `admin_users`
- La función segura `register_for_event`, que impide superar el aforo.
- Las políticas RLS de lectura pública y administración.

## 3. Crear el administrador

1. Abre **Authentication → Users**.
2. Crea el usuario con su correo y contraseña y déjalo confirmado.
3. Vuelve a **SQL Editor** y ejecuta, sustituyendo el correo:

```sql
insert into public.admin_users(user_id)
select id from auth.users
where email = 'administrador@ejemplo.com';
```

Solo los usuarios incluidos en `admin_users` podrán modificar eventos, leer el buzón, consultar inscripciones o administrar las cuentas.

## 4. Conectar la web

En **Project Settings → Data API / API Keys**, copia:

- Project URL.
- Publishable key (o la clave `anon` del proyecto).

Edita `supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url: 'https://TU-PROYECTO.supabase.co',
  anonKey: 'TU_CLAVE_PUBLICA'
};
```

La clave pública puede estar en una web. No uses ni publiques nunca la clave `service_role`.

## 5. Comprobar

1. Abre la web publicada.
2. Confirma que aparecen los eventos y las cuentas iniciales.
3. Envía un mensaje de contacto.
4. Accede al área privada con el correo y contraseña del usuario creado.
5. Comprueba el Buzón, las inscripciones, los eventos y el Balance.

## Protección de datos

Las inscripciones contienen datos personales. Conviene definir un plazo de conservación, borrar inscripciones antiguas y publicar una política de privacidad que indique responsable, finalidad y derechos de las personas.
