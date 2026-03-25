## Rurana

Rurana es una PWA mobile-first para registrar sesiones de entrenamiento con ejercicios dinámicos, bandas, pesas e isométricos. Usa `Next.js 16`, `React 19` y `Supabase`.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth con Google
- Postgres + RLS por usuario
- IndexedDB para cache local y cola offline
- Service worker propio para instalación y updates

## Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Completa:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Configuración de Supabase

1. Habilita `Google` en `Authentication > Providers`.
2. Agrega tus URLs local y de producción en `Redirect URLs`.
3. Ejecuta la migración de `supabase/migrations/202603250001_init_workout_tracker.sql`.

## Desarrollo

Usa Node 22 LTS:

```bash
npm install
npm run dev
```

## Comandos

```bash
npm run lint
npm run typecheck
npm run build
```

## Funcionalidades incluidas

- Login con Google
- Sesión diaria con múltiples ejercicios
- Sets por reps o tiempo
- Carga con peso, banda o modo mixto
- Sugerencias desde la librería antes de guardar
- Calendario con días entrenados
- Cache local y sincronización posterior
- PWA instalable con actualización de versión

## Notas

- La librería es privada por usuario.
- El build usa `webpack` por estabilidad en este entorno.
- El service worker se regenera en cada build para evitar quedar pegado a una versión vieja.
