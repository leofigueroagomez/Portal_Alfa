/**
 * Interruptor del Vigia. Apagado desde 2026-11-26 (Leo: consumia dinero y no
 * resulto como se esperaba). Para reactivarlo hay que poner VIGIA_ENABLED=1 en
 * Vercel, restaurar el cron en vercel.json y revisar los permisos de
 * sql/20261126_seguridad_y_apagado_vigia_rollback.sql.
 */
export const VIGIA_ENABLED = process.env.VIGIA_ENABLED === "1";

export const VIGIA_DISABLED_MESSAGE =
  "El Vigia esta desactivado (2026-11-26). No corre sensores, no envia correo y no llama a Claude.";
