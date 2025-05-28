# 🕐 Sistema de Cron Jobs para Renovación Automática de Tokens

## 📋 **Descripción General**

El sistema implementa cron jobs automáticos para mantener los tokens de usuarios actualizados y evitar interrupciones en el servicio.

## ⏰ **Horarios de Ejecución**

### 🔄 **Renovación Automática de Tokens**
- **Frecuencia:** Cada 30 minutos
- **Expresión Cron:** `CronExpression.EVERY_30_MINUTES`
- **Función:** `refreshExpiringTokens()`
- **Descripción:** Busca tokens que expiran en los próximos 45 minutos y los renueva automáticamente

### 🧹 **Limpieza de Tokens Expirados**
- **Frecuencia:** Diariamente a las 2:00 AM
- **Expresión Cron:** `'0 2 * * *'`
- **Función:** `cleanupExpiredTokens()`
- **Descripción:** Limpia tokens expirados hace más de 7 días

## 🔧 **Configuración por Plataforma**

### 📺 **YouTube/Google OAuth**
- **Duración real:** 1 hora
- **Renovación:** Automática usando refresh_token
- **API:** `https://oauth2.googleapis.com/token`
- **Parámetros:** `client_id`, `client_secret`, `refresh_token`, `grant_type`

### 📸 **Instagram**
- **Duración real:** 60 días (long-lived tokens)
- **Renovación:** Extensión de token existente
- **API:** `https://graph.instagram.com/refresh_access_token`
- **Parámetros:** `grant_type=ig_refresh_token`, `access_token`

### 🎵 **TikTok**
- **Duración Access Token:** 24 horas (86,400 segundos)
- **Duración Refresh Token:** 365 días (31,536,000 segundos)
- **Renovación:** ✅ **AUTOMÁTICA** usando refresh_token
- **API:** `https://open.tiktokapis.com/v2/oauth/token/`
- **Parámetros:** `client_key`, `client_secret`, `refresh_token`, `grant_type=refresh_token`
- **Nota:** Los refresh tokens de TikTok pueden cambiar en cada renovación

## 🛠️ **Endpoints Disponibles**

### 🔍 **Monitoreo y Estado**

```http
GET /auth/tokens/scheduler-status
```
Obtiene el estado actual del scheduler y tokens próximos a expirar.

### 🚀 **Ejecución Manual**

```http
POST /auth/tokens/trigger-scheduler
```
Fuerza la ejecución manual del proceso de renovación.

```http
POST /auth/tokens/force-refresh/:userId
```
Fuerza la renovación de todos los tokens de un usuario específico.

## 📊 **Logs y Monitoreo**

### 📝 **Tipos de Logs**
- `🔄 Iniciando proceso...` - Inicio de proceso
- `✅ Token renovado exitosamente` - Renovación exitosa
- `⚠️ Falló renovación de token` - Error en renovación
- `🎯 Proceso completado` - Resumen de resultados

### 🔍 **Búsqueda de Logs**
```bash
# Ver logs del scheduler
grep "TokenSchedulerService" logs/application.log

# Ver solo tokens renovados exitosamente
grep "Token renovado exitosamente" logs/application.log

# Ver errores de renovación
grep "Falló renovación" logs/application.log
```

## ⚙️ **Configuración de Variables de Entorno**

```env
# YouTube/Google OAuth
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# Instagram
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# TikTok
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
```

## 🚨 **Manejo de Errores**

### ✅ **Casos de Éxito**
- Token renovado y guardado en base de datos
- Nueva fecha de expiración calculada
- Log de confirmación generado

### ❌ **Casos de Error**
- **HTTP 401/403:** Token inválido o expirado
- **HTTP 400:** Parámetros incorrectos
- **Network Error:** Problemas de conectividad
- **Database Error:** Error al guardar en BD

### 🔄 **Retry Logic**
- Los tokens fallidos se intentarán renovar en la siguiente ejecución (30 min)
- Después de 3 fallos consecutivos, se marca para atención manual

## 📈 **Mejores Prácticas**

### 🎯 **Configuración Recomendada**
1. **Monitoring:** Configurar alertas para fallos de renovación
2. **Backup:** Mantener logs de al menos 30 días
3. **Testing:** Ejecutar manualmente antes de implementar
4. **Notification:** Notificar a usuarios sobre tokens que requieren re-autorización

### 🔍 **Debugging**
1. Verificar variables de entorno
2. Revisar conectividad a APIs externas
3. Validar estructura de base de datos
4. Confirmar permisos y scopes de OAuth

## 🚀 **Comandos Útiles**

```bash
# Ejecutar renovación manual
curl -X POST http://localhost:3000/auth/tokens/trigger-scheduler

# Ver estado del scheduler
curl -X GET http://localhost:3000/auth/tokens/scheduler-status

# Forzar renovación de usuario específico
curl -X POST http://localhost:3000/auth/tokens/force-refresh/USER_ID
```

## 📋 **Checklist de Implementación**

- [x] Instalar `@nestjs/schedule`
- [x] Crear `TokenSchedulerService`
- [x] Configurar horarios de cron jobs
- [x] Implementar renovación por plataforma
- [x] Agregar endpoints de administración
- [x] Configurar logging
- [x] Actualizar módulos
- [ ] Configurar alertas de monitoreo
- [ ] Documentar procedimientos de emergencia 