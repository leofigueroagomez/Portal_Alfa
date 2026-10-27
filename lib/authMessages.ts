// Mensajes de login y recuperacion que no revelan si una cuenta existe.
// Supabase distingue casos como "Email not confirmed"; mostrarlos tal cual
// permite enumerar usuarios. El detalle real queda en los logs de Auth.

type AuthErrorLike = { status?: number } | null | undefined;

export function getLoginErrorMessage(error: AuthErrorLike) {
  if (error?.status === 429) {
    return "Demasiados intentos. Espera unos minutos e intentalo de nuevo.";
  }

  if (!error?.status || error.status >= 500) {
    return "No se pudo iniciar sesion. Intentalo de nuevo en unos minutos.";
  }

  return "Correo o contrasena incorrectos.";
}

export const PASSWORD_RECOVERY_SENT_MESSAGE =
  "Si el correo esta registrado, te enviamos un enlace para restablecer tu contrasena.";

export function getPasswordRecoveryMessage(error: AuthErrorLike) {
  if (!error) {
    return PASSWORD_RECOVERY_SENT_MESSAGE;
  }

  if (error.status === 429) {
    return "Demasiados intentos. Espera unos minutos e intentalo de nuevo.";
  }

  if (!error.status || error.status >= 500) {
    return "No se pudo enviar el correo ahora. Intentalo de nuevo en unos minutos.";
  }

  return PASSWORD_RECOVERY_SENT_MESSAGE;
}
